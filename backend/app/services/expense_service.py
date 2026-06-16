from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.branch import Branch
from app.models.expense import Expense
from app.models.user import User, UserRole
from app.repositories.expense_repository import ExpenseRepository
from app.schemas.expense import ExpenseCreate, ExpenseUpdate
from app.services.branch_scope import (
    BranchScope,
    ensure_branch_role,
    ensure_management_scope,
)


class ExpenseService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repository = ExpenseRepository(session)

    async def create(
        self,
        payload: ExpenseCreate,
        current_user: User,
        branch_scope: BranchScope,
    ) -> Expense:
        branch_id = branch_scope.require_selected_branch()
        ensure_branch_role(branch_scope, current_user, branch_id, UserRole.ADMIN)
        await self._ensure_branch_exists(branch_id)
        expense = Expense(
            branch_id=branch_id,
            category=payload.category,
            amount=payload.amount,
            paid_at=self._ensure_aware(payload.paid_at),
            description=payload.description.strip() if payload.description else None,
            created_by_id=current_user.id,
        )
        self.session.add(expense)
        await self.session.flush()
        await self.session.commit()
        created = await self.repository.get_by_id(expense.id)
        assert created is not None
        return created

    async def list(
        self,
        current_user: User,
        branch_scope: BranchScope,
        start_datetime: datetime | None = None,
        end_datetime: datetime | None = None,
    ) -> list[Expense]:
        branch_id = ensure_management_scope(branch_scope, current_user)
        return await self.repository.list(
            branch_id,
            self._ensure_aware(start_datetime) if start_datetime else None,
            self._ensure_aware(end_datetime) if end_datetime else None,
        )

    async def update(
        self,
        expense_id: str,
        payload: ExpenseUpdate,
        current_user: User,
        branch_scope: BranchScope,
    ) -> Expense:
        expense = await self._require_expense(expense_id)
        ensure_branch_role(branch_scope, current_user, expense.branch_id, UserRole.ADMIN)
        updates = payload.model_dump(exclude_unset=True)
        for field, value in updates.items():
            if field == "paid_at" and value is not None:
                value = self._ensure_aware(value)
            if field == "description" and isinstance(value, str):
                value = value.strip()
            setattr(expense, field, value)
        await self.session.commit()
        refreshed = await self.repository.get_by_id(expense.id)
        assert refreshed is not None
        return refreshed

    async def delete(
        self,
        expense_id: str,
        current_user: User,
        branch_scope: BranchScope,
    ) -> None:
        expense = await self._require_expense(expense_id)
        ensure_branch_role(branch_scope, current_user, expense.branch_id, UserRole.ADMIN)
        await self.session.delete(expense)
        await self.session.commit()

    async def _require_expense(self, expense_id: str) -> Expense:
        expense = await self.repository.get_by_id(expense_id)
        if not expense:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Витрату не знайдено")
        return expense

    async def _ensure_branch_exists(self, branch_id: str) -> None:
        branch = await self.session.get(Branch, branch_id)
        if branch is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Філію не знайдено")

    @staticmethod
    def _ensure_aware(value: datetime) -> datetime:
        return value if value.tzinfo else value.replace(tzinfo=UTC)
