"""
SQLAlchemy database models for persistent storage.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, DateTime, Enum, String, Text, func, ForeignKey
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from app.models.schemas import TaskStatus, TaskType, BatchStatus


class Base(DeclarativeBase):
    """SQLAlchemy declarative base class."""
    pass


class TaskModel(Base):
    """Database model for tasks."""

    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(26), primary_key=True)  # ULID
    type: Mapped[TaskType] = mapped_column(
        Enum(TaskType),
        default=TaskType.CHAT,
        nullable=False
    )
    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus),
        default=TaskStatus.PENDING,
        nullable=False,
        index=True
    )

    # Task content
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    response: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)    
    sources: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    # User association (used for browser session/cookie storage)
    user_id: Mapped[str] = mapped_column(
        String(100),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # Caller identity (request-level user, unrelated to cookie/session storage)
    caller_user: Mapped[Optional[str]] = mapped_column(String(256), nullable=True, index=True)
    
    # Batch association
    batch_id: Mapped[Optional[str]] = mapped_column(String(26), ForeignKey("batches.id"), nullable=True, index=True)

    # Webhook
    webhook_url: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    webhook_sent: Mapped[bool] = mapped_column(default=False)

    # Custom metadata (JSON)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=func.now(),
        nullable=False
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    def __repr__(self) -> str:
        return f"<Task(id={self.id}, status={self.status}, user={self.user_id})>"


class BatchModel(Base):
    """Database model for task batches."""

    __tablename__ = "batches"

    id: Mapped[str] = mapped_column(String(26), primary_key=True)  # ULID
    # User association (used for browser session/cookie storage)
    user_id: Mapped[str] = mapped_column(
        String(100),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    # Caller identity (request-level user, unrelated to cookie/session storage)
    caller_user: Mapped[Optional[str]] = mapped_column(String(256), nullable=True, index=True)
    status: Mapped[BatchStatus] = mapped_column(
        Enum(BatchStatus),
        default=BatchStatus.PENDING,
        nullable=False
    )
    
    total_tasks: Mapped[int] = mapped_column(default=0)
    completed_tasks: Mapped[int] = mapped_column(default=0)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=func.now(),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    
    # Relationships
    tasks = relationship("TaskModel", backref="batch", lazy="select")

    def __repr__(self) -> str:
        return f"<Batch(id={self.id}, status={self.status}, user={self.user_id})>"


class UserModel(Base):
    """
    Database model for users.

    This is a placeholder for future authentication implementation.
    Currently stores minimal user info for session management.
    """

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    username: Mapped[Optional[str]] = mapped_column(String(50), unique=True, nullable=True)
    hashed_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    is_active: Mapped[bool] = mapped_column(default=True)
    is_superuser: Mapped[bool] = mapped_column(default=False)

    # Browser session info
    has_browser_session: Mapped[bool] = mapped_column(default=False)
    last_login_check: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Enhanced fields
    session_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    proxy_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    subscription_status: Mapped[str] = mapped_column(String(50), default="free")

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=func.now(),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, username={self.username})>"


class WebhookLogModel(Base):
    """
    Database model for webhook delivery logs.

    Tracks webhook delivery attempts for debugging and retry logic.
    """

    __tablename__ = "webhook_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    task_id: Mapped[str] = mapped_column(String(26), nullable=False, index=True)
    webhook_url: Mapped[str] = mapped_column(String(2000), nullable=False)

    # Delivery status
    attempt: Mapped[int] = mapped_column(default=1)
    success: Mapped[bool] = mapped_column(default=False)
    status_code: Mapped[Optional[int]] = mapped_column(nullable=True)
    response_body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=func.now(),
        nullable=False
    )

    def __repr__(self) -> str:
        return f"<WebhookLog(task={self.task_id}, attempt={self.attempt}, success={self.success})>"
