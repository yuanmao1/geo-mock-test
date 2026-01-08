"""
Tests for task API endpoints.
"""

import asyncio
import time

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.db import close_db, init_db
from app.core.config import get_settings
from app.services.executor import task_worker


@pytest_asyncio.fixture
async def client():
    """Create async test client."""
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    await close_db()


@pytest_asyncio.fixture
async def client_with_worker(monkeypatch):
    """Create async test client with background worker and fake browser."""
    from app.services.browser import ChatResponse

    class FakeBrowser:
        def __init__(self, user_id=None):
            self.user_id = user_id

        def initialize(self) -> None:
            return None

        def check_login_status(self) -> bool:
            return True

        def wait_for_manual_login(self, timeout: int = 300) -> bool:
            return True

        def send_message(self, message: str, enable_search: bool = True, timeout: int = 360) -> ChatResponse:
            time.sleep(0.5)
            return ChatResponse(success=True, message=f"echo:{message}")

        def close(self) -> None:
            return None

    monkeypatch.setattr("app.services.executor.ChatGPTBrowser", FakeBrowser)

    settings = get_settings()
    settings.max_concurrent_tasks_per_user = 1
    task_worker.poll_interval = 0.05

    await init_db()
    await task_worker.start()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    await task_worker.stop()
    await close_db()


@pytest_asyncio.fixture
async def client_with_worker_real():
    """Create async test client with background worker and real browser."""
    settings = get_settings()
    settings.max_concurrent_tasks_per_user = 1
    task_worker.poll_interval = 0.05

    await init_db()
    await task_worker.start()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    await task_worker.stop()
    await close_db()


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Test health check endpoint."""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_status_endpoint(client: AsyncClient):
    """Test status endpoint."""
    response = await client.get("/status")
    assert response.status_code == 200
    data = response.json()
    assert "version" in data
    assert "active_tasks" in data
    assert "pending_tasks" in data


@pytest.mark.asyncio
async def test_create_task(client: AsyncClient):
    """Test task creation."""
    response = await client.post(
        "/api/v1/tasks",
        json={
            "message": "给我讲一个笑话",
            "enable_search": True,
            "caller_user": "test_caller",
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "task" in data
    assert data["task"]["status"] == "pending"
    assert data["task"]["message"] == "给我讲一个笑话"
    assert data["task"]["caller_user"] == "test_caller"


@pytest.mark.asyncio
async def test_list_tasks(client: AsyncClient):
    """Test task listing."""
    response = await client.get("/api/v1/tasks")
    assert response.status_code == 200
    data = response.json()
    assert "tasks" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_get_current_user(client: AsyncClient):
    """Test get current user endpoint."""
    response = await client.get("/api/v1/users/me")
    assert response.status_code == 200
    data = response.json()
    assert "id" in data


@pytest.mark.asyncio
async def test_task_full_flow(client_with_worker_real: AsyncClient):
    """Test full flow from task creation to response."""
    response = await client_with_worker_real.post(
        "/api/v1/tasks",
        json={
            "message": "Hello",
            "enable_search": True,
            "user_id": "flow_user",
        }
    )
    assert response.status_code == 200
    task_id = response.json()["task"]["id"]

    deadline = time.time() + 120
    while time.time() < deadline:
        status_resp = await client_with_worker_real.get(f"/api/v1/tasks/{task_id}")
        assert status_resp.status_code == 200
        data = status_resp.json()
        if data["status"] == "completed":
            assert data["response"]
            return
        await asyncio.sleep(0.05)

    pytest.fail("Task did not complete in time")


@pytest.mark.asyncio
async def test_batch_flow(client_with_worker: AsyncClient):
    """Test batch task creation and completion."""
    response = await client_with_worker.post(
        "/api/v1/batches",
        json={
            "tasks": [
                {"message": "One", "enable_search": False},
                {"message": "Two", "enable_search": False},
            ],
            "caller_user": "batch_caller",
        }
    )
    assert response.status_code == 200
    batch_id = response.json()["id"]

    deadline = time.time() + 8
    while time.time() < deadline:
        batch_resp = await client_with_worker.get(f"/api/v1/batches/{batch_id}")
        assert batch_resp.status_code == 200
        batch = batch_resp.json()
        assert batch["caller_user"] == "batch_caller"
        tasks = batch.get("tasks") or []
        if tasks and all(t["status"] == "completed" for t in tasks):
            responses = {t["response"] for t in tasks}
            assert responses == {"echo:One", "echo:Two"}
            return
        await asyncio.sleep(0.05)

    pytest.fail("Batch did not complete in time")


@pytest.mark.asyncio
async def test_same_user_concurrency_limited(client_with_worker: AsyncClient):
    """Ensure same user tasks are not executed concurrently."""
    user_id = "limited_user"
    resp1 = await client_with_worker.post(
        "/api/v1/tasks",
        json={"message": "First", "user_id": user_id}
    )
    resp2 = await client_with_worker.post(
        "/api/v1/tasks",
        json={"message": "Second", "user_id": user_id}
    )
    assert resp1.status_code == 200
    assert resp2.status_code == 200

    task1_id = resp1.json()["task"]["id"]
    task2_id = resp2.json()["task"]["id"]

    deadline = time.time() + 2
    while time.time() < deadline:
        t1 = (await client_with_worker.get(f"/api/v1/tasks/{task1_id}")).json()
        t2 = (await client_with_worker.get(f"/api/v1/tasks/{task2_id}")).json()
        statuses = {t1["status"], t2["status"]}
        if "running" in statuses and "pending" in statuses:
            return
        await asyncio.sleep(0.05)

    pytest.fail("Did not observe per-user concurrency limit")
