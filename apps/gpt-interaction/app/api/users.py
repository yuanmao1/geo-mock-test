"""
User/Session API Routes - endpoints for user and session management.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.config import get_settings
from app.models.schemas import (
    ErrorResponse,
    ManualLoginRequest,
    TaskCreateResponse,
    TaskType,
    UserResponse,
)
from app.services.browser import ChatGPTBrowser
from app.services.task_service import task_service, TaskCreateRequest
from app.services.user_service import UserResponse as UserResponseSchema
from app.services.user_service import get_current_user, user_service

router = APIRouter(prefix="/users", tags=["users"])
settings = get_settings()


@router.get(
    "/me",
    response_model=UserResponseSchema,
    summary="Get current user",
    description="Get information about the current user (or default user in anonymous mode).",
)
async def get_current_user_info(
    current_user: UserResponseSchema = Depends(get_current_user),
) -> UserResponseSchema:
    """Get current user info."""
    return current_user


@router.get(
    "",
    response_model=dict,
    summary="List users",
    description="List all users (admin endpoint for future use).",
)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: UserResponseSchema = Depends(get_current_user),
) -> dict:
    """List all users."""
    users, total = await user_service.list_users(page=page, page_size=page_size)

    return {
        "users": [u.model_dump() for u in users],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post(
    "/login/manual",
    response_model=TaskCreateResponse,
    summary="Initiate manual login",
    description="""
    Create a task that opens the browser for manual login.

    This is useful when the user needs to complete login manually
    (e.g., to handle CAPTCHA or 2FA). The browser will stay open
    until login is detected or timeout occurs.
    """,
)
async def initiate_manual_login(
    request: ManualLoginRequest,
    current_user: UserResponseSchema = Depends(get_current_user),
) -> TaskCreateResponse:
    """Create a manual login task."""
    session_user_id = (request.user_id or "").strip() or current_user.id
    caller_user = (request.caller_user or "").strip() or None

    # Create a task request for manual login
    task_request = TaskCreateRequest(
        message="Manual login session",
        enable_search=False,
        user_id=session_user_id,
        caller_user=caller_user,
    )

    task = await task_service.create_task(
        request=task_request,
        user_id=session_user_id,
        caller_user=caller_user,
        task_type=TaskType.MANUAL_LOGIN
    )

    return TaskCreateResponse(
        task=task,
        message="Browser will open for manual login. Please complete login in the browser window."
    )


@router.get(
    "/{user_id}/login-status",
    response_model=dict,
    summary="Check login status",
    description="Check if a user has an active, logged-in browser session.",
)
async def check_login_status(
    user_id: str,
    current_user: UserResponseSchema = Depends(get_current_user),
) -> dict:
    """Check user's login status."""
    # This is a quick check - it opens browser and checks status
    browser = None
    try:
        browser = ChatGPTBrowser(user_id)
        browser.initialize()
        is_logged_in = browser.check_login_status()

        # Update user's session status
        await user_service.update_browser_session_status(user_id, is_logged_in)

        return {
            "user_id": user_id,
            "is_logged_in": is_logged_in,
            "message": "User is logged in" if is_logged_in else "Login required"
        }

    except Exception as e:
        return {
            "user_id": user_id,
            "is_logged_in": False,
            "message": f"Error checking login status: {str(e)}"
        }
    finally:
        # Don't close browser - it's managed by the executor's browser pool
        # if browser:
        #     browser.close()
        pass


@router.post(
    "/{user_id}/check-login",
    response_model=TaskCreateResponse,
    summary="Create login check task",
    description="Create a task to check if the user is logged in (async).",
)
async def create_login_check_task(
    user_id: str,
    current_user: UserResponseSchema = Depends(get_current_user),
) -> TaskCreateResponse:
    """Create a login check task."""
    task_request = TaskCreateRequest(
        message="Check login status",
        enable_search=False,
        user_id=user_id,
    )

    task = await task_service.create_task(
        request=task_request,
        user_id=user_id,
        task_type=TaskType.CHECK_LOGIN
    )

    return TaskCreateResponse(
        task=task,
        message="Login check task created"
    )
