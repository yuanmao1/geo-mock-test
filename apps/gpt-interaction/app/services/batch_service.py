"""
Batch Service - handles batch task operations.
"""

from typing import List, Optional

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from ulid import ULID

from app.core.logging import get_logger
from app.db import get_db_session
from app.models.database import BatchModel, TaskModel, UserModel
from app.models.schemas import (
    BatchCreateRequest,
    BatchResponse,
    BatchStatus,
    TaskResponse,
    TaskType,
)
from app.services.task_service import task_service

logger = get_logger("batch_service")


class BatchService:
    """Service for managing task batches."""

    @staticmethod
    def _generate_id() -> str:
        return str(ULID())

    @staticmethod
    def _model_to_response(batch: BatchModel, tasks: Optional[List[TaskModel]] = None) -> BatchResponse:
        """Convert database model to response schema."""
        task_responses = None
        if tasks:
            task_responses = [task_service._model_to_response(t) for t in tasks]
            
        return BatchResponse(
            id=batch.id,
            user_id=batch.user_id,
            caller_user=batch.caller_user,
            status=batch.status,
            total_tasks=batch.total_tasks,
            completed_tasks=batch.completed_tasks,
            created_at=batch.created_at,
            updated_at=batch.updated_at,
            tasks=task_responses
        )

    async def create_batch(
        self,
        request: BatchCreateRequest,
        user_id: str,
        caller_user: Optional[str] = None,
    ) -> BatchResponse:
        """
        Create a new batch of tasks.
        """
        batch_id = self._generate_id()
        
        # Create batch record
        async with get_db_session() as session:
            user = await session.get(UserModel, user_id)
            if not user:
                session.add(UserModel(id=user_id, is_active=True))
                try:
                    await session.flush()
                except IntegrityError:
                    await session.rollback()

            batch = BatchModel(
                id=batch_id,
                user_id=user_id,
                caller_user=caller_user,
                status=BatchStatus.PENDING,
                total_tasks=len(request.tasks),
                completed_tasks=0
            )
            session.add(batch)
            await session.commit()
            
        # Create tasks linked to batch
        # Note: We create them sequentially here. For very large batches, 
        # we might want to optimize this or do it in a background job.
        created_tasks = []
        for task_req in request.tasks:
            # We use task_service to create tasks so they are properly initialized
            # and potentially queued (if we had a queue system hooked into create_task)
            # Currently create_task just saves to DB.
            task = await task_service.create_task(
                request=task_req,
                user_id=user_id,
                caller_user=caller_user,
                task_type=TaskType.CHAT,
                batch_id=batch_id
            )
            # We need to fetch the TaskModel to return it, but create_task returns TaskResponse
            # For now, we won't return the full task objects in the create response to save bandwidth
            # or we can reconstruct them.
            
        # Fetch the created batch to return
        async with get_db_session() as session:
            batch = await session.get(BatchModel, batch_id)
            return self._model_to_response(batch)

    async def get_batch(self, batch_id: str) -> Optional[BatchResponse]:
        """Get batch details including tasks."""
        async with get_db_session() as session:
            batch = await session.get(BatchModel, batch_id)
            if not batch:
                return None
                
            # Fetch tasks for this batch
            stmt = select(TaskModel).where(TaskModel.batch_id == batch_id)
            result = await session.execute(stmt)
            tasks = result.scalars().all()
            
            # Update progress on the fly (optional, or rely on background worker to update batch stats)
            # For now, let's calculate it from tasks
            completed = sum(1 for t in tasks if t.status in ["completed", "failed", "cancelled", "timeout"])
            batch.completed_tasks = completed
            
            # Update status
            if completed == batch.total_tasks and batch.total_tasks > 0:
                # Check if any failed
                if any(t.status == "failed" for t in tasks):
                    batch.status = BatchStatus.PARTIAL if any(t.status == "completed" for t in tasks) else BatchStatus.FAILED
                else:
                    batch.status = BatchStatus.COMPLETED
            elif completed > 0:
                batch.status = BatchStatus.PROCESSING
                
            # Save updated stats if changed (skipping for read-only optimization)
            
            return self._model_to_response(batch, tasks)

    async def list_batches(
        self,
        user_id: Optional[str] = None,
        caller_user: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> tuple[List[BatchResponse], int]:
        """List batches for a user."""
        async with get_db_session() as session:
            # Count total
            count_stmt = select(func.count()).select_from(BatchModel)
            if user_id:
                count_stmt = count_stmt.where(BatchModel.user_id == user_id)
            if caller_user:
                count_stmt = count_stmt.where(BatchModel.caller_user == caller_user)
            total = await session.scalar(count_stmt)
            
            # Get items
            stmt = (
                select(BatchModel)
                .order_by(BatchModel.created_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
            if user_id:
                stmt = stmt.where(BatchModel.user_id == user_id)
            if caller_user:
                stmt = stmt.where(BatchModel.caller_user == caller_user)
            result = await session.execute(stmt)
            batches = result.scalars().all()
            
            return [self._model_to_response(b) for b in batches], total

batch_service = BatchService()
