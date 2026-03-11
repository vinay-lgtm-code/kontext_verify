"""Unit tests for the synchronous Kontext client."""

import json

import httpx
import pytest
from pytest_httpx import HTTPXMock

from kontext import (
    ActionResult,
    AnomalyResult,
    AuditExport,
    AuthError,
    ConflictError,
    HealthResponse,
    Kontext,
    KontextError,
    NotFoundError,
    RateLimitError,
    Task,
    TrustScore,
    UsageInfo,
)


class TestHealth:
    def test_health_check(self, client: Kontext, httpx_mock: HTTPXMock, base_url: str):
        httpx_mock.add_response(
            url=f"{base_url}/health",
            json={"status": "ok", "timestamp": "2026-03-11T00:00:00Z"},
        )
        result = client.health()
        assert isinstance(result, HealthResponse)
        assert result.status == "ok"


class TestActionLogging:
    def test_log_buffers_actions(self, client: Kontext):
        client.log(action="test", agent_id="agent-1")
        assert len(client._buffer) == 1
        assert client._buffer[0]["type"] == "test"
        assert client._buffer[0]["agentId"] == "agent-1"

    def test_log_auto_flushes_at_batch_size(self, httpx_mock: HTTPXMock, base_url: str):
        httpx_mock.add_response(
            url=f"{base_url}/v1/actions",
            json={"success": True, "received": 5, "timestamp": "2026-03-11T00:00:00Z"},
        )
        ctx = Kontext(api_key="sk_test", project_id="proj", base_url=base_url, batch_size=5)
        for i in range(5):
            ctx.log(action=f"action-{i}", agent_id="agent-1")
        # Buffer should be empty after auto-flush
        assert len(ctx._buffer) == 0
        ctx.close()

    def test_log_transaction(self, client: Kontext):
        client.log_transaction(
            tx_hash="0xabc",
            chain="base",
            amount="5000",
            token="USDC",
            from_address="0xsender",
            to_address="0xrecipient",
            agent_id="agent-1",
        )
        assert len(client._buffer) == 1
        entry = client._buffer[0]
        assert entry["txHash"] == "0xabc"
        assert entry["chain"] == "base"
        assert entry["amount"] == "5000"
        assert entry["from"] == "0xsender"
        assert entry["to"] == "0xrecipient"

    def test_flush_sends_actions(self, client: Kontext, httpx_mock: HTTPXMock, base_url: str):
        httpx_mock.add_response(
            url=f"{base_url}/v1/actions",
            json={"success": True, "received": 2, "timestamp": "2026-03-11T00:00:00Z"},
        )
        client.log(action="a1", agent_id="agent-1")
        client.log(action="a2", agent_id="agent-1")
        result = client.flush()
        assert isinstance(result, ActionResult)
        assert result.success is True
        assert result.received == 2
        assert len(client._buffer) == 0

    def test_flush_empty_buffer_returns_none(self, client: Kontext):
        result = client.flush()
        assert result is None

    def test_flush_with_limit_exceeded(self, client: Kontext, httpx_mock: HTTPXMock, base_url: str):
        httpx_mock.add_response(
            url=f"{base_url}/v1/actions",
            json={
                "success": True,
                "received": 1,
                "timestamp": "2026-03-11T00:00:00Z",
                "limitExceeded": True,
                "message": "You've reached the limit",
                "usage": {"plan": "free", "eventCount": 20001, "limit": 20000},
            },
            status_code=429,
            headers={"Retry-After": "60"},
        )
        client.log(action="a1", agent_id="agent-1")
        with pytest.raises(RateLimitError) as exc_info:
            client.flush()
        assert exc_info.value.retry_after == 60


class TestTasks:
    def test_create_task(self, client: Kontext, httpx_mock: HTTPXMock, base_url: str):
        httpx_mock.add_response(
            url=f"{base_url}/v1/tasks",
            json={
                "success": True,
                "task": {
                    "id": "task-1",
                    "projectId": "proj",
                    "description": "Approve transfer",
                    "agentId": "agent-1",
                    "status": "pending",
                    "requiredEvidence": ["txHash"],
                    "providedEvidence": None,
                    "correlationId": "corr-1",
                    "createdAt": "2026-03-11T00:00:00Z",
                    "updatedAt": "2026-03-11T00:00:00Z",
                    "confirmedAt": None,
                    "expiresAt": "2026-03-12T00:00:00Z",
                    "metadata": {},
                },
            },
            status_code=201,
        )
        task = client.create_task(
            description="Approve transfer",
            agent_id="agent-1",
            required_evidence=["txHash"],
        )
        assert isinstance(task, Task)
        assert task.id == "task-1"
        assert task.status == "pending"

    def test_get_task(self, client: Kontext, httpx_mock: HTTPXMock, base_url: str):
        httpx_mock.add_response(
            url=f"{base_url}/v1/tasks/task-1",
            json={
                "task": {
                    "id": "task-1",
                    "projectId": "proj",
                    "description": "Approve",
                    "agentId": "agent-1",
                    "status": "pending",
                    "requiredEvidence": ["txHash"],
                    "metadata": {},
                },
            },
        )
        task = client.get_task("task-1")
        assert task.id == "task-1"

    def test_get_task_not_found(self, client: Kontext, httpx_mock: HTTPXMock, base_url: str):
        httpx_mock.add_response(
            url=f"{base_url}/v1/tasks/missing",
            json={"error": "Task not found"},
            status_code=404,
        )
        with pytest.raises(NotFoundError):
            client.get_task("missing")

    def test_confirm_task(self, client: Kontext, httpx_mock: HTTPXMock, base_url: str):
        httpx_mock.add_response(
            url=f"{base_url}/v1/tasks/task-1/confirm",
            json={
                "success": True,
                "task": {
                    "id": "task-1",
                    "projectId": "proj",
                    "description": "Approve",
                    "agentId": "agent-1",
                    "status": "confirmed",
                    "requiredEvidence": ["txHash"],
                    "providedEvidence": {"txHash": "0xabc"},
                    "confirmedAt": "2026-03-11T01:00:00Z",
                    "metadata": {},
                },
            },
        )
        task = client.confirm_task("task-1", evidence={"txHash": "0xabc"})
        assert task.status == "confirmed"
        assert task.provided_evidence == {"txHash": "0xabc"}

    def test_confirm_task_conflict(self, client: Kontext, httpx_mock: HTTPXMock, base_url: str):
        httpx_mock.add_response(
            url=f"{base_url}/v1/tasks/task-1/confirm",
            json={"error": "Task already confirmed"},
            status_code=409,
        )
        with pytest.raises(ConflictError):
            client.confirm_task("task-1", evidence={"txHash": "0x..."})


