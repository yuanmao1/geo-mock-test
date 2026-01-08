"""
Health & Status API Routes
"""

from fastapi import APIRouter

from app import __version__
from app.models.schemas import StatusResponse
from app.services.executor import task_executor
from app.services.task_service import task_service

router = APIRouter(tags=["health"])


@router.get(
    "/health",
    response_model=dict,
    summary="Health check",
    description="Simple health check endpoint for load balancers.",
)
async def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "ok"}


@router.get(
    "/status",
    response_model=StatusResponse,
    summary="Server status",
    description="Get detailed server status including task counts.",
)
async def get_status() -> StatusResponse:
    """Get server status."""
    counts = await task_service.count_tasks_by_status()

    from app.models.schemas import TaskStatus

    return StatusResponse(
        status="ok",
        version=__version__,
        active_tasks=task_executor.get_running_count(),
        pending_tasks=counts.get(TaskStatus.PENDING, 0),
    )


@router.get(
    "/stats",
    response_model=dict,
    summary="Task statistics",
    description="Get statistics about tasks by status.",
)
async def get_stats() -> dict:
    """Get task statistics."""
    counts = await task_service.count_tasks_by_status()

    return {
        "tasks_by_status": {
            status.value: count 
            for status, count in counts.items()
        },
        "running_tasks": task_executor.get_running_count(),
    }
