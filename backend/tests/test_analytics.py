import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest

from app.models.payment import Payment
from app.services.analytics_service import AnalyticsMetric, AnalyticsService
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


async def _seed_money(db_session, branch, client, *, revenue: str, expense: str, when: datetime):
    plan = await add_plan(db_session)
    subscription = await add_subscription(db_session, client, plan)
    payment = Payment(
        subscription_id=subscription.id,
        branch_id=branch.id,
        amount=Decimal(revenue),
        currency="UAH",
        status="SUCCESS",
        method="CARD",
    )
    payment.created_at = when
    db_session.add(payment)
    owner = await add_user(db_session, f"owner-{uuid.uuid4().hex[:8]}@example.com")
    await add_expense(db_session, branch, owner, amount=Decimal(expense), paid_at=when)


@pytest.mark.asyncio
async def test_overview_profit_is_revenue_minus_expenses(db_session):
    branch = await add_branch(db_session, "Центр")
    client = await add_user(db_session, "client@example.com")
    now = datetime.now(UTC)
    await _seed_money(db_session, branch, client, revenue="1000.00", expense="400.00", when=now - timedelta(days=1))
    await add_visit(db_session, client, branch, checked_in_at=now - timedelta(days=1))
    await db_session.commit()

    overview = await AnalyticsService(db_session).get_overview(
        now - timedelta(days=7), now + timedelta(days=1), branch.id
    )
    assert overview.revenue == 1000.0
    assert overview.expenses == 400.0
    assert overview.profit == 600.0
    assert overview.visits == 1
    assert overview.active_subscriptions == 1


@pytest.mark.asyncio
async def test_attendance_and_peak_hours_bucket_visits(db_session):
    branch = await add_branch(db_session)
    client = await add_user(db_session, "client@example.com")
    base = datetime(2026, 6, 1, 6, 0, tzinfo=UTC)
    await add_visit(db_session, client, branch, checked_in_at=base)
    await add_visit(db_session, client, branch, checked_in_at=base + timedelta(minutes=30))
    await add_visit(db_session, client, branch, checked_in_at=base + timedelta(days=1, hours=9))
    await db_session.commit()
    service = AnalyticsService(db_session)
    window_start = base - timedelta(days=1)
    window_end = base + timedelta(days=2)

    attendance = await service.get_attendance(window_start, window_end, branch.id)
    assert attendance.total == 3
    assert attendance.unique_visitors == 1
    assert len(attendance.per_day) == 2

    peak = await service.get_peak_hours(window_start, window_end, branch.id)
    assert len(peak) == 24
    nine = next(point for point in peak if point.hour == 9)
    assert nine.visits == 2


@pytest.mark.asyncio
async def test_class_occupancy_reports_booked_ratio(db_session):
    branch = await add_branch(db_session)
    trainer = await add_user(db_session, "trainer@example.com")
    client = await add_user(db_session, "client@example.com")
    start = datetime.now(UTC) + timedelta(days=1)
    workout_class = await add_class(db_session, trainer, branch, start_time=start, capacity=4)
    await add_booking(db_session, client, workout_class)
    await db_session.commit()

    rows = await AnalyticsService(db_session).get_class_occupancy(
        start - timedelta(days=1), start + timedelta(days=1), branch.id
    )
    assert len(rows) == 1
    assert rows[0].capacity == 4
    assert rows[0].booked == 1
    assert rows[0].occupancy_pct == 25.0


@pytest.mark.asyncio
async def test_compare_branches_ranks_by_metric(db_session):
    main = await add_branch(db_session, "Центр")
    north = await add_branch(db_session, "Поділ")
    client = await add_user(db_session, "client@example.com")
    now = datetime.now(UTC)
    await _seed_money(db_session, main, client, revenue="500.00", expense="100.00", when=now - timedelta(days=1))
    other = await add_user(db_session, "client2@example.com")
    await _seed_money(db_session, north, other, revenue="900.00", expense="100.00", when=now - timedelta(days=1))
    await db_session.commit()

    rows = await AnalyticsService(db_session).compare_branches(
        AnalyticsMetric.REVENUE, now - timedelta(days=7), now + timedelta(days=1)
    )
    assert [row.branch_id for row in rows] == [north.id, main.id]
    assert rows[0].value == 900.0


@pytest.mark.asyncio
async def test_compare_periods_computes_delta_vs_previous_window(db_session):
    branch = await add_branch(db_session)
    client = await add_user(db_session, "client@example.com")
    now = datetime.now(UTC)
    await _seed_money(db_session, branch, client, revenue="1000.00", expense="0.00", when=now - timedelta(days=1))
    other = await add_user(db_session, "client2@example.com")
    await _seed_money(db_session, branch, other, revenue="400.00", expense="0.00", when=now - timedelta(days=11))
    await db_session.commit()

    report = await AnalyticsService(db_session).compare_periods(
        AnalyticsMetric.REVENUE, now - timedelta(days=10), now, branch.id
    )
    assert report.current == 1000.0
    assert report.previous == 400.0
    assert report.delta == 600.0
    assert report.delta_pct == 150.0
