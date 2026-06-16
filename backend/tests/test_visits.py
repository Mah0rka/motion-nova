import pytest
from fastapi import HTTPException

from app.models.user import UserRole
from app.schemas.visit import VisitCheckInRequest
from app.services.branch_scope import resolve_branch_scope
from app.services.visit_service import VisitService
from tests.factories import (
    add_booking,
    add_branch,
    add_class,
    add_user,
    assign_staff,
)


async def _admin_scope(db_session, admin, branch):
    return await resolve_branch_scope(db_session, admin, branch.id)


@pytest.mark.asyncio
async def test_check_in_without_booking_creates_active_visit(db_session):
    branch = await add_branch(db_session, "Центр")
    admin = await add_user(db_session, "admin@example.com", UserRole.ADMIN)
    client = await add_user(db_session, "client@example.com")
    await assign_staff(db_session, admin, branch)
    await db_session.commit()

    scope = await _admin_scope(db_session, admin, branch)
    visit = await VisitService(db_session).check_in(
        VisitCheckInRequest(user_id=client.id), admin, scope
    )

    assert visit.branch_id == branch.id
    assert visit.checked_in_by_id == admin.id
    assert visit.checked_out_at is None
    assert visit.workout_class is None


@pytest.mark.asyncio
async def test_repeated_check_in_is_blocked(db_session):
    branch = await add_branch(db_session)
    admin = await add_user(db_session, "admin@example.com", UserRole.ADMIN)
    client = await add_user(db_session, "client@example.com")
    await assign_staff(db_session, admin, branch)
    await db_session.commit()
    scope = await _admin_scope(db_session, admin, branch)
    service = VisitService(db_session)

    await service.check_in(VisitCheckInRequest(user_id=client.id), admin, scope)
    with pytest.raises(HTTPException) as error:
        await service.check_in(VisitCheckInRequest(user_id=client.id), admin, scope)
    assert error.value.status_code == 409


@pytest.mark.asyncio
async def test_check_in_conflict_is_branch_scoped(db_session):
    main = await add_branch(db_session, "Центр")
    north = await add_branch(db_session, "Поділ")
    owner = await add_user(db_session, "owner@example.com", UserRole.OWNER)
    client = await add_user(db_session, "client@example.com")
    await db_session.commit()
    service = VisitService(db_session)

    main_scope = await resolve_branch_scope(db_session, owner, main.id)
    north_scope = await resolve_branch_scope(db_session, owner, north.id)

    await service.check_in(VisitCheckInRequest(user_id=client.id), owner, main_scope)
    visit_north = await service.check_in(
        VisitCheckInRequest(user_id=client.id), owner, north_scope
    )
    assert visit_north.branch_id == north.id

    with pytest.raises(HTTPException) as error:
        await service.check_in(VisitCheckInRequest(user_id=client.id), owner, north_scope)
    assert error.value.status_code == 409


@pytest.mark.asyncio
async def test_check_out_then_check_in_again_is_allowed(db_session):
    branch = await add_branch(db_session)
    admin = await add_user(db_session, "admin@example.com", UserRole.ADMIN)
    client = await add_user(db_session, "client@example.com")
    await assign_staff(db_session, admin, branch)
    await db_session.commit()
    scope = await _admin_scope(db_session, admin, branch)
    service = VisitService(db_session)

    visit = await service.check_in(VisitCheckInRequest(user_id=client.id), admin, scope)
    completed = await service.check_out(visit.id, admin, scope)
    assert completed.checked_out_at is not None

    with pytest.raises(HTTPException) as error:
        await service.check_out(visit.id, admin, scope)
    assert error.value.status_code == 409

    again = await service.check_in(VisitCheckInRequest(user_id=client.id), admin, scope)
    assert again.id != visit.id


