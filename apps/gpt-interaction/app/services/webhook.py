"""
Webhook Service - handles webhook delivery with retry logic.
"""

import asyncio
from datetime import datetime
from typing import Any, Optional

import httpx

from app.core.config import get_settings
from app.core.exceptions import WebhookException
from app.core.logging import get_logger
from app.db import get_db_session
from app.models.database import WebhookLogModel
from app.models.schemas import TaskResponse, WebhookPayload

logger = get_logger("webhook")
settings = get_settings()


class WebhookService:
    """
    Service for delivering webhooks with retry logic.

    Features:
    - Automatic retry on failure
    - Exponential backoff
    - Delivery logging for debugging
    """

    def __init__(
        self,
        timeout: Optional[int] = None,
        max_retries: Optional[int] = None
    ):
        """
        Initialize webhook service.

        Args:
            timeout: Request timeout in seconds.
            max_retries: Maximum retry attempts.
        """
        self.timeout = timeout or settings.webhook_timeout_seconds
        self.max_retries = max_retries or settings.webhook_max_retries

    async def send_webhook(
        self,
        webhook_url: str,
        task: TaskResponse,
        event: str,
        metadata: Optional[dict[str, Any]] = None
    ) -> bool:
        """
        Send webhook notification.

        Args:
            webhook_url: URL to send webhook to.
            task: Task information.
            event: Event type (e.g., "task.completed").
            metadata: Additional metadata to include.

        Returns:
            True if webhook was delivered successfully.
        """
        payload = WebhookPayload(
            event=event,
            task=task,
            timestamp=datetime.utcnow(),
            metadata=metadata
        )

        return await self._deliver_with_retry(
            webhook_url=webhook_url,
            payload=payload,
            task_id=task.id
        )

    async def _deliver_with_retry(
        self,
        webhook_url: str,
        payload: WebhookPayload,
        task_id: str
    ) -> bool:
        """
        Deliver webhook with retry logic.

        Uses exponential backoff between retries.
        """
        for attempt in range(1, self.max_retries + 1):
            try:
                success, status_code, response_body = await self._send_request(
                    webhook_url,
                    payload
                )

                # Log delivery attempt
                await self._log_delivery(
                    task_id=task_id,
                    webhook_url=webhook_url,
                    attempt=attempt,
                    success=success,
                    status_code=status_code,
                    response_body=response_body
                )

                if success:
                    logger.info(
                        f"Webhook delivered successfully for task {task_id} "
                        f"(attempt {attempt})"
                    )
                    return True

                # Check if we should retry based on status code
                if status_code and 400 <= status_code < 500:
                    # Client error - don't retry
                    logger.warning(
                        f"Webhook delivery failed with client error {status_code} "
                        f"for task {task_id}, not retrying"
                    )
                    return False

                # Server error or timeout - retry with backoff
                if attempt < self.max_retries:
                    backoff = 2 ** attempt  # Exponential backoff
                    logger.warning(
                        f"Webhook delivery failed for task {task_id}, "
                        f"retrying in {backoff}s (attempt {attempt}/{self.max_retries})"
                    )
                    await asyncio.sleep(backoff)

            except Exception as e:
                logger.error(f"Webhook delivery error for task {task_id}: {e}")

                await self._log_delivery(
                    task_id=task_id,
                    webhook_url=webhook_url,
                    attempt=attempt,
                    success=False,
                    error_message=str(e)
                )

                if attempt < self.max_retries:
                    backoff = 2 ** attempt
                    await asyncio.sleep(backoff)

        logger.error(
            f"Webhook delivery failed after {self.max_retries} attempts "
            f"for task {task_id}"
        )
        return False

    async def _send_request(
        self,
        url: str,
        payload: WebhookPayload
    ) -> tuple[bool, Optional[int], Optional[str]]:
        """
        Send HTTP POST request to webhook URL.

        Returns:
            Tuple of (success, status_code, response_body).
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    url,
                    json=payload.model_dump(mode='json'),
                    headers={
                        "Content-Type": "application/json",
                        "User-Agent": "CallGPTServer-Webhook/1.0",
                    },
                    timeout=self.timeout
                )

                success = 200 <= response.status_code < 300
                return success, response.status_code, response.text[:1000]

            except httpx.TimeoutException:
                logger.warning(f"Webhook request timed out for {url}")
                return False, None, "Request timed out"

            except httpx.RequestError as e:
                logger.warning(f"Webhook request error for {url}: {e}")
                return False, None, str(e)

    async def _log_delivery(
        self,
        task_id: str,
        webhook_url: str,
        attempt: int,
        success: bool,
        status_code: Optional[int] = None,
        response_body: Optional[str] = None,
        error_message: Optional[str] = None
    ) -> None:
        """Log webhook delivery attempt to database."""
        try:
            async with get_db_session() as session:
                log = WebhookLogModel(
                    task_id=task_id,
                    webhook_url=webhook_url,
                    attempt=attempt,
                    success=success,
                    status_code=status_code,
                    response_body=response_body,
                    error_message=error_message
                )
                session.add(log)
                await session.commit()
        except Exception as e:
            logger.error(f"Failed to log webhook delivery: {e}")

    async def test_webhook(self, url: str) -> tuple[bool, Optional[int], str]:
        """
        Test webhook endpoint with a ping.

        Args:
            url: Webhook URL to test.

        Returns:
            Tuple of (success, status_code, message).
        """
        test_payload = WebhookPayload(
            event="test.ping",
            task=TaskResponse(
                id="test-ping",
                type="chat",
                status="completed",
                user_id="test",
                created_at=datetime.utcnow(),
                message="Test message",
                response="This is a test webhook ping"
            ),
            timestamp=datetime.utcnow(),
            metadata={"test": True}
        )

        try:
            success, status_code, response_body = await self._send_request(
                url,
                test_payload
            )

            if success:
                return True, status_code, "Webhook test successful"
            else:
                return False, status_code, f"Webhook returned non-success status: {response_body}"

        except Exception as e:
            return False, None, f"Webhook test failed: {e}"


# Global service instance
webhook_service = WebhookService()
