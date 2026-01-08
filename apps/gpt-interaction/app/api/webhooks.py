"""
Webhook API Routes - endpoints for webhook testing and management.
"""

from fastapi import APIRouter, Depends

from app.models.schemas import WebhookTestRequest, WebhookTestResponse
from app.services.user_service import UserResponse, get_current_user
from app.services.webhook import webhook_service

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post(
    "/test",
    response_model=WebhookTestResponse,
    summary="Test webhook endpoint",
    description="""
    Send a test ping to a webhook URL to verify it's reachable and functioning.

    This sends a test payload with event type "test.ping" and a sample task response.
    """,
)
async def test_webhook(
    request: WebhookTestRequest,
    current_user: UserResponse = Depends(get_current_user),
) -> WebhookTestResponse:
    """Test a webhook endpoint."""
    success, status_code, message = await webhook_service.test_webhook(
        str(request.webhook_url)
    )

    return WebhookTestResponse(
        success=success,
        status_code=status_code,
        message=message
    )