class TestTrust:
    def test_get_trust_score(self, client: Kontext, httpx_mock: HTTPXMock, base_url: str):
        httpx_mock.add_response(
            url=f"{base_url}/v1/trust/agent-1",
            json={
                "agentId": "agent-1",
                "score": 87,
                "level": "high",
                "factors": [
                    {"name": "history_depth", "score": 95, "weight": 0.3, "description": "45 actions"},
                ],
                "computedAt": "2026-03-11T00:00:00Z",
            },
        )
        trust = client.get_trust_score("agent-1")
        assert isinstance(trust, TrustScore)
        assert trust.score == 87
        assert trust.level == "high"
        assert len(trust.factors) == 1


class TestAudit:
    def test_export_json(self, client: Kontext, httpx_mock: HTTPXMock, base_url: str):
        httpx_mock.add_response(
            url=httpx.URL(f"{base_url}/v1/audit/export", params={"format": "json"}),
            json={
                "exportedAt": "2026-03-11T00:00:00Z",
                "projectId": "proj",
                "actions": [{"id": "a1", "type": "test"}],
                "tasks": [],
                "anomalies": [],
            },
        )
        result = client.export_audit(format="json")
        assert isinstance(result, AuditExport)
        assert len(result.actions) == 1

    def test_export_csv(self, client: Kontext, httpx_mock: HTTPXMock, base_url: str):
        httpx_mock.add_response(
            url=httpx.URL(f"{base_url}/v1/audit/export", params={"format": "csv"}),
            text="id,type,agentId\na1,test,agent-1\n",
            headers={"Content-Type": "text/csv"},
        )
        result = client.export_audit(format="csv")
        assert isinstance(result, str)
        assert "a1" in result


class TestUsage:
    def test_get_usage(self, client: Kontext, httpx_mock: HTTPXMock, base_url: str):
        httpx_mock.add_response(
            url=f"{base_url}/v1/usage",
            json={
                "plan": "free",
                "eventCount": 5000,
                "limit": 20000,
                "remainingEvents": 15000,
                "usagePercentage": 25.0,
                "limitExceeded": False,
                "timestamp": "2026-03-11T00:00:00Z",
            },
        )
        usage = client.get_usage()
        assert isinstance(usage, UsageInfo)
        assert usage.plan == "free"
        assert usage.event_count == 5000
        assert usage.remaining_events == 15000


class TestAnomalies:
    def test_evaluate_anomalies(self, client: Kontext, httpx_mock: HTTPXMock, base_url: str):
        httpx_mock.add_response(
            url=f"{base_url}/v1/anomalies/evaluate",
            json={
                "evaluated": True,
                "anomalyCount": 1,
                "anomalies": [
                    {
                        "id": "anom-1",
                        "type": "unusualAmount",
                        "severity": "medium",
                        "description": "Amount exceeds threshold",
                        "agentId": "agent-1",
                        "reviewed": False,
                    },
                ],
                "timestamp": "2026-03-11T00:00:00Z",
            },
        )
        result = client.evaluate_anomalies(amount=25000, agent_id="agent-1", chain="base")
        assert isinstance(result, AnomalyResult)
        assert result.anomaly_count == 1
        assert result.anomalies[0].type == "unusualAmount"


class TestErrorHandling:
    def test_auth_error(self, client: Kontext, httpx_mock: HTTPXMock, base_url: str):
        httpx_mock.add_response(
            url=f"{base_url}/health",
            json={"error": "Unauthorized"},
            status_code=401,
        )
        with pytest.raises(AuthError):
            client.health()

    def test_generic_server_error(self, client: Kontext, httpx_mock: HTTPXMock, base_url: str):
        httpx_mock.add_response(
            url=f"{base_url}/health",
            json={"error": "Internal server error"},
            status_code=500,
        )
        with pytest.raises(KontextError) as exc_info:
            client.health()
        assert exc_info.value.status_code == 500


class TestContextManager:
    def test_context_manager_auto_flushes(self, httpx_mock: HTTPXMock, base_url: str):
        httpx_mock.add_response(
            url=f"{base_url}/v1/actions",
            json={"success": True, "received": 1, "timestamp": "2026-03-11T00:00:00Z"},
        )
        with Kontext(api_key="sk_test", project_id="proj", base_url=base_url) as ctx:
            ctx.log(action="test", agent_id="agent-1")
        # Verify the flush happened (request was made)
        assert len(httpx_mock.get_requests()) == 1

    def test_context_manager_no_flush_if_empty(self, base_url: str):
        with Kontext(api_key="sk_test", project_id="proj", base_url=base_url) as ctx:
            pass
        # No requests should be made