@pytest.mark.asyncio
async def test_check_in_to_inactive_branch_is_rejected(db_session):
    active = await add_branch(db_session, "Активна")
    inactive = await add_branch(db_session, "Закрита", active=False)
    owner = await add_user(db_session, "owner@example.com", UserRole.OWNER)
    client = await add_user(db_session, "client@example.com")
    await db_session.commit()

    with pytest.raises(HTTPException) as error:
        await resolve_branch_scope(db_session, owner, inactive.id)
    assert error.value.status_code == 404

    scope = await resolve_branch_scope(db_session, owner, active.id)
    visit = await VisitService(db_session).check_in(
        VisitCheckInRequest(user_id=client.id), owner, scope
    )
    assert visit.branch_id == active.id


@pytest.mark.asyncio
async def test_admin_cannot_check_in_outside_assigned_branch(db_session):
    home = await add_branch(db_session, "Центр")
    other = await add_branch(db_session, "Поділ")
    admin = await add_user(db_session, "admin@example.com", UserRole.ADMIN)
    await add_user(db_session, "client@example.com")
    await assign_staff(db_session, admin, home)
    await db_session.commit()

    with pytest.raises(HTTPException) as error:
        await resolve_branch_scope(db_session, admin, other.id)
    assert error.value.status_code == 403


@pytest.mark.asyncio
async def test_check_in_with_booking_links_class(db_session):
    branch = await add_branch(db_session)
    admin = await add_user(db_session, "admin@example.com", UserRole.ADMIN)
    trainer = await add_user(db_session, "trainer@example.com", UserRole.TRAINER)
    client = await add_user(db_session, "client@example.com")
    await assign_staff(db_session, admin, branch)
    workout_class = await add_class(db_session, trainer, branch)
    booking = await add_booking(db_session, client, workout_class)
    await db_session.commit()
    scope = await _admin_scope(db_session, admin, branch)

    visit = await VisitService(db_session).check_in(
        VisitCheckInRequest(user_id=client.id, booking_id=booking.id), admin, scope
    )
    assert visit.booking_id == booking.id
    assert visit.workout_class is not None
    assert visit.workout_class.id == workout_class.id


@pytest.mark.asyncio
async def test_booking_from_other_user_is_rejected(db_session):
    branch = await add_branch(db_session)
    admin = await add_user(db_session, "admin@example.com", UserRole.ADMIN)
    trainer = await add_user(db_session, "trainer@example.com", UserRole.TRAINER)
    client = await add_user(db_session, "client@example.com")
    other = await add_user(db_session, "other@example.com")
    await assign_staff(db_session, admin, branch)
    workout_class = await add_class(db_session, trainer, branch)
    booking = await add_booking(db_session, other, workout_class)
    await db_session.commit()
    scope = await _admin_scope(db_session, admin, branch)

    with pytest.raises(HTTPException) as error:
        await VisitService(db_session).check_in(
            VisitCheckInRequest(user_id=client.id, booking_id=booking.id), admin, scope
        )
    assert error.value.status_code == 400


@pytest.mark.asyncio
async def test_active_and_history_are_branch_scoped(db_session):
    main = await add_branch(db_session, "Центр")
    north = await add_branch(db_session, "Поділ")
    owner = await add_user(db_session, "owner@example.com", UserRole.OWNER)
    client_a = await add_user(db_session, "a@example.com")
    client_b = await add_user(db_session, "b@example.com")
    await db_session.commit()
    service = VisitService(db_session)

    main_scope = await resolve_branch_scope(db_session, owner, main.id)
    north_scope = await resolve_branch_scope(db_session, owner, north.id)
    await service.check_in(VisitCheckInRequest(user_id=client_a.id), owner, main_scope)
    await service.check_in(VisitCheckInRequest(user_id=client_b.id), owner, north_scope)

    active_main = await service.list_active(owner, main_scope)
    assert {visit.branch_id for visit in active_main} == {main.id}

    network_scope = await resolve_branch_scope(db_session, owner, None)
    history_all = await service.list_history(owner, network_scope)
    assert len(history_all) == 2
