from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.expense import Expense


class ExpenseRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @staticmethod
    def _base_query():
        return select(Expense).options(
            selectinload(Expense.branch),
            selectinload(Expense.created_by),
        )

    async def get_by_id(self, expense_id: str) -> Expense | None:
        result = await self.session.execute(self._base_query().where(Expense.id == expense_id))
        return result.scalar_one_or_none()

    async def list(
        self,
        branch_id: str | None = None,
        start_datetime: datetime | None = None,
        end_datetime: datetime | None = None,
    ) -> list[Expense]:
        statement = self._base_query()
        if branch_id is not None:
            statement = statement.where(Expense.branch_id == branch_id)
        if start_datetime is not None:
            statement = statement.where(Expense.paid_at >= start_datetime)
        if end_datetime is not None:
            statement = statement.where(Expense.paid_at <= end_datetime)
        statement = statement.order_by(Expense.paid_at.desc())
        return list((await self.session.execute(statement)).scalars().all())
