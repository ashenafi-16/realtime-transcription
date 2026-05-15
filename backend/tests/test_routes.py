import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import init_db, engine, Base


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    """Create tables before each test, drop after."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ──── Health ────

@pytest.mark.asyncio
async def test_health(client):
    res = await client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_root(client):
    res = await client.get("/")
    assert res.status_code == 200


# ──── Sessions CRUD ────

@pytest.mark.asyncio
async def test_list_sessions_empty(client):
    res = await client.get("/api/sessions")
    assert res.status_code == 200
    assert res.json() == []


@pytest.mark.asyncio
async def test_session_not_found(client):
    res = await client.get("/api/sessions/999")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_delete_not_found(client):
    res = await client.delete("/api/sessions/999")
    assert res.status_code == 404


# ──── Settings ────

@pytest.mark.asyncio
async def test_get_settings(client):
    res = await client.get("/api/settings")
    assert res.status_code == 200
    data = res.json()
    assert "whisperModel" in data
    assert "language" in data


@pytest.mark.asyncio
async def test_update_settings(client):
    res = await client.put("/api/settings", json={"whisperModel": "small", "language": "es"})
    assert res.status_code == 200
    data = res.json()
    assert data["settings"]["whisperModel"] == "small"
    assert data["settings"]["language"] == "es"


# ──── Analytics ────

@pytest.mark.asyncio
async def test_analytics_empty(client):
    res = await client.get("/api/analytics")
    assert res.status_code == 200
    data = res.json()
    assert data["total_sessions"] == 0
    assert data["total_chunks"] == 0


# ──── Re-summarize ────

@pytest.mark.asyncio
async def test_resummarize_no_transcript(client):
    res = await client.post("/api/resummarize", json={"transcript": "", "format": "meeting_notes"})
    assert res.status_code == 400


# ──── File Upload ────

@pytest.mark.asyncio
async def test_upload_wrong_type(client):
    res = await client.post(
        "/api/transcribe-file",
        files={"file": ("test.txt", b"hello world", "text/plain")}
    )
    assert res.status_code == 400
