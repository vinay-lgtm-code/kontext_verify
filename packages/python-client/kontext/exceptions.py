"""Kontext client exceptions."""


class KontextError(Exception):
    """Base exception for Kontext client errors."""

    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


class AuthError(KontextError):
    """Raised when authentication fails (401)."""

    def __init__(self, message: str = "Invalid or missing API key"):
        super().__init__(message, status_code=401)


class RateLimitError(KontextError):
    """Raised when rate limit is exceeded (429)."""

    def __init__(self, message: str = "Rate limit exceeded", retry_after: int | None = None):
        super().__init__(message, status_code=429)
        self.retry_after = retry_after


class NotFoundError(KontextError):
    """Raised when a resource is not found (404)."""

    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status_code=404)


class ConflictError(KontextError):
    """Raised on conflict (409), e.g. task already confirmed."""

    def __init__(self, message: str = "Conflict"):
        super().__init__(message, status_code=409)
