from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.payment import Payment
from app.models.subscription import Subscription


class PaymentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @staticmethod
    def _with_relations(statement):
        return statement.options(
            selectinload(Payment.subscription).selectinload(Subscription.user),
            selectinload(Payment.branch),
        )

    async def get_by_id(self, payment_id: str) -> Payment | None:
        statement = self._with_relations(select(Payment).where(Payment.id == payment_id))
        return (await self.session.execute(statement)).scalar_one_or_none()

    async def list_by_user(self, user_id: str) -> list[Payment]:
        statement = self._with_relations(
            select(Payment).join(Payment.subscription).where(Subscription.user_id == user_id)
        ).order_by(Payment.created_at.desc())
        return list((await self.session.execute(statement)).scalars().all())

    async def list_all(
        self,
        user_id: str | None = None,
        status: str | None = None,
        method: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        branch_id: str | None = None,
    ) -> list[Payment]:
        statement = self._with_relations(select(Payment))
        if user_id:
            statement = statement.join(Payment.subscription).where(Subscription.user_id == user_id)
        if status:
            statement = statement.where(Payment.status == status.upper())
        if method:
            statement = statement.where(Payment.method == method.upper())
        if start_date:
            statement = statement.where(Payment.created_at >= start_date)
        if end_date:
            statement = statement.where(Payment.created_at <= end_date)
        if branch_id:
            statement = statement.where(Payment.branch_id == branch_id)
        statement = statement.order_by(Payment.created_at.desc())
        return list((await self.session.execute(statement)).scalars().all())
