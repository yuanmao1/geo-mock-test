"""
FastAPI Application Factory and Configuration.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import __version__
from app.api import health, tasks, users, webhooks, batches
from app.core.config import get_settings
from app.core.exceptions import AppException, TaskException
from app.core.logging import setup_logging
from app.db import close_db, init_db
from app.services.executor import task_executor, task_worker

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """
    Application lifespan manager.

    Handles startup and shutdown events:
    - Initialize database
    - Start background workers
    - Cleanup on shutdown
    """
    # Startup
    logger = setup_logging(
        level=10 if settings.debug else 20,  # DEBUG=10, INFO=20
        app_name="call-gpt-server"
    )
    logger.info(f"Starting Call GPT Server v{__version__}")

    # Ensure directories exist
    settings.ensure_directories()

    # Initialize database
    logger.info("Initializing database...")
    await init_db()

    # Start task worker
    logger.info("Starting task worker...")
    await task_worker.start()

    logger.info("Server startup complete")

    yield

    # Shutdown
    logger.info("Shutting down...")

    # Stop task worker
    await task_worker.stop()

    # Shutdown executor
    await task_executor.shutdown(wait=True)

    # Close database
    await close_db()

    logger.info("Shutdown complete")


def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application.

    Returns:
        Configured FastAPI application instance.
    """
    app = FastAPI(
        title="Call GPT Server",
        description="""
        ChatGPT Automation Server with FastAPI

        This server provides REST APIs for:
        - Sending messages to ChatGPT and receiving responses
        - Async task execution with status tracking
        - Webhook notifications for task completion
        - Multi-user session management

        ## Features

        - **Async Task Execution**: Tasks run in background, poll for status or use webhooks
        - **Human-like Behavior**: Simulates natural mouse movements and typing
        - **Session Persistence**: Browser sessions saved per user for login persistence
        - **CAPTCHA Detection**: Detects human verification challenges
        - **Webhook Support**: Get notified when tasks complete

        ## Quick Start

        1. Create a task: `POST /tasks` with your message
        2. Get the task ID from the response
        3. Poll `GET /tasks/{task_id}` for status
        4. Or provide a webhook URL to get notified
        """,
        version=__version__,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure appropriately for production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Exception handlers
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return JSONResponse(
            status_code=400,
            content={
                "error": exc.code,
                "message": exc.message,
                "details": exc.details,
            }
        )

    @app.exception_handler(TaskException)
    async def task_exception_handler(request: Request, exc: TaskException):
        status_code = 404 if exc.code == "TASK_NOT_FOUND" else 400
        return JSONResponse(
            status_code=status_code,
            content={
                "error": exc.code,
                "message": exc.message,
                "task_id": exc.task_id,
                "details": exc.details,
            }
        )

    # Include routers
    app.include_router(health.router)
    app.include_router(tasks.router, prefix="/api/v1")
    app.include_router(batches.router, prefix="/api/v1")
    app.include_router(users.router, prefix="/api/v1")
    app.include_router(webhooks.router, prefix="/api/v1")

    return app


# Create the app instance
app = create_app()
