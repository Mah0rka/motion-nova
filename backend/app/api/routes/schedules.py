from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_branch_scope, get_current_user, get_db_session
from app.models.user import User, UserRole
from app.schemas.schedule import ScheduleAttendeeRead, ScheduleCompleteRequest, ScheduleCreate, ScheduleRead, ScheduleUpdate
from app.services.branch_scope import BranchScope, ensure_branch_role
from app.services.schedule_service import ScheduleService

router = APIRouter()


@router.post("", response_model=ScheduleRead, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    payload: ScheduleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    branch_scope: BranchScope = Depends(get_branch_scope),
) -> ScheduleRead:
    return ScheduleRead.model_validate(await ScheduleService(db).create_schedule(payload, current_user, branch_scope))


@router.get("", response_model=list[ScheduleRead])
async def list_schedules(
    start_datetime: datetime | None = Query(default=None, alias="from"),
    end_datetime: datetime | None = Query(default=None, alias="to"),
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    branch_scope: BranchScope = Depends(get_branch_scope),
) -> list[ScheduleRead]:
    schedules = await ScheduleService(db).list_schedules(start_datetime, end_datetime, branch_scope.selected_branch_id)
    return [ScheduleRead.model_validate(item) for item in schedules]


@router.get("/my-classes", response_model=list[ScheduleRead])
async def my_classes(
    start_datetime: datetime | None = Query(default=None, alias="from"),
    end_datetime: datetime | None = Query(default=None, alias="to"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    branch_scope: BranchScope = Depends(get_branch_scope),
) -> list[ScheduleRead]:
    branch_id = branch_scope.require_selected_branch()
    ensure_branch_role(branch_scope, current_user, branch_id, UserRole.TRAINER)
    schedules = await ScheduleService(db).list_my_classes(current_user.id, start_datetime, end_datetime, branch_id)
    return [ScheduleRead.model_validate(item) for item in schedules]


@router.get("/{class_id}/attendees", response_model=list[ScheduleAttendeeRead])
async def attendees(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    branch_scope: BranchScope = Depends(get_branch_scope),
) -> list[ScheduleAttendeeRead]:
    attendees = await ScheduleService(db).list_attendees(class_id, current_user, branch_scope)
    return [ScheduleAttendeeRead.model_validate(item) for item in attendees]


@router.patch("/{class_id}/complete", response_model=ScheduleRead)
async def complete_schedule(
    class_id: str,
    payload: ScheduleCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    branch_scope: BranchScope = Depends(get_branch_scope),
) -> ScheduleRead:
    return ScheduleRead.model_validate(await ScheduleService(db).confirm_completion(class_id, payload, current_user, branch_scope))


@router.patch("/{class_id}", response_model=ScheduleRead)
async def update_schedule(
    class_id: Annotated[str, Path(description="Ідентифікатор заняття")],
    payload: ScheduleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    branch_scope: BranchScope = Depends(get_branch_scope),
) -> ScheduleRead:
    return ScheduleRead.model_validate(await ScheduleService(db).update_schedule(class_id, payload, current_user, branch_scope))


@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    branch_scope: BranchScope = Depends(get_branch_scope),
) -> Response:
    await ScheduleService(db).delete_schedule(class_id, current_user, branch_scope)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
