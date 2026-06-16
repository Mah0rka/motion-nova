from datetime import UTC, datetime, time
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.branch import DEFAULT_BRANCH_ID
from app.models.user import User, UserRole
from app.models.workout_class import WorkoutClass
from app.repositories.booking_repository import BookingRepository
from app.repositories.branch_repository import BranchRepository
from app.repositories.schedule_repository import ScheduleRepository
from app.schemas.schedule import ScheduleCompleteRequest, ScheduleCreate, ScheduleUpdate
from app.services.branch_scope import BranchScope, ensure_branch_role


class ScheduleService:
    CLUB_TIMEZONE = ZoneInfo("Europe/Kyiv")
    CLUB_OPEN_TIME = time(6, 0)
    CLUB_CLOSE_TIME = time(22, 0)

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repository = ScheduleRepository(session)
        self.booking_repository = BookingRepository(session)
        self.branch_repository = BranchRepository(session)

    async def create_schedule(
        self,
        payload: ScheduleCreate,
        current_user: User,
        branch_scope: BranchScope | None = None,
    ) -> WorkoutClass:
        start_time = self._ensure_aware(payload.start_time)
        end_time = self._ensure_aware(payload.end_time)
        self._validate_time_range(start_time, end_time)
        branch_id = branch_scope.require_selected_branch() if branch_scope else DEFAULT_BRANCH_ID
        if branch_scope:
            ensure_branch_role(branch_scope, current_user, branch_id, UserRole.ADMIN)
        trainer_id = payload.trainer_id or current_user.id
        await self._ensure_trainer_assigned(trainer_id, branch_id)
        workout_class = WorkoutClass(
            title=payload.title.strip(),
            type=payload.type,
            start_time=start_time,
            end_time=end_time,
            capacity=payload.capacity,
            trainer_id=trainer_id,
            branch_id=branch_id,
        )
        await self.repository.create(workout_class)
        await self.session.commit()
        refreshed = await self.repository.get_by_id(workout_class.id)
        assert refreshed is not None
        return refreshed

    async def list_schedules(
        self,
        start_datetime: datetime | None = None,
        end_datetime: datetime | None = None,
        branch_id: str | None = None,
    ) -> list[WorkoutClass]:
        return await self.repository.list_all(
            self._ensure_aware(start_datetime) if start_datetime else None,
            self._ensure_aware(end_datetime) if end_datetime else None,
            branch_id,
        )

    async def list_my_classes(
        self,
        trainer_id: str,
        start_datetime: datetime | None = None,
        end_datetime: datetime | None = None,
        branch_id: str | None = None,
    ) -> list[WorkoutClass]:
        return await self.repository.list_by_trainer(
            trainer_id,
            self._ensure_aware(start_datetime) if start_datetime else None,
            self._ensure_aware(end_datetime) if end_datetime else None,
            branch_id,
        )

    async def update_schedule(
        self,
        class_id: str,
        payload: ScheduleUpdate,
        current_user: User,
        branch_scope: BranchScope | None = None,
    ) -> WorkoutClass:
        workout_class = await self._require_class(class_id)
        self._ensure_mutation_access(workout_class, current_user, branch_scope)
        if payload.trainer_id:
            await self._ensure_trainer_assigned(payload.trainer_id, workout_class.branch_id)
        values = payload.model_dump(exclude_unset=True)
        if "start_time" in values:
            values["start_time"] = self._ensure_aware(values["start_time"])
        if "end_time" in values:
            values["end_time"] = self._ensure_aware(values["end_time"])
        start_time = values.get("start_time", workout_class.start_time)
        end_time = values.get("end_time", workout_class.end_time)
        self._validate_time_range(self._ensure_aware(start_time), self._ensure_aware(end_time))
        for field, value in values.items():
            setattr(workout_class, field, value.strip() if isinstance(value, str) else value)
        await self.session.commit()
        refreshed = await self.repository.get_by_id(class_id)
        assert refreshed is not None
        return refreshed

    async def delete_schedule(
        self,
        class_id: str,
        current_user: User,
        branch_scope: BranchScope | None = None,
    ) -> None:
        workout_class = await self._require_class(class_id)
        self._ensure_mutation_access(workout_class, current_user, branch_scope)
        if await self.booking_repository.count_confirmed_for_class(class_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Не можна видалити заняття, поки в ньому є підтверджені записи",
            )
        await self.repository.delete(workout_class)
        await self.session.commit()

    async def confirm_completion(
        self,
        class_id: str,
        payload: ScheduleCompleteRequest,
        current_user: User,
        branch_scope: BranchScope | None = None,
    ) -> WorkoutClass:
        workout_class = await self._require_class(class_id)
        self._ensure_operational_access(workout_class, current_user, branch_scope)
        if self._ensure_aware(workout_class.end_time) > datetime.now(UTC):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Заняття можна підтвердити лише після завершення",
            )
        workout_class.completed_at = workout_class.completed_at or datetime.now(UTC)
        workout_class.completed_by = current_user
        workout_class.completion_comment = payload.comment.strip() if payload.comment else None
        await self.session.commit()
        refreshed = await self.repository.get_by_id(class_id)
        assert refreshed is not None
        return refreshed

    async def list_attendees(
        self,
        class_id: str,
        current_user: User,
        branch_scope: BranchScope | None = None,
    ):
        workout_class = await self._require_class(class_id)
        self._ensure_operational_access(workout_class, current_user, branch_scope)
        return await self.booking_repository.list_attendees_for_class(class_id)

    async def _require_class(self, class_id: str) -> WorkoutClass:
        workout_class = await self.repository.get_by_id(class_id)
        if not workout_class:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заняття не знайдено")
        return workout_class

    async def _ensure_trainer_assigned(self, trainer_id: str, branch_id: str) -> None:
        from app.models.user import User

        trainer = await self.session.get(User, trainer_id)
        if not trainer or trainer.role != UserRole.TRAINER:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Тренера не знайдено")
        assignment = await self.branch_repository.get_assignment(user_id=trainer_id, branch_id=branch_id)
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Тренер не прив'язаний до обраної філії",
            )

    def _ensure_mutation_access(
        self, workout_class: WorkoutClass, current_user: User, branch_scope: BranchScope | None
    ) -> None:
        if branch_scope:
            ensure_branch_role(branch_scope, current_user, workout_class.branch_id, UserRole.ADMIN)
        elif current_user.role not in {UserRole.ADMIN, UserRole.OWNER}:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостатньо прав доступу")

    def _ensure_operational_access(
        self, workout_class: WorkoutClass, current_user: User, branch_scope: BranchScope | None
    ) -> None:
        if current_user.role == UserRole.OWNER:
            return
        if branch_scope:
            if current_user.role == UserRole.ADMIN:
                ensure_branch_role(branch_scope, current_user, workout_class.branch_id, UserRole.ADMIN)
                return
            if current_user.role == UserRole.TRAINER and workout_class.trainer_id == current_user.id:
                ensure_branch_role(branch_scope, current_user, workout_class.branch_id, UserRole.TRAINER)
                return
        elif current_user.role == UserRole.TRAINER and workout_class.trainer_id == current_user.id:
            return
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостатньо прав доступу")

    @classmethod
    def _validate_time_range(cls, start_time: datetime, end_time: datetime) -> None:
        if end_time <= start_time:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Час завершення має бути пізніше за час початку")
        local_start = start_time.astimezone(cls.CLUB_TIMEZONE).time()
        local_end = end_time.astimezone(cls.CLUB_TIMEZONE).time()
        if local_start < cls.CLUB_OPEN_TIME or local_end > cls.CLUB_CLOSE_TIME:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Заняття має відбуватися в межах годин роботи клубу")

    @staticmethod
    def _ensure_aware(value: datetime) -> datetime:
        return value if value.tzinfo else value.replace(tzinfo=UTC)
