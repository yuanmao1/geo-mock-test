"""
Task API Routes - endpoints for task management.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.config import get_settings
from app.core.exceptions import TaskNotFoundError
from app.models.schemas import (
    ErrorResponse,
    TaskCreateRequest,
    TaskCreateResponse,
    TaskListResponse,
    TaskResponse,
    TaskStatus,
    TaskType,
)
from app.services.task_service import task_service
from app.services.user_service import UserResponse, get_current_user
from app.services.executor import task_executor

router = APIRouter(prefix="/tasks", tags=["tasks"])
settings = get_settings()


@router.post(
    "",
    response_model=TaskCreateResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    summary="Create a new chat task",
    description="""
    Create a new task to send a message to ChatGPT.

    The task will be queued and processed asynchronously.
    Use the returned task ID to check status and retrieve the response.

    Optionally provide a webhook URL to receive notification when the task completes.
    """,
)
async def create_task(
    request: TaskCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
) -> TaskCreateResponse:
    """Create a new chat task."""
    session_user_id = (request.user_id or "").strip() or current_user.id
    caller_user = (request.caller_user or "").strip() or None

    task = await task_service.create_task(
        request=request,
        user_id=session_user_id,
        caller_user=caller_user,
        task_type=TaskType.CHAT
    )

    return TaskCreateResponse(task=task)


@router.get(
    "",
    response_model=TaskListResponse,
    summary="List tasks",
    description="Get a paginated list of tasks with optional filtering.",
)
async def list_tasks(
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    caller_user: Optional[str] = Query(None, description="Filter by caller user"),
    status: Optional[TaskStatus] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: UserResponse = Depends(get_current_user),
) -> TaskListResponse:
    """List tasks with optional filtering."""
    normalized_user_id = (user_id or "").strip() or None
    normalized_caller_user = (caller_user or "").strip() or None
    if not normalized_user_id and not normalized_caller_user:
        normalized_user_id = current_user.id

    tasks, total = await task_service.list_tasks(
        user_id=normalized_user_id,
        caller_user=normalized_caller_user,
        status=status,
        page=page,
        page_size=page_size
    )

    return TaskListResponse(
        tasks=tasks,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get(
    "/{task_id}",
    response_model=TaskResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Task not found"},
    },
    summary="Get task details",
    description="Get detailed information about a specific task including status and response.",
)
async def get_task(
    task_id: str,
    include_screenshot: bool = Query(False, description="Include browser screenshot if task is running"),
    current_user: UserResponse = Depends(get_current_user),
) -> dict:
    """Get task by ID, optionally with screenshot if running."""
    try:
        task = await task_service.get_task(task_id)
        result = task.model_dump()
        
        # Add screenshot if requested and task is running
        if include_screenshot and task.status == TaskStatus.RUNNING:
            screenshot = task_executor.get_task_screenshot(task_id)
            result["screenshot"] = screenshot
        
        return result
    except TaskNotFoundError:
        raise HTTPException(status_code=404, detail=f"Task not found: {task_id}")


@router.post(
    "/{task_id}/cancel",
    response_model=TaskResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Task not found"},
    },
    summary="Cancel a task",
    description="Cancel a pending or running task.",
)
async def cancel_task(
    task_id: str,
    current_user: UserResponse = Depends(get_current_user),
) -> TaskResponse:
    """Cancel a task."""
    try:
        task = await task_service.cancel_task(task_id)
        return task
    except TaskNotFoundError:
        raise HTTPException(status_code=404, detail=f"Task not found: {task_id}")


@router.get(
    "/{task_id}/status",
    response_model=dict,
    responses={
        404: {"model": ErrorResponse, "description": "Task not found"},
    },
    summary="Get task status",
    description="Quick endpoint to check just the status of a task.",
)
async def get_task_status(
    task_id: str,
    current_user: UserResponse = Depends(get_current_user),
) -> dict:
    """Get just the task status."""
    try:
        task = await task_service.get_task(task_id)
        return {
            "task_id": task.id,
            "status": task.status,
            "has_response": task.response is not None,
            "has_error": task.error is not None,
        }
    except TaskNotFoundError:
        raise HTTPException(status_code=404, detail=f"Task not found: {task_id}")
