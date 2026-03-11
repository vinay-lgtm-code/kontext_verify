"""Unit tests for the asynchronous Kontext client."""

import pytest
from pytest_httpx import HTTPXMock

from kontext import (
    ActionResult,
    AsyncKontext,
    HealthResponse,
    Task,
    TrustScore,
    UsageInfo,
)


class TestAsyncHealth:
    async def test_health_check(self, async_client: AsyncKontext, httpx_mock: HTTPXMock, base_url: str):
        httpx_mock.add_response(
            url=f"{base_url}/health",
            json={"status": "ok", "timestamp": "2026-03-11T00:00:00Z"},
        )
        result = await async_client.health()
        assert isinstance(result, HealthResponse)
        assert result.status == "ok"
        await async_client.close()


class TestAsyncLogging:
    async def test_log_and_flush(self, async_client: AsyncKontext, httpx_mock: HTTPXMock, base_url: str):
        httpx_mock.add_response(
            url=f"{base_url}/v1/actions",
            json={"success": True, "received": 1, "timestamp": "2026-03-11T00:00:00Z"},
        )
        await async_client.log(action="test", agent_id="agent-1")
        result = await async_client.flush()
        assert isinstance(result, ActionResult)
        assert result.received == 1
        await async_client.close()

    async def test_log_transaction(self, async_client: AsyncKontext, httpx_mock: HTTPXMock, base_url: str):
        httpx_mock.add_response(
            url=f"{base_url}/v1/actions",
            json={"success": True, "received": 1, "timestamp": "2026-03-11T00:00:00Z"},
        )
        await async_client.log_transaction(
            tx_hash="0xabc",
            chain="base",
            amount="5000",
            token="USDC",
            from_address="0xsender",
            to_address="0xrecipient",
            agent_id="agent-1",
        )
        result = await async_client.flush()
        assert result is not None
        assert result.received == 1
        await async_client.close()


class TestAsyncTasks:
    async def test_create_and_get_task(self, async_client: AsyncKontext, httpx_mock: HTTPXMock, base_url: str):
        httpx_mock.add_response(
            url=f"{base_url}/v1/tasks",
            json={
                "success": True,
                "task": {
                    "id": "task-1",
                    "description": "Approve",
                    "agentId": "agent-1",
                    "status": "pending",
                    "requiredEvidence": ["txHash"],
                    "metadata": {},
                },
            },
            status_code=201,
        )
        task = await async_client.create_task(
            description="Approve",
            agent_id="agent-1",
            required_evidence=["txHash"],
        )
        assert isinstance(task, Task)
        assert task.status == "pending"
        await async_client.close()


class TestAsyncTrust:
    async def test_get_trust_score(self, async_client: AsyncKontext, httpx_mock: HTTPXMock, base_url: str):
        httpx_mock.add_response(
            url=f"{base_url}/v1/trust/agent-1",
            json={
                "agentId": "agent-1",
                "score": 92,
                "level": "high",
                "factors": [],
                "computedAt": "2026-03-11T00:00:00Z",
            },
        )
        trust = await async_client.get_trust_score("agent-1")
        assert isinstance(trust, TrustScore)
        assert trust.score == 92
        await async_client.close()


class TestAsyncUsage:
    async def test_get_usage(self, async_client: AsyncKontext, httpx_mock: HTTPXMock, base_url: str):
        httpx_mock.add_response(
            url=f"{base_url}/v1/usage",
            json={
                "plan": "free",
                "eventCount": 1000,
                "limit": 20000,
                "remainingEvents": 19000,
                "usagePercentage": 5.0,
                "limitExceeded": False,
                "timestamp": "2026-03-11T00:00:00Z",
            },
        )
        usage = await async_client.get_usage()
        assert isinstance(usage, UsageInfo)
        assert usage.plan == "free"
        await async_client.close()


class TestAsyncContextManager:
    async def test_async_context_manager(self, httpx_mock: HTTPXMock, base_url: str):
        httpx_mock.add_response(
            url=f"{base_url}/v1/actions",
            json={"success": True, "received": 1, "timestamp": "2026-03-11T00:00:00Z"},
        )
        async with AsyncKontext(api_key="sk_test", project_id="proj", base_url=base_url) as ctx:
            await ctx.log(action="test", agent_id="agent-1")
        assert len(httpx_mock.get_requests()) == 1
