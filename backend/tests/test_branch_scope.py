import pytest
from fastapi import HTTPException

from app.models.user import UserRole
from app.schemas.branch import StaffBranchAssignmentCreate
from app.services.branch_scope import ensure_branch_role, resolve_branch_scope
from app.services.branch_service import BranchService
from tests.factories import add_branch, add_user, assign_staff


@pytest.mark.asyncio
async def test_owner_and_client_can_select_active_branches(db_session):
    first = await add_branch(db_session, "Центр")
    second = await add_branch(db_session, "Поділ")
    owner = await add_user(db_session, "owner@example.com", UserRole.OWNER)
    client = await add_user(db_session, "client@example.com")
    await db_session.commit()

    owner_scope = await resolve_branch_scope(db_session, owner, None)
    client_scope = await resolve_branch_scope(db_session, client, second.id)

    assert owner_scope.is_network_wide is True
    assert owner_scope.allowed_branch_ids == frozenset({first.id, second.id})
    assert client_scope.selected_branch_id == second.id


@pytest.mark.asyncio
async def test_staff_scope_uses_assignments_and_requires_selection_for_multiple_branches(db_session):
    first = await add_branch(db_session, "Центр")
    second = await add_branch(db_session, "Поділ")
    admin = await add_user(db_session, "admin@example.com", UserRole.ADMIN)
    await assign_staff(db_session, admin, first)
    await assign_staff(db_session, admin, second)
    await db_session.commit()

    with pytest.raises(HTTPException) as error:
        await resolve_branch_scope(db_session, admin, None)
    assert error.value.status_code == 400

    scope = await resolve_branch_scope(db_session, admin, first.id)
    ensure_branch_role(scope, admin, first.id, UserRole.ADMIN)
    assert scope.selected_branch_id == first.id


@pytest.mark.asyncio
async def test_assignment_keeps_role_on_user_and_is_idempotent(db_session):
    branch = await add_branch(db_session)
    trainer = await add_user(db_session, "trainer@example.com", UserRole.TRAINER)
    client = await add_user(db_session, "client@example.com")
    await db_session.commit()
    service = BranchService(db_session)

    assignment = await service.assign_staff(branch.id, StaffBranchAssignmentCreate(user_id=trainer.id))
    duplicate = await service.assign_staff(branch.id, StaffBranchAssignmentCreate(user_id=trainer.id))
    assert assignment.id == duplicate.id
    assert assignment.user_id == trainer.id

    with pytest.raises(HTTPException) as error:
        await service.assign_staff(branch.id, StaffBranchAssignmentCreate(user_id=client.id))
    assert error.value.status_code == 400
