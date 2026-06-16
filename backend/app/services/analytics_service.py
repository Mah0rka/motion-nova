import enum
from collections import Counter, defaultdict
from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking, BookingStatus
from app.models.expense import Expense
from app.models.payment import Payment
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.user import User
from app.models.visit import Visit
from app.models.workout_class import WorkoutClass
from app.repositories.branch_repository import BranchRepository
from app.schemas.analytics import (
    AttendancePoint,
    AttendanceReport,
    BranchComparisonRow,
    ClassOccupancyRow,
    OverviewReport,
    PeakHourPoint,
    PeriodComparisonReport,
    PeriodRange,
    TrainerPerformanceReport,
)

CLUB_TIMEZONE = ZoneInfo("Europe/Kyiv")


class AnalyticsMetric(str, enum.Enum):
    REVENUE = "REVENUE"
    EXPENSES = "EXPENSES"
    PROFIT = "PROFIT"
    VISITS = "VISITS"


class AnalyticsService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session


    async def get_revenue(self, start: datetime, end: datetime, branch_id: str | None = None) -> float:
        start, end = self._period(start, end)
        statement = select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.created_at >= start,
            Payment.created_at <= end,
            Payment.status == "SUCCESS",
        )
        if branch_id:
            statement = statement.where(Payment.branch_id == branch_id)
        return float((await self.session.execute(statement)).scalar_one())

    async def get_expenses(self, start: datetime, end: datetime, branch_id: str | None = None) -> float:
        start, end = self._period(start, end)
        statement = select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.paid_at >= start,
            Expense.paid_at <= end,
        )
        if branch_id:
            statement = statement.where(Expense.branch_id == branch_id)
        return float((await self.session.execute(statement)).scalar_one())

    async def get_profit(self, start: datetime, end: datetime, branch_id: str | None = None) -> float:
        revenue = await self.get_revenue(start, end, branch_id)
        expenses = await self.get_expenses(start, end, branch_id)
        return revenue - expenses

    async def get_visits_count(self, start: datetime, end: datetime, branch_id: str | None = None) -> int:
        start, end = self._period(start, end)
        statement = select(func.count(Visit.id)).where(
            Visit.checked_in_at >= start,
            Visit.checked_in_at <= end,
        )
        if branch_id:
            statement = statement.where(Visit.branch_id == branch_id)
        return int((await self.session.execute(statement)).scalar_one())

    async def _active_subscriptions(self) -> int:
        statement = select(func.count(Subscription.id)).where(
            Subscription.status == SubscriptionStatus.ACTIVE
        )
        return int((await self.session.execute(statement)).scalar_one())


    async def get_overview(
        self, start: datetime, end: datetime, branch_id: str | None = None
    ) -> OverviewReport:
        start, end = self._period(start, end)
        revenue = await self.get_revenue(start, end, branch_id)
        expenses = await self.get_expenses(start, end, branch_id)
        return OverviewReport(
            period=PeriodRange(start=start, end=end),
            branch_id=branch_id,
            revenue=revenue,
            expenses=expenses,
            profit=revenue - expenses,
            visits=await self.get_visits_count(start, end, branch_id),
            active_subscriptions=await self._active_subscriptions(),
            currency="UAH",
        )

    async def get_attendance(
        self, start: datetime, end: datetime, branch_id: str | None = None
    ) -> AttendanceReport:
        start, end = self._period(start, end)
        visits = await self._visits_in_period(start, end, branch_id)
        per_day: dict[date, int] = defaultdict(int)
        unique_visitors: set[str] = set()
        for visit in visits:
            local_day = self._to_club_time(visit.checked_in_at).date()
            per_day[local_day] += 1
            unique_visitors.add(visit.user_id)
        return AttendanceReport(
            period=PeriodRange(start=start, end=end),
            branch_id=branch_id,
            total=len(visits),
            unique_visitors=len(unique_visitors),
            per_day=[
                AttendancePoint(date=day, count=count) for day, count in sorted(per_day.items())
            ],
        )

    async def get_peak_hours(
        self, start: datetime, end: datetime, branch_id: str | None = None
    ) -> list[PeakHourPoint]:
        start, end = self._period(start, end)
        visits = await self._visits_in_period(start, end, branch_id)
        buckets = Counter(self._to_club_time(visit.checked_in_at).hour for visit in visits)
        return [PeakHourPoint(hour=hour, visits=buckets.get(hour, 0)) for hour in range(24)]

    async def get_class_occupancy(
        self, start: datetime, end: datetime, branch_id: str | None = None
    ) -> list[ClassOccupancyRow]:
        start, end = self._period(start, end)
        booked = func.count(Booking.id)
        statement = (
            select(
                WorkoutClass.id,
                WorkoutClass.title,
                WorkoutClass.start_time,
                WorkoutClass.capacity,
                booked,
            )
            .outerjoin(
                Booking,
                and_(Booking.class_id == WorkoutClass.id, Booking.status == BookingStatus.CONFIRMED),
            )
            .where(WorkoutClass.start_time >= start, WorkoutClass.start_time <= end)
            .group_by(WorkoutClass.id, WorkoutClass.title, WorkoutClass.start_time, WorkoutClass.capacity)
            .order_by(WorkoutClass.start_time.asc())
        )
        if branch_id:
            statement = statement.where(WorkoutClass.branch_id == branch_id)
        rows: list[ClassOccupancyRow] = []
        for class_id, title, start_time, capacity, booked_count in (
            await self.session.execute(statement)
        ).all():
            capacity = int(capacity)
            booked_count = int(booked_count)
            rows.append(
                ClassOccupancyRow(
                    class_id=class_id,
                    title=title,
                    start_time=start_time,
                    capacity=capacity,
                    booked=booked_count,
                    occupancy_pct=round(booked_count / capacity * 100, 1) if capacity else 0.0,
                )
            )
        return rows

    async def get_trainer_performance(
        self, branch_id: str | None = None
    ) -> list[TrainerPerformanceReport]:
        statement = (
            select(
                User.id,
                User.first_name,
                User.last_name,
                func.count(func.distinct(WorkoutClass.id)),
                func.count(Booking.id),
            )
            .join(WorkoutClass, WorkoutClass.trainer_id == User.id)
            .outerjoin(
                Booking,
                and_(Booking.class_id == WorkoutClass.id, Booking.status == BookingStatus.CONFIRMED),
            )
            .group_by(User.id, User.first_name, User.last_name)
            .order_by(func.count(Booking.id).desc())
        )
        if branch_id:
            statement = statement.where(WorkoutClass.branch_id == branch_id)
        reports: list[TrainerPerformanceReport] = []
        for trainer_id, first_name, last_name, classes_taught, total_attendees in (
            await self.session.execute(statement)
        ).all():
            classes_taught = int(classes_taught)
            total_attendees = int(total_attendees)
            reports.append(
                TrainerPerformanceReport(
                    trainer_id=trainer_id,
                    name=f"{first_name} {last_name}",
                    total_attendees=total_attendees,
                    classes_taught=classes_taught,
                    average_attendees_per_class=(
                        round(total_attendees / classes_taught, 2) if classes_taught else 0.0
                    ),
                )
            )
        return reports

    async def compare_branches(
        self, metric: AnalyticsMetric, start: datetime, end: datetime
    ) -> list[BranchComparisonRow]:
        start, end = self._period(start, end)
        branches = await BranchRepository(self.session).list_branches()
        rows: list[BranchComparisonRow] = []
        for branch in branches:
            rows.append(
                BranchComparisonRow(
                    branch_id=branch.id,
                    branch_name=branch.name,
                    value=await self._aggregate(metric, start, end, branch.id),
                )
            )
        rows.sort(key=lambda row: row.value, reverse=True)
        return rows

    async def compare_periods(
        self,
        metric: AnalyticsMetric,
        start: datetime,
        end: datetime,
        branch_id: str | None = None,
    ) -> PeriodComparisonReport:
        start, end = self._period(start, end)
        window = end - start
        previous_start = start - window
        current = await self._aggregate(metric, start, end, branch_id)
        previous = await self._aggregate(metric, previous_start, start, branch_id)
        delta = current - previous
        return PeriodComparisonReport(
            metric=metric.value,
            branch_id=branch_id,
            current_period=PeriodRange(start=start, end=end),
            previous_period=PeriodRange(start=previous_start, end=start),
            current=current,
            previous=previous,
            delta=delta,
            delta_pct=round(delta / previous * 100, 1) if previous else None,
        )


    async def _aggregate(
        self, metric: AnalyticsMetric, start: datetime, end: datetime, branch_id: str | None
    ) -> float:
        if metric is AnalyticsMetric.REVENUE:
            return await self.get_revenue(start, end, branch_id)
        if metric is AnalyticsMetric.EXPENSES:
            return await self.get_expenses(start, end, branch_id)
        if metric is AnalyticsMetric.PROFIT:
            return await self.get_profit(start, end, branch_id)
        return float(await self.get_visits_count(start, end, branch_id))

    async def _visits_in_period(
        self, start: datetime, end: datetime, branch_id: str | None
    ) -> list[Visit]:
        statement = select(Visit).where(Visit.checked_in_at >= start, Visit.checked_in_at <= end)
        if branch_id:
            statement = statement.where(Visit.branch_id == branch_id)
        return list((await self.session.execute(statement)).scalars().all())

    @staticmethod
    def _to_club_time(value: datetime) -> datetime:
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.astimezone(CLUB_TIMEZONE)

    @staticmethod
    def _period(start: datetime, end: datetime) -> tuple[datetime, datetime]:
        if start.tzinfo is None:
            start = start.replace(tzinfo=UTC)
        if end.tzinfo is None:
            end = end.replace(tzinfo=UTC)
        return start, end
