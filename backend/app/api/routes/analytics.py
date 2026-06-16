from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_branch_scope, get_current_user, get_db_session, require_roles
from app.models.user import User, UserRole
from app.schemas.analytics import (
    AttendanceReport,
    BranchComparisonRow,
    ClassOccupancyRow,
    OverviewReport,
    PeakHourPoint,
    PeriodComparisonReport,
    TrainerPerformanceReport,
)
from app.services.analytics_service import AnalyticsMetric, AnalyticsService
from app.services.branch_scope import BranchScope, ensure_management_scope

router = APIRouter()


def _resolve_period(
    start: datetime | None, end: datetime | None
) -> tuple[datetime, datetime]:
    resolved_end = end or datetime.now(UTC)
    resolved_start = start or (resolved_end - timedelta(days=30))
    return resolved_start, resolved_end


@router.get("/overview", response_model=OverviewReport)
async def overview(
    start: datetime | None = Query(default=None, alias="from"),
    end: datetime | None = Query(default=None, alias="to"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    branch_scope: BranchScope = Depends(get_branch_scope),
) -> OverviewReport:
    branch_id = ensure_management_scope(branch_scope, current_user)
    resolved_start, resolved_end = _resolve_period(start, end)
    return await AnalyticsService(db).get_overview(resolved_start, resolved_end, branch_id)


@router.get("/attendance", response_model=AttendanceReport)
async def attendance(
    start: datetime | None = Query(default=None, alias="from"),
    end: datetime | None = Query(default=None, alias="to"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    branch_scope: BranchScope = Depends(get_branch_scope),
) -> AttendanceReport:
    branch_id = ensure_management_scope(branch_scope, current_user)
    resolved_start, resolved_end = _resolve_period(start, end)
    return await AnalyticsService(db).get_attendance(resolved_start, resolved_end, branch_id)


@router.get("/peak-hours", response_model=list[PeakHourPoint])
async def peak_hours(
    start: datetime | None = Query(default=None, alias="from"),
    end: datetime | None = Query(default=None, alias="to"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    branch_scope: BranchScope = Depends(get_branch_scope),
) -> list[PeakHourPoint]:
    branch_id = ensure_management_scope(branch_scope, current_user)
    resolved_start, resolved_end = _resolve_period(start, end)
    return await AnalyticsService(db).get_peak_hours(resolved_start, resolved_end, branch_id)


@router.get("/class-occupancy", response_model=list[ClassOccupancyRow])
async def class_occupancy(
    start: datetime | None = Query(default=None, alias="from"),
    end: datetime | None = Query(default=None, alias="to"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    branch_scope: BranchScope = Depends(get_branch_scope),
) -> list[ClassOccupancyRow]:
    branch_id = ensure_management_scope(branch_scope, current_user)
    resolved_start, resolved_end = _resolve_period(start, end)
    return await AnalyticsService(db).get_class_occupancy(resolved_start, resolved_end, branch_id)


@router.get("/trainers", response_model=list[TrainerPerformanceReport])
async def trainers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    branch_scope: BranchScope = Depends(get_branch_scope),
) -> list[TrainerPerformanceReport]:
    branch_id = ensure_management_scope(branch_scope, current_user)
    return await AnalyticsService(db).get_trainer_performance(branch_id)


@router.get("/compare-branches", response_model=list[BranchComparisonRow])
async def compare_branches(
    metric: AnalyticsMetric = Query(default=AnalyticsMetric.REVENUE),
    start: datetime | None = Query(default=None, alias="from"),
    end: datetime | None = Query(default=None, alias="to"),
    _: User = Depends(require_roles(UserRole.OWNER)),
    db: AsyncSession = Depends(get_db_session),
) -> list[BranchComparisonRow]:
    resolved_start, resolved_end = _resolve_period(start, end)
    return await AnalyticsService(db).compare_branches(metric, resolved_start, resolved_end)


@router.get("/compare-periods", response_model=PeriodComparisonReport)
async def compare_periods(
    metric: AnalyticsMetric = Query(default=AnalyticsMetric.PROFIT),
    start: datetime | None = Query(default=None, alias="from"),
    end: datetime | None = Query(default=None, alias="to"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    branch_scope: BranchScope = Depends(get_branch_scope),
) -> PeriodComparisonReport:
    branch_id = ensure_management_scope(branch_scope, current_user)
    resolved_start, resolved_end = _resolve_period(start, end)
    return await AnalyticsService(db).compare_periods(metric, resolved_start, resolved_end, branch_id)
