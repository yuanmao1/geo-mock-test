"""
Custom exception classes for the application.
"""

from typing import Any, Optional


class AppException(Exception):
    """Base exception for application errors."""

    def __init__(
        self,
        message: str,
        code: str = "APP_ERROR",
        details: Optional[dict[str, Any]] = None
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}


class TaskException(AppException):
    """Task-related exceptions."""

    def __init__(
        self,
        message: str,
        task_id: Optional[str] = None,
        code: str = "TASK_ERROR",
        details: Optional[dict[str, Any]] = None
    ):
        super().__init__(message, code, details)
        self.task_id = task_id


class TaskNotFoundError(TaskException):
    """Raised when a task is not found."""

    def __init__(self, task_id: str):
        super().__init__(
            message=f"Task not found: {task_id}",
            task_id=task_id,
            code="TASK_NOT_FOUND"
        )


class TaskTimeoutError(TaskException):
    """Raised when a task exceeds its timeout."""

    def __init__(self, task_id: str, timeout_seconds: int):
        super().__init__(
            message=f"Task {task_id} timed out after {timeout_seconds} seconds",
            task_id=task_id,
            code="TASK_TIMEOUT",
            details={"timeout_seconds": timeout_seconds}
        )


class BrowserException(AppException):
    """Browser automation related exceptions."""

    def __init__(
        self,
        message: str,
        code: str = "BROWSER_ERROR",
        details: Optional[dict[str, Any]] = None
    ):
        super().__init__(message, code, details)


class LoginRequiredError(BrowserException):
    """Raised when login is required but user is not authenticated."""

    def __init__(self, user_id: str):
        super().__init__(
            message="Login required. Please complete manual login first.",
            code="LOGIN_REQUIRED",
            details={"user_id": user_id}
        )


class CaptchaDetectedError(BrowserException):
    """Raised when a CAPTCHA or human verification is detected."""

    def __init__(self, captcha_type: str = "unknown"):
        super().__init__(
            message="Human verification (CAPTCHA) detected. Manual intervention required.",
            code="CAPTCHA_DETECTED",
            details={"captcha_type": captcha_type}
        )


class WebhookException(AppException):
    """Webhook-related exceptions."""

    def __init__(
        self,
        message: str,
        webhook_url: Optional[str] = None,
        code: str = "WEBHOOK_ERROR",
        details: Optional[dict[str, Any]] = None
    ):
        super().__init__(message, code, details)
        self.webhook_url = webhook_url


class UserException(AppException):
    """User-related exceptions (for future auth implementation)."""

    def __init__(
        self,
        message: str,
        user_id: Optional[str] = None,
        code: str = "USER_ERROR",
        details: Optional[dict[str, Any]] = None
    ):
        super().__init__(message, code, details)
        self.user_id = user_id
