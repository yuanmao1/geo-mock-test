"""
Batch API Routes - endpoints for batch task management.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.config import get_settings
from app.models.schemas import (
    BatchCreateRequest,
    BatchResponse,
    ErrorResponse,
)
from app.services.batch_service import batch_service
from app.services.user_service import UserResponse, get_current_user

router = APIRouter(prefix="/batches", tags=["batches"])
settings = get_settings()


@router.post(
    "",
    response_model=BatchResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    summary="Create a new batch of tasks",
    description="Create multiple tasks at once. They will be processed asynchronously.",
)
async def create_batch(
    request: BatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
) -> BatchResponse:
    """Create a new batch of tasks."""
    session_user_id = (request.user_id or "").strip() or current_user.id
    caller_user = (request.caller_user or "").strip() or None
    
    # Validate task count
    if len(request.tasks) > 100:  # Arbitrary limit
        raise HTTPException(status_code=400, detail="Batch size limit exceeded (max 100)")

    return await batch_service.create_batch(request, session_user_id, caller_user=caller_user)


@router.get(
    "/{batch_id}",
    response_model=BatchResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Batch not found"},
    },
    summary="Get batch details",
    description="Get detailed information about a specific batch including all tasks.",
)
async def get_batch(
    batch_id: str,
    current_user: UserResponse = Depends(get_current_user),
) -> BatchResponse:
    """Get batch details."""
    batch = await batch_service.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
        
    # Check permission (only when auth is implemented; in anonymous mode all callers share default user)
    if current_user.id != settings.default_user_id:
        owner = batch.caller_user or batch.user_id
        if owner != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this batch")
        
    return batch


@router.get(
    "",
    response_model=List[BatchResponse],
    summary="List batches",
    description="Get a paginated list of batches.",
)
async def list_batches(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    caller_user: Optional[str] = Query(None, description="Filter by caller user"),
    user_id: Optional[str] = Query(None, description="Filter by cookie/session user ID"),
    current_user: UserResponse = Depends(get_current_user),
) -> List[BatchResponse]:
    """List batches."""
    normalized_caller_user = (caller_user or "").strip() or None
    normalized_user_id = (user_id or "").strip() or None
    if not normalized_caller_user and not normalized_user_id:
        normalized_user_id = current_user.id

    batches, _ = await batch_service.list_batches(
        user_id=normalized_user_id,
        caller_user=normalized_caller_user,
        page=page,
        page_size=page_size
    )
    return batches
