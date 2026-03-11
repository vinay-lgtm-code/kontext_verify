"""Kontext — Proof of compliance Python client for agentic payments."""

from .client import AsyncKontext, Kontext
from .exceptions import AuthError, ConflictError, KontextError, NotFoundError, RateLimitError
from .models import (
    ActionResult,
    AnomalyResult,
    AuditExport,
    HealthResponse,
    Task,
    TrustScore,
    UsageInfo,
)

__version__ = "0.8.0"
__all__ = [
    "Kontext",
    "AsyncKontext",
    "KontextError",
    "AuthError",
    "RateLimitError",
    "NotFoundError",
    "ConflictError",
    "ActionResult",
    "AnomalyResult",
    "AuditExport",
    "HealthResponse",
    "Task",
    "TrustScore",
    "UsageInfo",
]
