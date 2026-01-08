"""
Task Executor - handles async task execution with worker pattern.
"""

import asyncio
import base64
import threading
from concurrent.futures import ThreadPoolExecutor
from typing import Callable, Optional

from app.core.config import get_settings
from app.core.logging import get_logger
from app.models.schemas import TaskResponse, TaskStatus, TaskType
from app.services.browser import ChatGPTBrowser
from app.services.task_service import task_service
from app.services.webhook import webhook_service

logger = get_logger("executor")
settings = get_settings()


class TaskExecutor:
    """
    Executes tasks asynchronously using a thread pool.

    Browser automation runs in threads to avoid blocking the async event loop.
    """

    def __init__(self, max_workers: Optional[int] = None):
        """
        Initialize task executor.

        Args:
            max_workers: Maximum number of concurrent worker threads.
        """
        self.max_workers = max_workers or settings.max_concurrent_tasks
        self._executor = ThreadPoolExecutor(max_workers=self.max_workers)
        self._running_tasks: dict[str, asyncio.Future] = {}
        self._running_task_users: dict[str, str] = {}
        self._running_by_user: dict[str, int] = {}
        self._running_browsers: dict[str, ChatGPTBrowser] = {}  # task_id -> browser instance
        self._browsers_lock = threading.Lock()
        self._shutdown = False

    async def submit_task(self, task: TaskResponse) -> None:
        """
        Submit a task for async execution.

        Args:
            task: Task to execute.
        """
        if self._shutdown:
            logger.warning("Executor is shutting down, rejecting task")
            return

        logger.info(f"Submitting task {task.id} for execution")

        # Get the current event loop
        loop = asyncio.get_event_loop()

        # Execute in thread pool
        future = loop.run_in_executor(
            self._executor,
            self._execute_task_sync,
            task.id,
            task.message or "",
            task.user_id,
            task.type
        )

        self._running_tasks[task.id] = future
        self._running_task_users[task.id] = task.user_id
        self._running_by_user[task.user_id] = self._running_by_user.get(task.user_id, 0) + 1

        # Set up callback for when task completes
        future.add_done_callback(
            lambda f: asyncio.run_coroutine_threadsafe(
                self._on_task_complete(task.id, f),
                loop
            )
        )

    def _execute_task_sync(
        self,
        task_id: str,
        message: str,
        user_id: str,
        task_type: TaskType
    ) -> tuple[bool, str, Optional[str], Optional[list]]:
        """
        Synchronous task execution (runs in thread pool).

        Args:
            task_id: Task identifier.
            message: Message to send.
            user_id: User identifier.
            task_type: Type of task.

        Returns:
            Tuple of (success, response/error_message, error_code, sources).
        """
        logger.info(f"Executing task {task_id} in thread")

        browser = None
        try:
            # Get browser for user
            browser = ChatGPTBrowser(user_id)
            browser.initialize()

            # Track browser instance for screenshot capability
            with self._browsers_lock:
                self._running_browsers[task_id] = browser

            if task_type == TaskType.CHECK_LOGIN:
                is_logged_in = browser.check_login_status()
                return (True, f"Login status: {'logged in' if is_logged_in else 'not logged in'}", None, None)

            elif task_type == TaskType.MANUAL_LOGIN:
                # Wait for manual login
                success = browser.wait_for_manual_login(timeout=settings.task_timeout_seconds)
                if success:
                    return (True, "Login completed successfully", None, None)
                else:
                    return (False, "Login timeout", "LOGIN_TIMEOUT", None)

            elif task_type == TaskType.CHAT:
                # Send message and get response
                response = browser.send_message(
                    message=message,
                    enable_search=True,
                    timeout=settings.task_timeout_seconds
                )

                if response.success:
                    return (True, response.message, None, response.sources)
                elif response.requires_login:
                    return (False, "Login required", "LOGIN_REQUIRED", None)
                elif response.requires_captcha:
                    return (False, f"CAPTCHA detected: {response.captcha_type}", "CAPTCHA_DETECTED", None)
                else:
                    return (False, response.error or "Unknown error", "EXECUTION_ERROR", None)

            else:
                return (False, f"Unknown task type: {task_type}", "UNKNOWN_TASK_TYPE", None)

        except Exception as e:
            logger.error(f"Task {task_id} failed with exception: {e}")
            return (False, str(e), "EXCEPTION", None)

        finally:
            # Remove browser from tracking
            with self._browsers_lock:
                self._running_browsers.pop(task_id, None)
            if browser:
                browser.close()

    async def _on_task_complete(
        self,
        task_id: str,
        future: asyncio.Future
    ) -> None:
        """
        Handle task completion callback.

        Args:
            task_id: Completed task ID.
            future: The completed future.
        """
        # Remove from running tasks
        self._running_tasks.pop(task_id, None)
        user_id = self._running_task_users.pop(task_id, None)
        if user_id:
            current = self._running_by_user.get(user_id, 0)
            if current <= 1:
                self._running_by_user.pop(user_id, None)
            else:
                self._running_by_user[user_id] = current - 1

        try:
            success, message, error_code, sources = future.result()

            if success:
                await task_service.update_task_status(
                    task_id,
                    TaskStatus.COMPLETED,
                    response=message,
                    sources=sources
                )
                logger.info(f"Task {task_id} completed successfully")
            else:
                status = TaskStatus.FAILED
                if error_code == "LOGIN_REQUIRED":
                    status = TaskStatus.WAITING_LOGIN
                elif error_code == "CAPTCHA_DETECTED":
                    status = TaskStatus.WAITING_CAPTCHA

                await task_service.update_task_status(
                    task_id,
                    status,
                    error=message
                )
                logger.warning(f"Task {task_id} failed: {message}")

            # Send webhook notification
            await self._send_webhook_notification(task_id)

        except Exception as e:
            logger.error(f"Error handling task completion for {task_id}: {e}")
            await task_service.update_task_status(
                task_id,
                TaskStatus.FAILED,
                error=str(e)
            )

    async def _send_webhook_notification(self, task_id: str) -> None:
        """Send webhook notification for completed task."""
        try:
            task = await task_service.get_task(task_id)

            # Get webhook URL from database
            from app.db import get_db_session
            from app.models.database import TaskModel

            async with get_db_session() as session:
                task_model = await session.get(TaskModel, task_id)
                if task_model and task_model.webhook_url and not task_model.webhook_sent:
                    # Determine event type
                    if task.status == TaskStatus.COMPLETED:
                        event = "task.completed"
                    elif task.status == TaskStatus.FAILED:
                        event = "task.failed"
                    elif task.status == TaskStatus.WAITING_LOGIN:
                        event = "task.waiting_login"
                    elif task.status == TaskStatus.WAITING_CAPTCHA:
                        event = "task.waiting_captcha"
                    else:
                        event = f"task.{task.status.value}"

                    # Send webhook
                    success = await webhook_service.send_webhook(
                        webhook_url=task_model.webhook_url,
                        task=task,
                        event=event,
                        metadata=task.metadata
                    )

                    if success:
                        await task_service.mark_webhook_sent(task_id)

        except Exception as e:
            logger.error(f"Error sending webhook for task {task_id}: {e}")

    def get_running_count(self) -> int:
        """Get the number of currently running tasks."""
        return len(self._running_tasks)

    def get_running_by_user(self) -> dict[str, int]:
        """Get running task counts per user."""
        return dict(self._running_by_user)

    def get_task_screenshot(self, task_id: str) -> Optional[str]:
        """
        Get a screenshot of the current browser page for a running task.

        Args:
            task_id: Task identifier.

        Returns:
            Base64 encoded PNG image string, or None if task not running.
        """
        with self._browsers_lock:
            browser = self._running_browsers.get(task_id)
            if not browser or not browser.page:
                return None

            try:
                # Get screenshot as bytes
                screenshot_bytes = browser.page.get_screenshot(as_bytes='png')
                if screenshot_bytes:
                    return base64.b64encode(screenshot_bytes).decode('utf-8')
                return None
            except Exception as e:
                logger.error(f"Failed to capture screenshot for task {task_id}: {e}")
                return None

    def is_task_running_with_browser(self, task_id: str) -> bool:
        """Check if a task has an active browser instance."""
        with self._browsers_lock:
            return task_id in self._running_browsers

    async def cancel_task(self, task_id: str) -> bool:
        """
        Cancel a running task.

        Args:
            task_id: Task to cancel.

        Returns:
            True if task was cancelled, False otherwise.
        """
        if task_id in self._running_tasks:
            future = self._running_tasks[task_id]
            if not future.done():
                future.cancel()
                logger.info(f"Task {task_id} cancellation requested")
                return True
        return False

    async def shutdown(self, wait: bool = True) -> None:
        """
        Shutdown the executor.

        Args:
            wait: Wait for running tasks to complete.
        """
        logger.info("Shutting down task executor...")
        self._shutdown = True

        if wait and self._running_tasks:
            logger.info(f"Waiting for {len(self._running_tasks)} tasks to complete...")
            await asyncio.gather(
                *self._running_tasks.values(),
                return_exceptions=True
            )

        self._executor.shutdown(wait=wait)
        logger.info("Task executor shutdown complete")


