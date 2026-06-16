import hmac
from typing import Any

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.config import settings
from app.core.database import async_session_factory
from app.services.mcp_tool_registry import McpToolRegistry


def verify_mcp_token(authorization_header: str | None) -> bool:
    if not authorization_header:
        return False
    scheme, _, token = authorization_header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return False
    return hmac.compare_digest(token, settings.mcp_api_token)


class McpBearerAuthMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = {
            key.decode("latin-1").lower(): value.decode("latin-1")
            for key, value in scope.get("headers", [])
        }
        if not verify_mcp_token(headers.get("authorization")):
            response = JSONResponse(
                {"detail": "Invalid MCP bearer token"},
                status_code=401,
                headers={"WWW-Authenticate": "Bearer"},
            )
            await response(scope, receive, send)
            return

        await self.app(scope, receive, send)


def _create_mcp_server():
    from mcp.server.fastmcp import FastMCP
    from mcp.server.transport_security import TransportSecuritySettings

    transport_security = TransportSecuritySettings(
        enable_dns_rebinding_protection=True,
        allowed_hosts=settings.mcp_allowed_hosts_list,
        allowed_origins=settings.mcp_allowed_origins_list,
    )

    mcp = FastMCP(
        "Motion Nova Analytics",
        instructions="Read-only analytics tools over Motion Nova AnalyticsService.",
        stateless_http=True,
        json_response=True,
        streamable_http_path="/",
        transport_security=transport_security,
    )

    @mcp.tool(name="get_business_overview")
    async def get_business_overview(
        from_date: str | None = None,
        to_date: str | None = None,
        branch_id: str | None = None,
    ) -> dict[str, Any]:
        """Revenue, expenses, profit, visits and active subscriptions for a period."""
        async with async_session_factory() as session:
            return await McpToolRegistry(session).call(
                "get_business_overview",
                {"from": from_date, "to": to_date, "branch_id": branch_id},
            )

    @mcp.tool(name="get_attendance_analysis")
    async def get_attendance_analysis(
        from_date: str | None = None,
        to_date: str | None = None,
        branch_id: str | None = None,
    ) -> dict[str, Any]:
        """Attendance totals, unique visitors, daily buckets and peak-hour buckets."""
        async with async_session_factory() as session:
            return await McpToolRegistry(session).call(
                "get_attendance_analysis",
                {"from": from_date, "to": to_date, "branch_id": branch_id},
            )

    @mcp.tool(name="get_class_occupancy")
    async def get_class_occupancy(
        from_date: str | None = None,
        to_date: str | None = None,
        branch_id: str | None = None,
    ) -> list[dict[str, Any]]:
        """Booked seats and occupancy percentage for classes in a period."""
        async with async_session_factory() as session:
            return await McpToolRegistry(session).call(
                "get_class_occupancy",
                {"from": from_date, "to": to_date, "branch_id": branch_id},
            )

    @mcp.tool(name="compare_periods")
    async def compare_periods(
        metric: str,
        from_date: str | None = None,
        to_date: str | None = None,
        branch_id: str | None = None,
    ) -> dict[str, Any]:
        """Compare a metric with the previous equal-length period."""
        async with async_session_factory() as session:
            return await McpToolRegistry(session).call(
                "compare_periods",
                {"metric": metric, "from": from_date, "to": to_date, "branch_id": branch_id},
            )

    @mcp.tool(name="compare_branches")
    async def compare_branches(
        metric: str,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> list[dict[str, Any]]:
        """Compare all branches by one metric for a period."""
        async with async_session_factory() as session:
            return await McpToolRegistry(session).call(
                "compare_branches",
                {"metric": metric, "from": from_date, "to": to_date},
            )

    return mcp


motion_mcp = _create_mcp_server()
motion_mcp_asgi_app = McpBearerAuthMiddleware(motion_mcp.streamable_http_app())
