from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking, BookingStatus
from app.models.branch import Branch
from app.models.user import User
from app.models.visit import Visit
from app.repositories.booking_repository import BookingRepository
from app.repositories.visit_repository import VisitRepository
from app.schemas.visit import VisitCheckInRequest
from app.services.branch_scope import (
    BranchScope,
    ensure_branch_role,
    ensure_management_scope,
)
from app.models.user import UserRole


class VisitService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repository = VisitRepository(session)
        self.booking_repository = BookingRepository(session)

    async def check_in(
        self,
        payload: VisitCheckInRequest,
        current_user: User,
        branch_scope: BranchScope,
    ) -> Visit:
        branch_id = branch_scope.require_selected_branch()
        ensure_branch_role(branch_scope, current_user, branch_id, UserRole.ADMIN)
        await self._ensure_branch_accepts_checkin(branch_id)

        user = await self.session.get(User, payload.user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Клієнта не знайдено")

        if payload.booking_id is not None:
            await self._validate_booking(payload.booking_id, user.id, branch_id)

        active = await self.repository.get_active_for_user(user.id, branch_id)
        if active is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Клієнт уже відмічений у залі",
            )

        visit = Visit(
            user_id=user.id,
            branch_id=branch_id,
            booking_id=payload.booking_id,
            checked_in_at=datetime.now(UTC),
            checked_in_by_id=current_user.id,
        )
        self.session.add(visit)
        await self.session.flush()
        await self.session.commit()
        created = await self.repository.get_by_id(visit.id)
        assert created is not None
        return created

    async def check_out(
        self,
        visit_id: str,
        current_user: User,
        branch_scope: BranchScope,
    ) -> Visit:
        visit = await self.repository.get_by_id(visit_id)
        if not visit:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Відвідування не знайдено")
        ensure_branch_role(branch_scope, current_user, visit.branch_id, UserRole.ADMIN)
        if visit.checked_out_at is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Відвідування вже завершено",
            )
        visit.checked_out_at = datetime.now(UTC)
        await self.session.commit()
        refreshed = await self.repository.get_by_id(visit.id)
        assert refreshed is not None
        return refreshed

    async def list_check_in_bookings(
        self,
        user_id: str,
        current_user: User,
        branch_scope: BranchScope,
    ) -> list[Booking]:
        branch_id = branch_scope.require_selected_branch()
        ensure_branch_role(branch_scope, current_user, branch_id, UserRole.ADMIN)
        return await self.booking_repository.list_confirmed_for_user_branch(user_id, branch_id)

    async def list_active(self, current_user: User, branch_scope: BranchScope) -> list[Visit]:
        branch_id = ensure_management_scope(branch_scope, current_user)
        return await self.repository.list_active(branch_id)

    async def list_history(
        self,
        current_user: User,
        branch_scope: BranchScope,
        start_datetime: datetime | None = None,
        end_datetime: datetime | None = None,
    ) -> list[Visit]:
        branch_id = ensure_management_scope(branch_scope, current_user)
        return await self.repository.list_history(
            branch_id,
            self._ensure_aware(start_datetime) if start_datetime else None,
            self._ensure_aware(end_datetime) if end_datetime else None,
        )

    async def _ensure_branch_accepts_checkin(self, branch_id: str) -> None:
        branch = await self.session.get(Branch, branch_id)
        if branch is None or not branch.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Філія неактивна і не приймає нові відвідування",
            )

    async def _validate_booking(self, booking_id: str, user_id: str, branch_id: str) -> None:
        booking: Booking | None = await self.booking_repository.get_by_id(booking_id)
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Бронювання не знайдено")
        if booking.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Бронювання належить іншому клієнту",
            )
        if booking.status != BookingStatus.CONFIRMED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Бронювання не підтверджено",
            )
        if booking.workout_class.branch_id != branch_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Заняття відбувається в іншій філії",
            )

    @staticmethod
    def _ensure_aware(value: datetime) -> datetime:
        return value if value.tzinfo else value.replace(tzinfo=UTC)
