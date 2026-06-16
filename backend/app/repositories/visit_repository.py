from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.booking import Booking
from app.models.visit import Visit


class VisitRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @staticmethod
    def _base_query():
        return select(Visit).options(
            selectinload(Visit.user),
            selectinload(Visit.branch),
            selectinload(Visit.checked_in_by),
            selectinload(Visit.booking).selectinload(Booking.workout_class),
        )

    async def get_by_id(self, visit_id: str) -> Visit | None:
        result = await self.session.execute(self._base_query().where(Visit.id == visit_id))
        return result.scalar_one_or_none()

    async def get_active_for_user(
        self, user_id: str, branch_id: str | None = None
    ) -> Visit | None:
        statement = self._base_query().where(
            Visit.user_id == user_id,
            Visit.checked_out_at.is_(None),
        )
        if branch_id is not None:
            statement = statement.where(Visit.branch_id == branch_id)
        return (await self.session.execute(statement)).scalar_one_or_none()

    async def list_active(self, branch_id: str | None = None) -> list[Visit]:
        statement = self._base_query().where(Visit.checked_out_at.is_(None))
        if branch_id is not None:
            statement = statement.where(Visit.branch_id == branch_id)
        statement = statement.order_by(Visit.checked_in_at.desc())
        return list((await self.session.execute(statement)).scalars().all())

    async def list_history(
        self,
        branch_id: str | None = None,
        start_datetime: datetime | None = None,
        end_datetime: datetime | None = None,
    ) -> list[Visit]:
        statement = self._base_query()
        if branch_id is not None:
            statement = statement.where(Visit.branch_id == branch_id)
        if start_datetime is not None:
            statement = statement.where(Visit.checked_in_at >= start_datetime)
        if end_datetime is not None:
            statement = statement.where(Visit.checked_in_at <= end_datetime)
        statement = statement.order_by(Visit.checked_in_at.desc())
        return list((await self.session.execute(statement)).scalars().all())
