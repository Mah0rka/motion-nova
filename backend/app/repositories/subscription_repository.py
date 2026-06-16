from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.subscription import Subscription, SubscriptionStatus


class SubscriptionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @staticmethod
    def _with_relations(statement):
        return statement.options(
            selectinload(Subscription.plan),
            selectinload(Subscription.user),
        )

    async def reactivate_elapsed_freezes(self, *, user_id: str | None = None) -> None:
        statement = (
            update(Subscription)
            .where(
                Subscription.status == SubscriptionStatus.FROZEN,
                Subscription.frozen_until.is_not(None),
                Subscription.frozen_until <= datetime.now(UTC),
            )
            .values(status=SubscriptionStatus.ACTIVE, frozen_until=None)
        )
        if user_id:
            statement = statement.where(Subscription.user_id == user_id)
        result = await self.session.execute(statement)
        if result.rowcount:
            await self.session.commit()

    async def get_by_id(self, subscription_id: str) -> Subscription | None:
        await self.reactivate_elapsed_freezes()
        statement = self._with_relations(select(Subscription).where(Subscription.id == subscription_id))
        return (await self.session.execute(statement)).scalar_one_or_none()

    async def list_by_user(self, user_id: str) -> list[Subscription]:
        await self.reactivate_elapsed_freezes(user_id=user_id)
        statement = self._with_relations(
            select(Subscription).where(Subscription.user_id == user_id)
        ).order_by(Subscription.end_date.desc())
        return list((await self.session.execute(statement)).scalars().all())

    async def list_by_plan(self, plan_id: str) -> list[Subscription]:
        await self.reactivate_elapsed_freezes()
        result = await self.session.execute(select(Subscription).where(Subscription.plan_id == plan_id))
        return list(result.scalars().all())

    async def list_all(self, *, user_id: str | None = None) -> list[Subscription]:
        await self.reactivate_elapsed_freezes(user_id=user_id)
        statement = self._with_relations(select(Subscription)).order_by(Subscription.created_at.desc())
        if user_id:
            statement = statement.where(Subscription.user_id == user_id)
        return list((await self.session.execute(statement)).scalars().all())

    async def get_active_by_user(self, user_id: str) -> Subscription | None:
        await self.reactivate_elapsed_freezes(user_id=user_id)
        statement = self._with_relations(select(Subscription)).where(
            Subscription.user_id == user_id,
            Subscription.status == SubscriptionStatus.ACTIVE,
        ).order_by(Subscription.end_date.desc())
        return (await self.session.execute(statement)).scalars().first()
