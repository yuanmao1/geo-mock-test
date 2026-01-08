"""
Database connection and session management.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.models.database import Base

settings = get_settings()

database_url = settings.build_database_url()
connect_args: dict = {}
if settings.db_search_path:
    connect_args["server_settings"] = {"search_path": settings.db_search_path}

sslmode = settings.db_sslmode.lower()
if sslmode in {"require", "verify-ca", "verify-full"}:
    connect_args["ssl"] = True

pool_size = max(1, settings.db_max_idle_conns)
max_overflow = max(0, settings.db_max_open_conns - pool_size)

# Create async engine
engine = create_async_engine(
    database_url,
    echo=settings.db_echo,
    future=True,
    connect_args=connect_args,
    pool_size=pool_size,
    max_overflow=max_overflow,
    pool_recycle=settings.db_conn_max_lifetime,
)

# SQLite needs explicit foreign key enabling.
if database_url.startswith("sqlite"):
    @event.listens_for(engine.sync_engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record) -> None:  # type: ignore[no-untyped-def]
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

# Session factory
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def init_db() -> None:
    """Initialize database and create tables."""
    async with engine.begin() as conn:
        if settings.db_schema:
            await conn.execute(
                text(f'CREATE SCHEMA IF NOT EXISTS "{settings.db_schema}"')
            )
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """Close database connections."""
    await engine.dispose()


@asynccontextmanager
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Get an async database session.

    Usage:
        async with get_db_session() as session:
            # use session
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency for FastAPI routes to get database session.

    Usage:
        @app.get("/")
        async def endpoint(session: AsyncSession = Depends(get_session)):
            ...
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
