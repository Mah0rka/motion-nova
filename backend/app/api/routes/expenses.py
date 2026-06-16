from datetime import datetime

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_branch_scope, get_current_user, get_db_session
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseRead, ExpenseUpdate
from app.services.branch_scope import BranchScope
from app.services.expense_service import ExpenseService

router = APIRouter()


@router.post("", response_model=ExpenseRead, status_code=status.HTTP_201_CREATED)
async def create_expense(
    payload: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    branch_scope: BranchScope = Depends(get_branch_scope),
) -> ExpenseRead:
    return ExpenseRead.model_validate(
        await ExpenseService(db).create(payload, current_user, branch_scope)
    )


@router.get("", response_model=list[ExpenseRead])
async def list_expenses(
    start_datetime: datetime | None = Query(default=None, alias="from"),
    end_datetime: datetime | None = Query(default=None, alias="to"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    branch_scope: BranchScope = Depends(get_branch_scope),
) -> list[ExpenseRead]:
    expenses = await ExpenseService(db).list(
        current_user, branch_scope, start_datetime, end_datetime
    )
    return [ExpenseRead.model_validate(item) for item in expenses]


@router.patch("/{expense_id}", response_model=ExpenseRead)
async def update_expense(
    expense_id: str,
    payload: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    branch_scope: BranchScope = Depends(get_branch_scope),
) -> ExpenseRead:
    return ExpenseRead.model_validate(
        await ExpenseService(db).update(expense_id, payload, current_user, branch_scope)
    )


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    branch_scope: BranchScope = Depends(get_branch_scope),
) -> Response:
    await ExpenseService(db).delete(expense_id, current_user, branch_scope)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
