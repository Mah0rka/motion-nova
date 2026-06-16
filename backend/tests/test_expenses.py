from datetime import UTC, datetime
from decimal import Decimal

import pytest
from fastapi import HTTPException

from app.models.expense import ExpenseCategory
from app.models.user import UserRole
from app.schemas.expense import ExpenseCreate, ExpenseUpdate
from app.services.branch_scope import resolve_branch_scope
from app.services.expense_service import ExpenseService
from tests.factories import add_branch, add_user, assign_staff


def _payload(category: ExpenseCategory = ExpenseCategory.RENT, amount: str = "1000.00") -> ExpenseCreate:
    return ExpenseCreate(
        category=category,
        amount=Decimal(amount),
        paid_at=datetime.now(UTC),
        description="Тест",
    )


@pytest.mark.asyncio
async def test_admin_creates_expense_in_assigned_branch(db_session):
    branch = await add_branch(db_session, "Центр")
    admin = await add_user(db_session, "admin@example.com", UserRole.ADMIN)
    await assign_staff(db_session, admin, branch)
    await db_session.commit()

    scope = await resolve_branch_scope(db_session, admin, branch.id)
    expense = await ExpenseService(db_session).create(_payload(), admin, scope)

    assert expense.branch_id == branch.id
    assert expense.created_by_id == admin.id
    assert expense.category == ExpenseCategory.RENT


@pytest.mark.asyncio
async def test_admin_cannot_touch_other_branch_expense(db_session):
    home = await add_branch(db_session, "Центр")
    other = await add_branch(db_session, "Поділ")
    owner = await add_user(db_session, "owner@example.com", UserRole.OWNER)
    admin = await add_user(db_session, "admin@example.com", UserRole.ADMIN)
    await assign_staff(db_session, admin, home)
    await db_session.commit()

    owner_scope = await resolve_branch_scope(db_session, owner, other.id)
    foreign = await ExpenseService(db_session).create(_payload(), owner, owner_scope)

    admin_scope = await resolve_branch_scope(db_session, admin, home.id)
    with pytest.raises(HTTPException) as error:
        await ExpenseService(db_session).update(
            foreign.id, ExpenseUpdate(amount=Decimal("50.00")), admin, admin_scope
        )
    assert error.value.status_code == 403


@pytest.mark.asyncio
async def test_owner_lists_and_deletes_across_branches(db_session):
    main = await add_branch(db_session, "Центр")
    north = await add_branch(db_session, "Поділ")
    owner = await add_user(db_session, "owner@example.com", UserRole.OWNER)
    await db_session.commit()
    service = ExpenseService(db_session)

    main_scope = await resolve_branch_scope(db_session, owner, main.id)
    north_scope = await resolve_branch_scope(db_session, owner, north.id)
    await service.create(_payload(amount="100.00"), owner, main_scope)
    north_expense = await service.create(_payload(ExpenseCategory.MARKETING, "200.00"), owner, north_scope)

    network_scope = await resolve_branch_scope(db_session, owner, None)
    all_expenses = await service.list(owner, network_scope)
    assert len(all_expenses) == 2

    main_only = await service.list(owner, main_scope)
    assert {item.branch_id for item in main_only} == {main.id}

    await service.delete(north_expense.id, owner, north_scope)
    assert len(await service.list(owner, network_scope)) == 1
