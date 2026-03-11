"""Pydantic response models for the Kontext API."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict


class HealthResponse(BaseModel):
    status: str
    timestamp: str


class ActionResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    success: bool
    received: int
    timestamp: str
    limit_exceeded: bool = False
    message: str | None = None
    usage: dict[str, Any] | None = None


class Task(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    project_id: str | None = None
    description: str
    agent_id: str | None = None
    status: str
    required_evidence: list[str] = []
    provided_evidence: dict[str, Any] | None = None
    correlation_id: str | None = None
    created_at: str | None = None
    updated_at: str | None = None
    confirmed_at: str | None = None
    expires_at: str | None = None
    metadata: dict[str, Any] = {}


class TaskResponse(BaseModel):
    success: bool = True
    task: Task


class TrustFactor(BaseModel):
    name: str
    score: float
    weight: float
    description: str


class TrustScore(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    agent_id: str | None = None
    score: float
    level: str
    factors: list[TrustFactor] = []
    computed_at: str | None = None


class AuditExport(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    exported_at: str | None = None
    project_id: str | None = None
    actions: list[dict[str, Any]] = []
    tasks: list[dict[str, Any]] = []
    anomalies: list[dict[str, Any]] = []


class UsageInfo(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    plan: str
    event_count: int = 0
    limit: int = 20000
    remaining_events: int = 20000
    usage_percentage: float = 0.0
    limit_exceeded: bool = False
    timestamp: str | None = None


class Anomaly(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    type: str
    severity: str
    description: str
    agent_id: str | None = None
    action_id: str | None = None
    detected_at: str | None = None
    data: dict[str, Any] = {}
    reviewed: bool = False


class AnomalyResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    evaluated: bool
    anomaly_count: int = 0
    anomalies: list[Anomaly] = []
    timestamp: str | None = None
