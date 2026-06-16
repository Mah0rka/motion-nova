from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.workout_class import WorkoutClass


class ScheduleRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, workout_class: WorkoutClass) -> WorkoutClass:
        self.session.add(workout_class)
        await self.session.flush()
        return workout_class

    async def list_all(
        self,
        start_datetime: datetime | None = None,
        end_datetime: datetime | None = None,
        branch_id: str | None = None,
    ) -> list[WorkoutClass]:
        query = self._base_query()
        if start_datetime is not None:
            query = query.where(WorkoutClass.start_time >= start_datetime)
        if end_datetime is not None:
            query = query.where(WorkoutClass.start_time <= end_datetime)
        if branch_id is not None:
            query = query.where(WorkoutClass.branch_id == branch_id)
        return list((await self.session.execute(query)).scalars().all())

    async def list_by_trainer(
        self,
        trainer_id: str,
        start_datetime: datetime | None = None,
        end_datetime: datetime | None = None,
        branch_id: str | None = None,
    ) -> list[WorkoutClass]:
        query = self._base_query().where(WorkoutClass.trainer_id == trainer_id)
        if start_datetime is not None:
            query = query.where(WorkoutClass.start_time >= start_datetime)
        if end_datetime is not None:
            query = query.where(WorkoutClass.start_time <= end_datetime)
        if branch_id is not None:
            query = query.where(WorkoutClass.branch_id == branch_id)
        return list((await self.session.execute(query)).scalars().all())

    async def get_by_id(self, class_id: str) -> WorkoutClass | None:
        result = await self.session.execute(self._base_query().where(WorkoutClass.id == class_id))
        return result.scalar_one_or_none()

    async def delete(self, workout_class: WorkoutClass) -> None:
        await self.session.delete(workout_class)

    async def commit(self) -> None:
        await self.session.commit()

    @staticmethod
    def _base_query():
        return (
            select(WorkoutClass)
            .execution_options(populate_existing=True)
            .options(
                selectinload(WorkoutClass.trainer),
                selectinload(WorkoutClass.branch),
                selectinload(WorkoutClass.completed_by),
                selectinload(WorkoutClass.bookings),
            )
            .order_by(WorkoutClass.start_time.asc())
        )
