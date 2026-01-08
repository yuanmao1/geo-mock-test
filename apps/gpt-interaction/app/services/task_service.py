"""
Task Service - handles task CRUD operations and state management.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from ulid import ULID

from app.core.exceptions import TaskNotFoundError
from app.core.logging import get_logger
from app.db import get_db_session
from app.models.database import TaskModel, UserModel
from app.models.schemas import (
    SourceItem,
    TaskCreateRequest,
    TaskResponse,
    TaskStatus,
    TaskType,
)

logger = get_logger("task_service")


class TaskService:
    """Service for managing tasks in the database."""

    @staticmethod
    def _generate_task_id() -> str:
        """Generate a unique task ID using ULID."""
        return str(ULID())

    @staticmethod
    def _model_to_response(task: TaskModel) -> TaskResponse:
        """Convert database model to response schema."""
        # Convert sources from JSON to SourceItem list
        sources = None
        if task.sources:
            sources = [SourceItem(title=s.get('title', ''), url=s.get('url', '')) for s in task.sources]
        
        return TaskResponse(
            id=task.id,
            type=task.type,
            status=task.status,
            message=task.message,
            response=task.response,
            error=task.error,
            sources=sources,
            user_id=task.user_id,
            caller_user=task.caller_user,
            created_at=task.created_at,
            started_at=task.started_at,
            completed_at=task.completed_at,
            metadata=task.metadata_json,
        )

    @staticmethod
    async def _ensure_user_exists(session: AsyncSession, user_id: str) -> None:
        user = await session.get(UserModel, user_id)
        if user:
            return

        session.add(
            UserModel(
                id=user_id,
                is_active=True,
            )
        )
        try:
            await session.flush()
        except IntegrityError:
            await session.rollback()

    async def create_task(
        self,
        request: TaskCreateRequest,
        user_id: str,
        caller_user: Optional[str] = None,
        task_type: TaskType = TaskType.CHAT,
        batch_id: Optional[str] = None
    ) -> TaskResponse:
        """
        Create a new task.

        Args:
            request: Task creation request.
            user_id: User ID to associate with the task.
            task_type: Type of task.
            batch_id: Optional batch ID.

        Returns:
            Created task response.
        """
        async with get_db_session() as session:
            await self._ensure_user_exists(session, user_id)
            task = TaskModel(
                id=self._generate_task_id(),
                type=task_type,
                status=TaskStatus.PENDING,
                message=request.message,
                user_id=user_id,
                caller_user=caller_user,
                webhook_url=str(request.webhook_url) if request.webhook_url else None,
                metadata_json=request.metadata,
                batch_id=batch_id
            )

            session.add(task)
            await session.commit()
            await session.refresh(task)

            logger.info(f"Created task {task.id} for user {user_id} (batch={batch_id})")
            return self._model_to_response(task)

    async def get_task(self, task_id: str) -> TaskResponse:
        """
        Get a task by ID.

        Args:
            task_id: Task identifier.

        Returns:
            Task response.

        Raises:
            TaskNotFoundError: If task doesn't exist.
        """
        async with get_db_session() as session:
            task = await session.get(TaskModel, task_id)

            if not task:
                raise TaskNotFoundError(task_id)

            return self._model_to_response(task)

    async def get_task_model(
        self,
        task_id: str,
        session: AsyncSession
    ) -> TaskModel:
        """
        Get task model within an existing session.

        Args:
            task_id: Task identifier.
            session: Database session.

        Returns:
            Task database model.
        """
        task = await session.get(TaskModel, task_id)
        if not task:
            raise TaskNotFoundError(task_id)
        return task

    async def update_task_status(
        self,
        task_id: str,
        status: TaskStatus,
        response: Optional[str] = None,
        error: Optional[str] = None,
        sources: Optional[list[dict]] = None
    ) -> TaskResponse:
        """
        Update task status and optionally response/error/sources.

        Args:
            task_id: Task identifier.
            status: New status.
            response: Response text (for completed tasks).
            error: Error message (for failed tasks).
            sources: Web search reference sources (list of {title, url} dicts).

        Returns:
            Updated task response.
        """
        async with get_db_session() as session:
            task = await self.get_task_model(task_id, session)

            task.status = status

            if status == TaskStatus.RUNNING and not task.started_at:
                task.started_at = datetime.utcnow()

            if status in [TaskStatus.COMPLETED, TaskStatus.FAILED, 
                         TaskStatus.CANCELLED, TaskStatus.TIMEOUT]:
                task.completed_at = datetime.utcnow()

            if response is not None:
                task.response = response

            if error is not None:
                task.error = error
            
            if sources is not None:
                task.sources = sources

            await session.commit()
            await session.refresh(task)

            logger.info(f"Task {task_id} status updated to {status}")
            return self._model_to_response(task)

    async def mark_webhook_sent(self, task_id: str) -> None:
        """Mark that webhook has been sent for a task."""
        async with get_db_session() as session:
            task = await self.get_task_model(task_id, session)
            task.webhook_sent = True
            await session.commit()

    async def list_tasks(
        self,
        user_id: Optional[str] = None,
        caller_user: Optional[str] = None,
        status: Optional[TaskStatus] = None,
        page: int = 1,
        page_size: int = 20
    ) -> tuple[list[TaskResponse], int]:
        """
        List tasks with optional filtering and pagination.

        Args:
            user_id: Filter by user ID.
            status: Filter by status.
            page: Page number (1-indexed).
            page_size: Number of items per page.

        Returns:
            Tuple of (task list, total count).
        """
        async with get_db_session() as session:
            # Build query
            query = select(TaskModel).order_by(TaskModel.created_at.desc())
            count_query = select(func.count(TaskModel.id))

            if user_id:
                query = query.where(TaskModel.user_id == user_id)
                count_query = count_query.where(TaskModel.user_id == user_id)

            if caller_user:
                query = query.where(TaskModel.caller_user == caller_user)
                count_query = count_query.where(TaskModel.caller_user == caller_user)

            if status:
                query = query.where(TaskModel.status == status)
                count_query = count_query.where(TaskModel.status == status)

            # Get total count
            total_result = await session.execute(count_query)
            total = total_result.scalar() or 0

            # Apply pagination
            offset = (page - 1) * page_size
            query = query.offset(offset).limit(page_size)

            # Execute query
            result = await session.execute(query)
            tasks = result.scalars().all()

            return [self._model_to_response(t) for t in tasks], total

    async def get_pending_tasks(
        self,
        limit: int = 10,
        running_by_user: Optional[dict[str, int]] = None,
        per_user_limit: Optional[int] = None
    ) -> list[TaskResponse]:
        """
        Claim pending tasks for processing.

        Args:
            limit: Maximum number of tasks to return.
            running_by_user: Current running task counts per user.
            per_user_limit: Maximum concurrent tasks per user.

        Returns:
            List of pending tasks.
        """
        async with get_db_session() as session:
            running_by_user = running_by_user or {}
            per_user_limit = max(1, per_user_limit or 1)

            query = (
                select(TaskModel)
                .where(TaskModel.status == TaskStatus.PENDING)
                .order_by(TaskModel.created_at.asc())
                .limit(max(limit * 5, limit))
                .with_for_update(skip_locked=True)
            )

            result = await session.execute(query)
            candidates = result.scalars().all()

            now = datetime.utcnow()
            claimed: list[TaskModel] = []
            claimed_by_user: dict[str, int] = {}

            for task in candidates:
                user_id = task.user_id
                current = running_by_user.get(user_id, 0) + claimed_by_user.get(user_id, 0)
                if current >= per_user_limit:
                    continue

                task.status = TaskStatus.RUNNING
                if not task.started_at:
                    task.started_at = now

                claimed.append(task)
                claimed_by_user[user_id] = claimed_by_user.get(user_id, 0) + 1

                if len(claimed) >= limit:
                    break

            await session.commit()

            return [self._model_to_response(t) for t in claimed]

    async def count_tasks_by_status(self) -> dict[TaskStatus, int]:
        """
        Get count of tasks grouped by status.

        Returns:
            Dictionary mapping status to count.
        """
        async with get_db_session() as session:
            query = (
                select(TaskModel.status, func.count(TaskModel.id))
                .group_by(TaskModel.status)
            )

            result = await session.execute(query)
            counts = {status: 0 for status in TaskStatus}

            for row in result:
                counts[row[0]] = row[1]

            return counts

    async def cancel_task(self, task_id: str) -> TaskResponse:
        """
        Cancel a pending or running task.

        Args:
            task_id: Task identifier.

        Returns:
            Updated task response.
        """
        async with get_db_session() as session:
            task = await self.get_task_model(task_id, session)

            if task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED,
                              TaskStatus.CANCELLED, TaskStatus.TIMEOUT]:
                logger.warning(f"Cannot cancel task {task_id} in status {task.status}")
                return self._model_to_response(task)

            task.status = TaskStatus.CANCELLED
            task.completed_at = datetime.utcnow()

            await session.commit()
            await session.refresh(task)

            logger.info(f"Task {task_id} cancelled")
            return self._model_to_response(task)


# Global service instance
task_service = TaskService()
