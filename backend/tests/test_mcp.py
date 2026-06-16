from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest

from app.mcp_server import verify_mcp_token
from app.models.payment import Payment
from app.models.user import UserRole
from app.services.analytics_service import AnalyticsMetric, AnalyticsService
from app.services.mcp_tool_registry import McpToolRegistry, ToolValidationError
from tests.factories import (
    add_booking,
    add_branch,
    add_class,
    add_expense,
    add_plan,
    add_subscription,
    add_user,
    add_visit,
)


async def _seed_analytics_data(db_session):
    branch = await add_branch(db_session, "Центр")
    second = await add_branch(db_session, "Поділ")
    owner = await add_user(db_session, "owner@example.com", UserRole.OWNER)
    trainer = await add_user(db_session, "trainer@example.com", UserRole.TRAINER)
    client = await add_user(db_session, "client@example.com")
    other = await add_user(db_session, "other@example.com")
    plan = await add_plan(db_session)
    subscription = await add_subscription(db_session, client, plan)
    other_subscription = await add_subscription(db_session, other, plan)
    now = datetime.now(UTC)
    first_class = await add_class(
        db_session, trainer, branch, start_time=now - timedelta(days=1), capacity=4
    )
    await add_booking(db_session, client, first_class)
    db_session.add_all([
        Payment(
            subscription_id=subscription.id,
            branch_id=branch.id,
            amount=Decimal("1000.00"),
            currency="UAH",
            status="SUCCESS",
            method="CARD",
            created_at=now - timedelta(days=1),
        ),
        Payment(
            subscription_id=other_subscription.id,
            branch_id=second.id,
            amount=Decimal("400.00"),
            currency="UAH",
            status="SUCCESS",
            method="CARD",
            created_at=now - timedelta(days=1),
        ),
    ])
    await add_expense(db_session, branch, owner, amount=Decimal("250.00"), paid_at=now - timedelta(days=1))
    await add_visit(db_session, client, branch, checked_in_at=now - timedelta(days=1))
    await db_session.commit()
    return branch, second, now


def test_mcp_token_verifier_accepts_only_configured_bearer_token(monkeypatch):
    monkeypatch.setattr("app.mcp_server.settings.mcp_api_token", "secret-token")

    assert verify_mcp_token("Bearer secret-token") is True
    assert verify_mcp_token("Bearer wrong-token") is False
    assert verify_mcp_token(None) is False
    assert verify_mcp_token("Basic secret-token") is False


@pytest.mark.asyncio
async def test_mcp_tools_match_analytics_service(db_session):
    branch, _, now = await _seed_analytics_data(db_session)
    start = (now - timedelta(days=7)).isoformat()
    end = (now + timedelta(days=1)).isoformat()
    registry = McpToolRegistry(db_session)
    analytics = AnalyticsService(db_session)

    overview = await registry.call("get_business_overview", {"from": start, "to": end, "branch_id": branch.id})
    direct_overview = await analytics.get_overview(now - timedelta(days=7), now + timedelta(days=1), branch.id)
    assert overview["profit"] == direct_overview.profit

    attendance = await registry.call("get_attendance_analysis", {"from": start, "to": end, "branch_id": branch.id})
    direct_attendance = await analytics.get_attendance(now - timedelta(days=7), now + timedelta(days=1), branch.id)
    assert attendance["attendance"]["total"] == direct_attendance.total

    occupancy = await registry.call("get_class_occupancy", {"from": start, "to": end, "branch_id": branch.id})
    direct_occupancy = await analytics.get_class_occupancy(now - timedelta(days=7), now + timedelta(days=1), branch.id)
    assert occupancy[0]["occupancy_pct"] == direct_occupancy[0].occupancy_pct

    periods = await registry.call(
        "compare_periods",
        {"metric": "PROFIT", "from": start, "to": end, "branch_id": branch.id},
    )
    direct_periods = await analytics.compare_periods(
        AnalyticsMetric.PROFIT, now - timedelta(days=7), now + timedelta(days=1), branch.id
    )
    assert periods["current"] == direct_periods.current

    branches = await registry.call("compare_branches", {"metric": "REVENUE", "from": start, "to": end})
    direct_branches = await analytics.compare_branches(
        AnalyticsMetric.REVENUE, now - timedelta(days=7), now + timedelta(days=1)
    )
    assert [row["branch_id"] for row in branches] == [row.branch_id for row in direct_branches]


@pytest.mark.asyncio
async def test_mcp_tools_reject_invalid_arguments(db_session):
    registry = McpToolRegistry(db_session)
    now = datetime.now(UTC)

    with pytest.raises(ToolValidationError):
        await registry.call("compare_periods", {"metric": "UNKNOWN"})

    with pytest.raises(ToolValidationError):
        await registry.call(
            "get_business_overview",
            {"from": now.isoformat(), "to": (now - timedelta(days=1)).isoformat()},
        )
