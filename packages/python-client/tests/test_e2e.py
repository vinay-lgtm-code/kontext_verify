"""E2E tests against a running Kontext server.

Run with: KONTEXT_API_KEY=sk_test KONTEXT_BASE_URL=http://localhost:8080 pytest tests/test_e2e.py -v

Requires a running Kontext server. Skipped if KONTEXT_API_KEY is not set.
"""

import os

import pytest

from kontext import AsyncKontext, Kontext

API_KEY = os.environ.get("KONTEXT_API_KEY", "")
BASE_URL = os.environ.get("KONTEXT_BASE_URL", "http://localhost:8080")
PROJECT_ID = os.environ.get("KONTEXT_PROJECT_ID", "e2e-test")

skip_if_no_server = pytest.mark.skipif(
    not API_KEY,
    reason="KONTEXT_API_KEY not set — skipping E2E tests",
)


@skip_if_no_server
class TestE2ESync:
    @pytest.fixture
    def ctx(self):
        client = Kontext(api_key=API_KEY, project_id=PROJECT_ID, base_url=BASE_URL)
        yield client
        client.close()

    def test_health(self, ctx: Kontext):
        result = ctx.health()
        assert result.status == "ok"

    def test_log_and_flush(self, ctx: Kontext):
        ctx.log(action="e2e_test", agent_id="test-agent", details="E2E test action")
        result = ctx.flush()
        assert result is not None
        assert result.success is True
        assert result.received == 1

    def test_log_transaction_and_flush(self, ctx: Kontext):
        ctx.log_transaction(
            tx_hash="0xe2e_test_hash",
            chain="base",
            amount="1000",
            token="USDC",
            from_address="0xsender",
            to_address="0xrecipient",
            agent_id="test-agent",
        )
        result = ctx.flush()
        assert result is not None
        assert result.success is True

    def test_trust_score(self, ctx: Kontext):
        trust = ctx.get_trust_score("test-agent")
        assert 0 <= trust.score <= 100
        assert trust.level in ("high", "medium", "low", "verified", "untrusted")

    def test_create_and_get_task(self, ctx: Kontext):
        task = ctx.create_task(
            description="E2E test task",
            agent_id="test-agent",
            required_evidence=["txHash"],
        )
        assert task.status == "pending"

        fetched = ctx.get_task(task.id)
        assert fetched.id == task.id
        assert fetched.status == "pending"

    def test_create_confirm_task(self, ctx: Kontext):
        task = ctx.create_task(
            description="E2E confirm test",
            agent_id="test-agent",
            required_evidence=["txHash"],
        )
        confirmed = ctx.confirm_task(task.id, evidence={"txHash": "0xconfirmed"})
        assert confirmed.status == "confirmed"

    def test_export_audit_json(self, ctx: Kontext):
        result = ctx.export_audit(format="json")
        assert hasattr(result, "actions")

    def test_usage(self, ctx: Kontext):
        usage = ctx.get_usage()
        assert usage.plan in ("free", "pro", "enterprise")
        assert usage.limit > 0

    def test_evaluate_anomalies(self, ctx: Kontext):
        result = ctx.evaluate_anomalies(
            amount=25000,
            agent_id="test-agent",
            chain="base",
            token="USDC",
        )
        assert result.evaluated is True

    def test_full_workflow(self, ctx: Kontext):
        """Full round-trip: log → flush → trust → task → confirm → audit."""
        # Log a transaction
        ctx.log_transaction(
            tx_hash="0xworkflow_test",
            chain="base",
            amount="5000",
            token="USDC",
            from_address="0xsender",
            to_address="0xrecipient",
            agent_id="workflow-agent",
        )
        flush_result = ctx.flush()
        assert flush_result is not None and flush_result.success

        # Check trust
        trust = ctx.get_trust_score("workflow-agent")
        assert trust.score >= 0

        # Create and confirm task
        task = ctx.create_task(
            description="Approve workflow transfer",
            agent_id="workflow-agent",
            required_evidence=["txHash"],
        )
        confirmed = ctx.confirm_task(task.id, evidence={"txHash": "0xworkflow_test"})
        assert confirmed.status == "confirmed"

        # Export audit
        audit = ctx.export_audit(format="json")
        assert hasattr(audit, "actions")


@skip_if_no_server
class TestE2EAsync:
    @pytest.fixture
    def ctx(self):
        return AsyncKontext(api_key=API_KEY, project_id=PROJECT_ID, base_url=BASE_URL)

    async def test_async_health(self, ctx: AsyncKontext):
        result = await ctx.health()
        assert result.status == "ok"
        await ctx.close()

    async def test_async_log_flush(self, ctx: AsyncKontext):
        await ctx.log(action="async_e2e", agent_id="async-agent")
        result = await ctx.flush()
        assert result is not None and result.success
        await ctx.close()

    async def test_async_context_manager(self):
        async with AsyncKontext(api_key=API_KEY, project_id=PROJECT_ID, base_url=BASE_URL) as ctx:
            await ctx.log(action="ctx_manager_test", agent_id="async-agent")
