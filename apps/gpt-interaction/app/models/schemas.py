"""
Pydantic schemas for API request/response validation and serialization.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field, HttpUrl


class SourceItem(BaseModel):
    """Reference source from web search."""
    title: str = Field(..., description="Source title or description")
    url: str = Field(..., description="Source URL")


class TaskStatus(str, Enum):
    """Task execution status."""
    PENDING = "pending"           # Task created, waiting to be processed
    RUNNING = "running"           # Task is currently executing
    WAITING_LOGIN = "waiting_login"  # Waiting for user to complete login
    WAITING_CAPTCHA = "waiting_captcha"  # Waiting for CAPTCHA resolution
    COMPLETED = "completed"       # Task completed successfully
    FAILED = "failed"             # Task failed with error
    CANCELLED = "cancelled"       # Task was cancelled
    TIMEOUT = "timeout"           # Task exceeded timeout


class TaskType(str, Enum):
    """Types of tasks that can be executed."""
    CHAT = "chat"                 # Send a message and get response
    CHECK_LOGIN = "check_login"   # Check if user is logged in
    MANUAL_LOGIN = "manual_login" # Open browser for manual login


class BatchStatus(str, Enum):
    """Batch execution status."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"  # Some tasks failed, some succeeded


# ============== Request Schemas ==============

class TaskCreateRequest(BaseModel):
    """Request schema for creating a new chat task."""

    message: str = Field(
        ...,
        min_length=1,
        max_length=10000,
        description="Message to send to ChatGPT"
    )
    enable_search: bool = Field(
        default=True,
        description="Enable web search feature if available"
    )
    user_id: Optional[str] = Field(
        default=None,
        description="Cookie/session user ID used for browser profile storage (uses default if not provided or empty)"
    )
    caller_user: Optional[str] = Field(
        default=None,
        description="Caller user identity (for auditing/tenant separation; not used for cookie/session storage)",
    )
    webhook_url: Optional[HttpUrl] = Field(
        default=None,
        description="Webhook URL to receive task completion notification"
    )
    metadata: Optional[dict[str, Any]] = Field(
        default=None,
        description="Custom metadata to include in webhook payload"
    )


class ManualLoginRequest(BaseModel):
    """Request schema for initiating manual login."""

    user_id: Optional[str] = Field(
        default=None,
        description="Cookie/session user ID for the login session (uses default if not provided or empty)"
    )
    caller_user: Optional[str] = Field(
        default=None,
        description="Caller user identity (not used for cookie/session storage)",
    )


class WebhookTestRequest(BaseModel):
    """Request schema for testing webhook delivery."""

    webhook_url: HttpUrl = Field(..., description="Webhook URL to test")


# ============== Response Schemas ==============

class TaskResponse(BaseModel):
    """Response schema for task information."""

    id: str = Field(..., description="Unique task identifier")
    type: TaskType = Field(..., description="Task type")
    status: TaskStatus = Field(..., description="Current task status")
    message: Optional[str] = Field(None, description="Input message (for chat tasks)")
    response: Optional[str] = Field(None, description="ChatGPT response")
    error: Optional[str] = Field(None, description="Error message if failed")
    sources: Optional[list[SourceItem]] = Field(None, description="Web search reference sources")
    user_id: str = Field(..., description="Cookie/session user ID used for browser profile storage")
    caller_user: Optional[str] = Field(
        default=None,
        description="Caller user identity (not used for cookie/session storage)",
    )
    created_at: datetime = Field(..., description="Task creation timestamp")
    started_at: Optional[datetime] = Field(None, description="Task start timestamp")
    completed_at: Optional[datetime] = Field(None, description="Task completion timestamp")
    metadata: Optional[dict[str, Any]] = Field(None, description="Custom metadata")

    class Config:
        from_attributes = True


class TaskListResponse(BaseModel):
    """Response schema for listing tasks."""

    tasks: list[TaskResponse] = Field(default_factory=list)
    total: int = Field(..., description="Total number of tasks")
    page: int = Field(default=1, description="Current page number")
    page_size: int = Field(default=20, description="Number of items per page")


class TaskCreateResponse(BaseModel):
    """Response schema for task creation."""

    task: TaskResponse
    message: str = Field(default="Task created successfully")


class StatusResponse(BaseModel):
    """Response schema for server status."""

    status: str = Field(default="ok")
    version: str
    active_tasks: int = Field(..., description="Number of currently running tasks")
    pending_tasks: int = Field(..., description="Number of pending tasks")


class ErrorResponse(BaseModel):
    """Response schema for errors."""

    error: str = Field(..., description="Error code")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[dict[str, Any]] = Field(None, description="Additional error details")


# ============== Webhook Schemas ==============

class WebhookPayload(BaseModel):
    """Payload sent to webhook endpoints."""

    event: str = Field(..., description="Event type (task.completed, task.failed, etc.)")
    task: TaskResponse = Field(..., description="Task information")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[dict[str, Any]] = Field(None, description="Custom metadata from task")


class WebhookTestResponse(BaseModel):
    """Response for webhook test."""

    success: bool
    status_code: Optional[int] = None
    message: str


# ============== User Schemas (for future auth) ==============

class UserBase(BaseModel):
    """Base user schema for future auth implementation."""

    id: str = Field(..., description="User identifier")
    username: Optional[str] = Field(None, description="Username")
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserCreate(BaseModel):
    """Schema for user creation (future)."""

    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)


# ============== Batch Schemas ==============

class BatchCreateRequest(BaseModel):
    """Request schema for creating a batch of tasks."""
    
    tasks: list[TaskCreateRequest] = Field(..., min_length=1, description="List of tasks to create")
    user_id: Optional[str] = Field(None, description="Cookie/session user ID for the batch")
    caller_user: Optional[str] = Field(
        default=None,
        description="Caller user identity (not used for cookie/session storage)",
    )


class BatchResponse(BaseModel):
    """Response schema for batch operations."""
    
    id: str
    user_id: str
    caller_user: Optional[str] = None
    status: BatchStatus
    total_tasks: int
    completed_tasks: int
    created_at: datetime
    updated_at: datetime
    tasks: Optional[list[TaskResponse]] = None



class UserResponse(UserBase):
    """Response schema for user information."""

    has_browser_session: bool = Field(
        default=False,
        description="Whether user has an active browser session"
    )
