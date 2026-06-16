from datetime import UTC, datetime, time, timedelta
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking, BookingStatus
from app.models.branch import Branch
from app.models.subscription import SubscriptionStatus
from app.models.workout_class import WorkoutClass
from app.repositories.booking_repository import BookingRepository
from app.repositories.subscription_repository import SubscriptionRepository


class BookingService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.booking_repository = BookingRepository(session)
        self.subscription_repository = SubscriptionRepository(session)

    async def create_booking(self, user_id: str, class_id: str) -> Booking:
        workout_class = await self.session.get(WorkoutClass, class_id)
        if not workout_class:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заняття не знайдено")
        await self._ensure_branch_active(workout_class.branch_id)
        current_count = await self.booking_repository.count_confirmed_for_class(class_id)
        if current_count >= workout_class.capacity:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="На це заняття вже немає вільних місць")
        same_day = await self._list_bookings_for_day(user_id, workout_class.start_time)
        if any(item.class_id != class_id for item in same_day):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="На один день можна записатися лише на одне заняття")
        existing = await self.booking_repository.get_by_user_and_class(user_id, class_id)
        if existing and existing.status == BookingStatus.CONFIRMED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ви вже записані на це заняття")
        active_subscription = await self.subscription_repository.get_active_by_user(user_id)
        self._consume_visit_if_needed(active_subscription)
        if existing:
            existing.status = BookingStatus.CONFIRMED
            booking_id = existing.id
        else:
            booking = Booking(user_id=user_id, class_id=class_id, status=BookingStatus.CONFIRMED)
            self.session.add(booking)
            await self.session.flush()
            booking_id = booking.id
        await self.session.commit()
        created = await self.booking_repository.get_by_id(booking_id)
        assert created is not None
        return created

    async def cancel_booking(self, user_id: str, booking_id: str) -> Booking:
        booking = await self.booking_repository.get_by_id(booking_id)
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Запис не знайдено")
        if booking.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Можна скасувати лише власний запис")
        class_time = booking.workout_class.start_time
        if class_time.tzinfo is None:
            class_time = class_time.replace(tzinfo=UTC)
        if (class_time - datetime.now(UTC)).total_seconds() / 3600 < 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Заняття можна скасувати не пізніше ніж за 1 годину до початку")
        if booking.status == BookingStatus.CANCELLED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Цей запис уже скасовано")
        booking.status = BookingStatus.CANCELLED
        active_subscription = await self.subscription_repository.get_active_by_user(user_id)
        if active_subscription and active_subscription.total_visits is not None:
            active_subscription.remaining_visits = (active_subscription.remaining_visits or 0) + 1
        await self.session.commit()
        refreshed = await self.booking_repository.get_by_id(booking_id)
        assert refreshed is not None
        return refreshed

    async def list_for_user(self, user_id: str) -> list[Booking]:
        return await self.booking_repository.list_by_user(user_id)

    def _consume_visit_if_needed(self, subscription) -> None:
        if not subscription or subscription.status != SubscriptionStatus.ACTIVE:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Для запису на заняття потрібен активний абонемент")
        if subscription.total_visits is None:
            return
        remaining = subscription.remaining_visits or 0
        if remaining <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="У вашому абонементі не залишилося відвідувань")
        subscription.remaining_visits = remaining - 1

    async def _list_bookings_for_day(self, user_id: str, class_start_time: datetime) -> list[Booking]:
        club_tz = ZoneInfo("Europe/Kyiv")
        localized_start = class_start_time.astimezone(club_tz)
        day_start_local = datetime.combine(localized_start.date(), time.min, tzinfo=club_tz)
        return await self.booking_repository.list_confirmed_for_user_between(
            user_id,
            day_start_local.astimezone(UTC),
            (day_start_local + timedelta(days=1)).astimezone(UTC),
        )

    async def _ensure_branch_active(self, branch_id: str) -> None:
        branch = await self.session.get(Branch, branch_id)
        if branch is not None and not branch.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Філія неактивна")
