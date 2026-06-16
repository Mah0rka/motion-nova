from datetime import datetime

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_branch_scope, get_current_user, get_db_session
from app.models.user import User
from app.schemas.visit import CheckInBookingOption, VisitCheckInRequest, VisitRead
from app.services.branch_scope import BranchScope
from app.services.visit_service import VisitService

router = APIRouter()


@router.post("/check-in", response_model=VisitRead, status_code=status.HTTP_201_CREATED)
async def check_in(
    payload: VisitCheckInRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    branch_scope: BranchScope = Depends(get_branch_scope),
) -> VisitRead:
    return VisitRead.model_validate(
        await VisitService(db).check_in(payload, current_user, branch_scope)
    )


@router.post("/{visit_id}/check-out", response_model=VisitRead)
async def check_out(
    visit_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    branch_scope: BranchScope = Depends(get_branch_scope),
) -> VisitRead:
    return VisitRead.model_validate(
        await VisitService(db).check_out(visit_id, current_user, branch_scope)
    )


@router.get("/bookings", response_model=list[CheckInBookingOption])
async def list_check_in_bookings(
    user_id: str = Query(alias="userId"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    branch_scope: BranchScope = Depends(get_branch_scope),
) -> list[CheckInBookingOption]:
    bookings = await VisitService(db).list_check_in_bookings(user_id, current_user, branch_scope)
    return [CheckInBookingOption.model_validate(item) for item in bookings]


@router.get("/active", response_model=list[VisitRead])
async def list_active(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    branch_scope: BranchScope = Depends(get_branch_scope),
) -> list[VisitRead]:
    visits = await VisitService(db).list_active(current_user, branch_scope)
    return [VisitRead.model_validate(item) for item in visits]


@router.get("/history", response_model=list[VisitRead])
async def list_history(
    start_datetime: datetime | None = Query(default=None, alias="from"),
    end_datetime: datetime | None = Query(default=None, alias="to"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    branch_scope: BranchScope = Depends(get_branch_scope),
) -> list[VisitRead]:
    visits = await VisitService(db).list_history(
        current_user, branch_scope, start_datetime, end_datetime
    )
    return [VisitRead.model_validate(item) for item in visits]
