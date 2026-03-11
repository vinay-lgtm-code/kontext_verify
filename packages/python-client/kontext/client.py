"""Kontext Python client — thin HTTP wrapper around the Kontext REST API."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

import httpx

from .exceptions import AuthError, ConflictError, KontextError, NotFoundError, RateLimitError
from .models import (
    ActionResult,
    AnomalyResult,
    AuditExport,
    HealthResponse,
    Task,
    TaskResponse,
    TrustScore,
    UsageInfo,
)

DEFAULT_BASE_URL = "https://api.getkontext.com"
DEFAULT_BATCH_SIZE = 50
DEFAULT_TIMEOUT = 30.0


def _handle_error(response: httpx.Response) -> None:
    """Raise typed exceptions based on HTTP status codes."""
    if response.is_success:
        return
    try:
        body = response.json()
        message = body.get("error", response.text)
    except Exception:
        message = response.text

    if response.status_code == 401:
        raise AuthError(message)
    if response.status_code == 404:
        raise NotFoundError(message)
    if response.status_code == 409:
        raise ConflictError(message)
    if response.status_code == 429:
        retry_after = response.headers.get("Retry-After")
        raise RateLimitError(message, retry_after=int(retry_after) if retry_after else None)
    raise KontextError(message, status_code=response.status_code)


def _camel_to_snake(data: dict[str, Any]) -> dict[str, Any]:
    """Convert camelCase keys to snake_case (single level)."""
    import re

    def convert(key: str) -> str:
        return re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", key).lower()

    return {convert(k): v for k, v in data.items()}


class Kontext:
    """Synchronous Kontext API client.

    Usage:
        ctx = Kontext(api_key="sk_...", project_id="my-project")
        ctx.log(action="transfer", agent_id="agent-1")
        ctx.flush()

    Or as a context manager:
        with Kontext(api_key="sk_...", project_id="my-project") as ctx:
            ctx.log(action="transfer", agent_id="agent-1")
        # auto-flushes on exit
    """

    def __init__(
        self,
        api_key: str,
        project_id: str,
        base_url: str = DEFAULT_BASE_URL,
        batch_size: int = DEFAULT_BATCH_SIZE,
        timeout: float = DEFAULT_TIMEOUT,
    ):
        self._api_key = api_key
        self._project_id = project_id
        self._base_url = base_url.rstrip("/")
        self._batch_size = batch_size
        self._buffer: list[dict[str, Any]] = []
        self._client = httpx.Client(
            base_url=self._base_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "X-Project-Id": project_id,
                "Content-Type": "application/json",
            },
            timeout=timeout,
        )

    def __enter__(self) -> Kontext:
        return self

    def __exit__(self, *args: Any) -> None:
        self.flush()
        self._client.close()

    def close(self) -> None:
        """Close the HTTP client."""
        self._client.close()

    # --- Health ---

    def health(self) -> HealthResponse:
        """Check API server health (no auth required)."""
        resp = self._client.get("/health")
        _handle_error(resp)
        return HealthResponse(**resp.json())

    # --- Action Logging ---

    def log(
        self,
        action: str,
        agent_id: str,
        details: str = "",
        metadata: dict[str, Any] | None = None,
        **kwargs: Any,
    ) -> None:
        """Buffer an action log. Auto-flushes when batch_size is reached."""
        entry: dict[str, Any] = {
            "id": str(uuid.uuid4()),
            "type": action,
            "agentId": agent_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "description": details,
            "metadata": metadata or {},
            **kwargs,
        }
        self._buffer.append(entry)
        if len(self._buffer) >= self._batch_size:
            self.flush()

    def log_transaction(
        self,
        tx_hash: str,
        chain: str,
        amount: str,
        token: str,
        from_address: str,
        to_address: str,
        agent_id: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """Buffer a transaction log entry."""
        self.log(
            action="transaction",
            agent_id=agent_id,
            details=f"{amount} {token} on {chain}",
            metadata=metadata,
            txHash=tx_hash,
            chain=chain,
            amount=amount,
            token=token,
            **{"from": from_address},
            to=to_address,
        )

    def flush(self) -> ActionResult | None:
        """Send all buffered actions to the server."""
        if not self._buffer:
            return None
        actions = self._buffer.copy()
        self._buffer.clear()
        resp = self._client.post("/v1/actions", json={"actions": actions})
        _handle_error(resp)
        data = _camel_to_snake(resp.json())
        return ActionResult(**data)

    # --- Tasks ---

    def create_task(
        self,
        description: str,
        agent_id: str,
        required_evidence: list[str],
        metadata: dict[str, Any] | None = None,
        expires_in_ms: int | None = None,
    ) -> Task:
        """Create a human-in-the-loop task."""
        body: dict[str, Any] = {
            "description": description,
            "agentId": agent_id,
            "requiredEvidence": required_evidence,
        }
        if metadata:
            body["metadata"] = metadata
        if expires_in_ms is not None:
            body["expiresInMs"] = expires_in_ms
        resp = self._client.post("/v1/tasks", json=body)
        _handle_error(resp)
        task_data = resp.json().get("task", resp.json())
        return Task(**_camel_to_snake(task_data))

    def get_task(self, task_id: str) -> Task:
        """Retrieve a task by ID."""
        resp = self._client.get(f"/v1/tasks/{task_id}")
        _handle_error(resp)
        task_data = resp.json().get("task", resp.json())
        return Task(**_camel_to_snake(task_data))

    def confirm_task(self, task_id: str, evidence: dict[str, Any]) -> Task:
        """Confirm a task with evidence."""
        resp = self._client.put(f"/v1/tasks/{task_id}/confirm", json={"evidence": evidence})
        _handle_error(resp)
        task_data = resp.json().get("task", resp.json())
        return Task(**_camel_to_snake(task_data))

    # --- Trust ---

    def get_trust_score(self, agent_id: str) -> TrustScore:
        """Get trust score for an agent."""
        resp = self._client.get(f"/v1/trust/{agent_id}")
        _handle_error(resp)
        return TrustScore(**_camel_to_snake(resp.json()))

    # --- Audit ---

    def export_audit(
        self,
        format: str = "json",
        start_date: str | None = None,
        end_date: str | None = None,
        agent_id: str | None = None,
    ) -> AuditExport | str:
        """Export audit trail. Returns AuditExport for JSON, raw string for CSV."""
        params: dict[str, str] = {"format": format}
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date
        if agent_id:
            params["agentId"] = agent_id
        resp = self._client.get("/v1/audit/export", params=params)
        _handle_error(resp)
        if format == "csv":
            return resp.text
        return AuditExport(**_camel_to_snake(resp.json()))

    # --- Usage ---

    def get_usage(self) -> UsageInfo:
        """Get current usage and plan limits."""
        resp = self._client.get("/v1/usage")
        _handle_error(resp)
        return UsageInfo(**_camel_to_snake(resp.json()))

    # --- Anomalies ---

    def evaluate_anomalies(
        self,
        amount: float,
        agent_id: str,
        tx_hash: str | None = None,
        chain: str | None = None,
        token: str | None = None,
        from_address: str | None = None,
        to_address: str | None = None,
    ) -> AnomalyResult:
        """Evaluate a transaction for anomalies."""
        body: dict[str, Any] = {"amount": amount, "agentId": agent_id}
        if tx_hash:
            body["txHash"] = tx_hash
        if chain:
            body["chain"] = chain
        if token:
            body["token"] = token
        if from_address:
            body["from"] = from_address
        if to_address:
            body["to"] = to_address
        resp = self._client.post("/v1/anomalies/evaluate", json=body)
        _handle_error(resp)
        return AnomalyResult(**_camel_to_snake(resp.json()))


class AsyncKontext:
    """Asynchronous Kontext API client.

    Usage:
        async with AsyncKontext(api_key="sk_...", project_id="my-project") as ctx:
            await ctx.log(action="transfer", agent_id="agent-1")
            await ctx.flush()
    """

    def __init__(
        self,
        api_key: str,
        project_id: str,
        base_url: str = DEFAULT_BASE_URL,
        batch_size: int = DEFAULT_BATCH_SIZE,
        timeout: float = DEFAULT_TIMEOUT,
    ):
        self._api_key = api_key
        self._project_id = project_id
        self._base_url = base_url.rstrip("/")
        self._batch_size = batch_size
        self._buffer: list[dict[str, Any]] = []
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "X-Project-Id": project_id,
                "Content-Type": "application/json",
            },
            timeout=timeout,
        )

    async def __aenter__(self) -> AsyncKontext:
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self.flush()
        await self._client.aclose()

    async def close(self) -> None:
        await self._client.aclose()

    # --- Health ---

    async def health(self) -> HealthResponse:
        resp = await self._client.get("/health")
        _handle_error(resp)
        return HealthResponse(**resp.json())

    # --- Action Logging ---

    async def log(
        self,
        action: str,
        agent_id: str,
        details: str = "",
        metadata: dict[str, Any] | None = None,
        **kwargs: Any,
    ) -> None:
        entry: dict[str, Any] = {
            "id": str(uuid.uuid4()),
            "type": action,
            "agentId": agent_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "description": details,
            "metadata": metadata or {},
            **kwargs,
        }
        self._buffer.append(entry)
        if len(self._buffer) >= self._batch_size:
            await self.flush()

    async def log_transaction(
        self,
        tx_hash: str,
        chain: str,
        amount: str,
        token: str,
        from_address: str,
        to_address: str,
        agent_id: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        await self.log(
            action="transaction",
            agent_id=agent_id,
            details=f"{amount} {token} on {chain}",
            metadata=metadata,
            txHash=tx_hash,
            chain=chain,
            amount=amount,
            token=token,
            **{"from": from_address},
            to=to_address,
        )

    async def flush(self) -> ActionResult | None:
        if not self._buffer:
            return None
        actions = self._buffer.copy()
        self._buffer.clear()
        resp = await self._client.post("/v1/actions", json={"actions": actions})
        _handle_error(resp)
        return ActionResult(**_camel_to_snake(resp.json()))

    # --- Tasks ---

    async def create_task(
        self,
        description: str,
        agent_id: str,
        required_evidence: list[str],
        metadata: dict[str, Any] | None = None,
        expires_in_ms: int | None = None,
    ) -> Task:
        body: dict[str, Any] = {
            "description": description,
            "agentId": agent_id,
            "requiredEvidence": required_evidence,
        }
        if metadata:
            body["metadata"] = metadata
        if expires_in_ms is not None:
            body["expiresInMs"] = expires_in_ms
        resp = await self._client.post("/v1/tasks", json=body)
        _handle_error(resp)
        task_data = resp.json().get("task", resp.json())
        return Task(**_camel_to_snake(task_data))

    async def get_task(self, task_id: str) -> Task:
        resp = await self._client.get(f"/v1/tasks/{task_id}")
        _handle_error(resp)
        task_data = resp.json().get("task", resp.json())
        return Task(**_camel_to_snake(task_data))

    async def confirm_task(self, task_id: str, evidence: dict[str, Any]) -> Task:
        resp = await self._client.put(f"/v1/tasks/{task_id}/confirm", json={"evidence": evidence})
        _handle_error(resp)
        task_data = resp.json().get("task", resp.json())
        return Task(**_camel_to_snake(task_data))

    # --- Trust ---

    async def get_trust_score(self, agent_id: str) -> TrustScore:
        resp = await self._client.get(f"/v1/trust/{agent_id}")
        _handle_error(resp)
        return TrustScore(**_camel_to_snake(resp.json()))

    # --- Audit ---

    async def export_audit(
        self,
        format: str = "json",
        start_date: str | None = None,
        end_date: str | None = None,
        agent_id: str | None = None,
    ) -> AuditExport | str:
        params: dict[str, str] = {"format": format}
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date
        if agent_id:
            params["agentId"] = agent_id
        resp = await self._client.get("/v1/audit/export", params=params)
        _handle_error(resp)
        if format == "csv":
            return resp.text
        return AuditExport(**_camel_to_snake(resp.json()))

    # --- Usage ---

    async def get_usage(self) -> UsageInfo:
        resp = await self._client.get("/v1/usage")
        _handle_error(resp)
        return UsageInfo(**_camel_to_snake(resp.json()))

    # --- Anomalies ---

    async def evaluate_anomalies(
        self,
        amount: float,
        agent_id: str,
        tx_hash: str | None = None,
        chain: str | None = None,
        token: str | None = None,
        from_address: str | None = None,
        to_address: str | None = None,
    ) -> AnomalyResult:
        body: dict[str, Any] = {"amount": amount, "agentId": agent_id}
        if tx_hash:
            body["txHash"] = tx_hash
        if chain:
            body["chain"] = chain
        if token:
            body["token"] = token
        if from_address:
            body["from"] = from_address
        if to_address:
            body["to"] = to_address
        resp = await self._client.post("/v1/anomalies/evaluate", json=body)
        _handle_error(resp)
        return AnomalyResult(**_camel_to_snake(resp.json()))
