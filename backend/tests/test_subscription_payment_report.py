from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest

from app.models.payment import Payment
from app.models.subscription import SubscriptionStatus
from app.services.analytics_service import AnalyticsService
from app.services.payment_service import PaymentService
from app.services.subscription_service import SubscriptionService
from tests.factories import add_branch, add_plan, add_subscription, add_user


@pytest.mark.asyncio
async def test_purchase_creates_network_subscription_and_branch_payment(db_session):
    branch = await add_branch(db_session)
    client = await add_user(db_session, "client@example.com")
    plan = await add_plan(db_session)
    await db_session.commit()

    subscription = await SubscriptionService(db_session).purchase(client.id, plan_id=plan.id, payment_branch_id=branch.id)
    payments = await PaymentService(db_session).list_for_user(client.id)

    assert subscription.plan_id == plan.id
    assert len(payments) == 1
    assert payments[0].branch_id == branch.id
    assert payments[0].amount == Decimal("1200.00")


@pytest.mark.asyncio
async def test_freeze_extends_subscription(db_session):
    branch = await add_branch(db_session)
    client = await add_user(db_session, "client@example.com")
    plan = await add_plan(db_session)
    await db_session.commit()
    service = SubscriptionService(db_session)
    subscription = await service.purchase(client.id, plan_id=plan.id, payment_branch_id=branch.id)
    before = subscription.end_date

    frozen = await service.freeze(client.id, subscription.id, 7)
    assert frozen.status.value == "FROZEN"
    assert frozen.frozen_until is not None
    assert frozen.end_date.replace(tzinfo=UTC) == before.replace(tzinfo=UTC) + timedelta(days=7)


@pytest.mark.asyncio
async def test_elapsed_freeze_reactivates_on_next_read_without_worker(db_session):
    branch = await add_branch(db_session)
    client = await add_user(db_session, "client@example.com")
    plan = await add_plan(db_session)
    await db_session.commit()
    service = SubscriptionService(db_session)
    subscription = await service.purchase(client.id, plan_id=plan.id, payment_branch_id=branch.id)

    subscription.status = SubscriptionStatus.FROZEN
    subscription.frozen_until = datetime.now(UTC) - timedelta(minutes=1)
    await db_session.commit()

    memberships = await service.list_for_user(client.id)
    assert memberships[0].status == SubscriptionStatus.ACTIVE
    assert memberships[0].frozen_until is None


@pytest.mark.asyncio
async def test_unfreeze_early_recalculates_end_date(db_session):
    branch = await add_branch(db_session)
    client = await add_user(db_session, "client@example.com")
    plan = await add_plan(db_session)
    await db_session.commit()
    service = SubscriptionService(db_session)
    subscription = await service.purchase(client.id, plan_id=plan.id, payment_branch_id=branch.id)
    original_end_date = subscription.end_date

    frozen = await service.freeze(client.id, subscription.id, 10)
    assert frozen.status == SubscriptionStatus.FROZEN

    frozen.frozen_until = datetime.now(UTC) + timedelta(days=8)
    await db_session.commit()

    unfrozen = await service.unfreeze(client.id, subscription.id)
    assert unfrozen.status == SubscriptionStatus.ACTIVE
    assert unfrozen.frozen_until is None
    assert abs((unfrozen.end_date - (original_end_date + timedelta(days=2))).total_seconds()) < 10


@pytest.mark.asyncio
async def test_revenue_report_filters_branch(db_session):
    first = await add_branch(db_session, "Центр")
    second = await add_branch(db_session, "Поділ")
    client = await add_user(db_session, "client@example.com")
    plan = await add_plan(db_session)
    subscription = await add_subscription(db_session, client, plan)
    now = datetime.now(UTC)
    db_session.add_all([
        Payment(subscription_id=subscription.id, branch_id=first.id, amount=Decimal("100.00"), currency="UAH", status="SUCCESS", method="CARD"),
        Payment(subscription_id=subscription.id, branch_id=second.id, amount=Decimal("300.00"), currency="UAH", status="SUCCESS", method="CASH"),
    ])
    await db_session.commit()

    revenue = await AnalyticsService(db_session).get_revenue(
        now - timedelta(days=1), now + timedelta(days=1), first.id
    )
    assert revenue == 100.0


def test_removed_duplicate_fields_are_absent():
    assert not hasattr(Payment, "booking_class_id")
    assert not hasattr(Payment, "purpose")
