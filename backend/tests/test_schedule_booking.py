from datetime import UTC, datetime, timedelta

import pytest
from fastapi import HTTPException

from app.models.booking import BookingStatus
from app.models.user import UserRole
from app.models.workout_class import WorkoutType
from app.schemas.schedule import ScheduleCompleteRequest, ScheduleCreate
from app.services.booking_service import BookingService
from app.services.branch_scope import BranchScope
from app.services.schedule_service import ScheduleService
from tests.factories import add_booking, add_branch, add_class, add_plan, add_subscription, add_user, assign_staff


def scope(branch_id: str) -> BranchScope:
    return BranchScope(selected_branch_id=branch_id, allowed_branch_ids=frozenset({branch_id}), is_network_wide=False)


@pytest.mark.asyncio
async def test_admin_creates_single_class_for_assigned_trainer(db_session):
    branch = await add_branch(db_session)
    admin = await add_user(db_session, "admin@example.com", UserRole.ADMIN)
    trainer = await add_user(db_session, "trainer@example.com", UserRole.TRAINER)
    await assign_staff(db_session, admin, branch)
    await assign_staff(db_session, trainer, branch)
    await db_session.commit()
    start = (datetime.now(UTC) + timedelta(days=2)).replace(hour=10, minute=0, second=0, microsecond=0)

    created = await ScheduleService(db_session).create_schedule(
        ScheduleCreate(title=" Functional ", type=WorkoutType.GROUP, startTime=start, endTime=start + timedelta(hours=1), capacity=12, trainerId=trainer.id),
        admin,
        scope(branch.id),
    )

    assert created.title == "Functional"
    assert created.branch_id == branch.id
    assert created.trainer_id == trainer.id


@pytest.mark.asyncio
async def test_schedule_rejects_trainer_without_branch_assignment(db_session):
    branch = await add_branch(db_session)
    admin = await add_user(db_session, "admin@example.com", UserRole.ADMIN)
    trainer = await add_user(db_session, "trainer@example.com", UserRole.TRAINER)
    await assign_staff(db_session, admin, branch)
    await db_session.commit()
    start = (datetime.now(UTC) + timedelta(days=2)).replace(hour=10, minute=0, second=0, microsecond=0)

    with pytest.raises(HTTPException) as error:
        await ScheduleService(db_session).create_schedule(
            ScheduleCreate(title="Functional", type=WorkoutType.GROUP, startTime=start, endTime=start + timedelta(hours=1), capacity=12, trainerId=trainer.id),
            admin,
            scope(branch.id),
        )
    assert error.value.status_code == 400


@pytest.mark.asyncio
async def test_booking_consumes_and_cancel_restores_visit(db_session):
    branch = await add_branch(db_session)
    client = await add_user(db_session, "client@example.com")
    trainer = await add_user(db_session, "trainer@example.com", UserRole.TRAINER)
    plan = await add_plan(db_session)
    subscription = await add_subscription(db_session, client, plan, remaining_visits=3)
    workout_class = await add_class(db_session, trainer, branch)
    await db_session.commit()
    service = BookingService(db_session)

    booking = await service.create_booking(client.id, workout_class.id)
    assert subscription.remaining_visits == 2
    cancelled = await service.cancel_booking(client.id, booking.id)
    assert cancelled.status == BookingStatus.CANCELLED
    assert subscription.remaining_visits == 3


@pytest.mark.asyncio
async def test_booking_requires_active_subscription(db_session):
    branch = await add_branch(db_session)
    client = await add_user(db_session, "client@example.com")
    trainer = await add_user(db_session, "trainer@example.com", UserRole.TRAINER)
    workout_class = await add_class(db_session, trainer, branch)
    await db_session.commit()

    with pytest.raises(HTTPException) as error:
        await BookingService(db_session).create_booking(client.id, workout_class.id)
    assert error.value.status_code == 400


@pytest.mark.asyncio
async def test_schedule_with_confirmed_booking_cannot_be_deleted(db_session):
    branch = await add_branch(db_session)
    owner = await add_user(db_session, "owner@example.com", UserRole.OWNER)
    trainer = await add_user(db_session, "trainer@example.com", UserRole.TRAINER)
    client = await add_user(db_session, "client@example.com")
    workout_class = await add_class(db_session, trainer, branch)
    await add_booking(db_session, client, workout_class)
    await db_session.commit()

    with pytest.raises(HTTPException) as error:
        await ScheduleService(db_session).delete_schedule(workout_class.id, owner)
    assert error.value.status_code == 400


@pytest.mark.asyncio
async def test_trainer_can_confirm_completed_own_class(db_session):
    branch = await add_branch(db_session)
    trainer = await add_user(db_session, "trainer@example.com", UserRole.TRAINER)
    workout_class = await add_class(db_session, trainer, branch, start_time=datetime.now(UTC) - timedelta(hours=2))
    await db_session.commit()

    result = await ScheduleService(db_session).confirm_completion(workout_class.id, ScheduleCompleteRequest(comment="Done"), trainer)
    assert result.completed_at is not None
    assert result.completion_comment == "Done"