class TaskWorker:
    """
    Background worker that processes pending tasks.

    Runs as an async task and periodically checks for pending tasks.
    """

    def __init__(
        self,
        executor: TaskExecutor,
        poll_interval: float = 2.0
    ):
        """
        Initialize task worker.

        Args:
            executor: Task executor instance.
            poll_interval: Seconds between polling for new tasks.
        """
        self.executor = executor
        self.poll_interval = poll_interval
        self._running = False
        self._task: Optional[asyncio.Task] = None

    async def start(self) -> None:
        """Start the background worker."""
        if self._running:
            logger.warning("Worker already running")
            return

        # Reset any tasks left in RUNNING state from previous run
        try:
            await task_service.reset_stuck_tasks()
        except Exception as e:
            logger.error(f"Failed to reset stuck tasks: {e}")

        logger.info("Starting task worker...")
        self._running = True
        self._task = asyncio.create_task(self._worker_loop())

    async def stop(self) -> None:
        """Stop the background worker."""
        logger.info("Stopping task worker...")
        self._running = False

        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

        logger.info("Task worker stopped")

    async def _worker_loop(self) -> None:
        """Main worker loop."""
        while self._running:
            try:
                # Check if we can accept more tasks
                running_count = self.executor.get_running_count()
                available_slots = settings.max_concurrent_tasks - running_count

                if available_slots > 0:
                    # Get pending tasks
                    running_by_user = self.executor.get_running_by_user()
                    
                    pending_tasks = await task_service.get_pending_tasks(
                        limit=available_slots,
                        running_by_user=running_by_user,
                        per_user_limit=settings.max_concurrent_tasks_per_user
                    )
                    
                    if pending_tasks:
                        logger.info(f"Worker loop: fetched {len(pending_tasks)} pending tasks")
                        # Submit tasks for execution
                        for task in pending_tasks:
                            logger.info(f"Submitting task {task.id} (user={task.user_id}) for execution")
                            await self.executor.submit_task(task)

                # Wait before next poll
                await asyncio.sleep(self.poll_interval)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Worker loop error: {e}")
                await asyncio.sleep(self.poll_interval)


# Global instances
task_executor = TaskExecutor()
task_worker = TaskWorker(task_executor)
