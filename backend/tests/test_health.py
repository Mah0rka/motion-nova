import pytest

from app.api.routes.health import live


@pytest.mark.asyncio
async def test_live_probe():
    assert await live() == {"status": "ok"}
