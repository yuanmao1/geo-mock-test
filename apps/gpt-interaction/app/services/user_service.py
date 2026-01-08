"""
User Service - manages users and authentication (placeholder for future).

This module provides the foundation for user management and authentication.
Currently supports anonymous/default user mode, with extensibility for:
- User registration and login
- API key authentication
- JWT tokens
- Per-user browser session management
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import UserException
from app.core.logging import get_logger
from app.db import get_db_session
from app.models.database import UserModel
from app.models.schemas import UserBase, UserResponse

logger = get_logger("user_service")
settings = get_settings()


class UserService:
    """
    Service for user management.

    Currently provides basic user tracking for session management.
    Designed to be extended with full authentication in the future.
    """

    async def get_or_create_user(
        self,
        user_id: Optional[str] = None
    ) -> UserResponse:
        """
        Get existing user or create if doesn't exist.

        For anonymous mode, uses default user ID from settings.

        Args:
            user_id: User identifier (uses default if not provided).

        Returns:
            User response.
        """
        uid = user_id or settings.default_user_id

        async with get_db_session() as session:
            # Try to get existing user
            user = await session.get(UserModel, uid)

            if not user:
                try:
                    # Create new user
                    user = UserModel(
                        id=uid,
                        is_active=True,
                    )
                    session.add(user)
                    await session.commit()
                    await session.refresh(user)
                    logger.info(f"Created new user: {uid}")
                except IntegrityError:
                    # Handle race condition: user created by another request
                    logger.info(f"User {uid} already exists (concurrent creation caught)")
                    await session.rollback()
                    user = await session.get(UserModel, uid)
                    if not user:
                        # Should not happen if IntegrityError was due to this user
                        raise UserException(f"Failed to retrieve user {uid} after duplicate key error")

            return UserResponse(
                id=user.id,
                username=user.username,
                is_active=user.is_active,
                created_at=user.created_at,
                has_browser_session=user.has_browser_session
            )

    async def get_user(self, user_id: str) -> Optional[UserResponse]:
        """
        Get user by ID.

        Args:
            user_id: User identifier.

        Returns:
            User response or None if not found.
        """
        async with get_db_session() as session:
            user = await session.get(UserModel, user_id)

            if not user:
                return None

            return UserResponse(
                id=user.id,
                username=user.username,
                is_active=user.is_active,
                created_at=user.created_at,
                has_browser_session=user.has_browser_session
            )

    async def update_browser_session_status(
        self,
        user_id: str,
        has_session: bool
    ) -> None:
        """
        Update user's browser session status.

        Args:
            user_id: User identifier.
            has_session: Whether user has an active browser session.
        """
        async with get_db_session() as session:
            user = await session.get(UserModel, user_id)

            if user:
                user.has_browser_session = has_session
                user.last_login_check = datetime.utcnow()
                await session.commit()

    async def list_users(
        self,
        page: int = 1,
        page_size: int = 20
    ) -> tuple[list[UserResponse], int]:
        """
        List all users with pagination.

        Args:
            page: Page number (1-indexed).
            page_size: Items per page.

        Returns:
            Tuple of (user list, total count).
        """
        async with get_db_session() as session:
            # Count total
            from sqlalchemy import func
            count_result = await session.execute(
                select(func.count(UserModel.id))
            )
            total = count_result.scalar() or 0

            # Get paginated users
            offset = (page - 1) * page_size
            result = await session.execute(
                select(UserModel)
                .order_by(UserModel.created_at.desc())
                .offset(offset)
                .limit(page_size)
            )
            users = result.scalars().all()

            return [
                UserResponse(
                    id=u.id,
                    username=u.username,
                    is_active=u.is_active,
                    created_at=u.created_at,
                    has_browser_session=u.has_browser_session
                )
                for u in users
            ], total

    # ============== Future Auth Methods (Placeholders) ==============

    async def register_user(
        self,
        username: str,
        password: str
    ) -> UserResponse:
        """
        Register a new user with credentials.

        TODO: Implement when auth is needed.
        """
        raise NotImplementedError(
            "User registration not implemented yet. "
            "Use anonymous mode with default user ID."
        )

    async def authenticate_user(
        self,
        username: str,
        password: str
    ) -> Optional[UserResponse]:
        """
        Authenticate user with credentials.

        TODO: Implement when auth is needed.
        """
        raise NotImplementedError(
            "User authentication not implemented yet. "
            "Use anonymous mode with default user ID."
        )

    async def create_api_key(self, user_id: str) -> str:
        """
        Create API key for a user.

        TODO: Implement when auth is needed.
        """
        raise NotImplementedError("API key creation not implemented yet.")

    async def validate_api_key(self, api_key: str) -> Optional[UserResponse]:
        """
        Validate API key and return associated user.

        TODO: Implement when auth is needed.
        """
        raise NotImplementedError("API key validation not implemented yet.")


# Global service instance
user_service = UserService()


# ============== Authentication Dependencies (Future) ==============

class AuthDependency:
    """
    FastAPI dependency for authentication.

    Currently returns default user. Will be extended for real auth.
    """

    async def __call__(
        self,
        # Future: api_key: Optional[str] = Header(None),
        # Future: authorization: Optional[str] = Header(None),
    ) -> UserResponse:
        """
        Get current user from request.

        Currently returns default user for all requests.
        """
        # TODO: Implement real auth
        # 1. Check API key header
        # 2. Check JWT bearer token
        # 3. Return authenticated user

        return await user_service.get_or_create_user()


# Dependency instance
get_current_user = AuthDependency()
