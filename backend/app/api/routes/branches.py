from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db_session, require_roles
from app.models.user import User, UserRole
from app.schemas.branch import (
    AccessibleBranchRead,
    BranchCreate,
    BranchRead,
    BranchUpdate,
    StaffBranchAssignmentCreate,
    StaffBranchAssignmentRead,
)
from app.services.branch_service import BranchService

router = APIRouter()


@router.get("", response_model=list[AccessibleBranchRead], summary="Отримати доступні філії")
async def list_branches(
    include_inactive: bool = Query(default=False, alias="includeInactive"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> list[AccessibleBranchRead]:
    branches = await BranchService(db).list_accessible(current_user, include_inactive=include_inactive)
    return [AccessibleBranchRead.model_validate(item.branch) for item in branches]


@router.post("", response_model=BranchRead, status_code=status.HTTP_201_CREATED)
async def create_branch(
    payload: BranchCreate,
    _: User = Depends(require_roles(UserRole.OWNER)),
    db: AsyncSession = Depends(get_db_session),
) -> BranchRead:
    return BranchRead.model_validate(await BranchService(db).create_branch(payload))


@router.patch("/{branch_id}", response_model=BranchRead)
async def update_branch(
    payload: BranchUpdate,
    branch_id: str = Path(description="Ідентифікатор філії"),
    _: User = Depends(require_roles(UserRole.OWNER)),
    db: AsyncSession = Depends(get_db_session),
) -> BranchRead:
    return BranchRead.model_validate(await BranchService(db).update_branch(branch_id, payload))


@router.get("/{branch_id}/staff", response_model=list[StaffBranchAssignmentRead])
async def list_branch_staff(
    branch_id: str,
    _: User = Depends(require_roles(UserRole.OWNER)),
    db: AsyncSession = Depends(get_db_session),
) -> list[StaffBranchAssignmentRead]:
    assignments = await BranchService(db).list_staff(branch_id)
    return [StaffBranchAssignmentRead.model_validate(item) for item in assignments]


@router.post("/{branch_id}/staff", response_model=StaffBranchAssignmentRead)
async def assign_branch_staff(
    branch_id: str,
    payload: StaffBranchAssignmentCreate,
    _: User = Depends(require_roles(UserRole.OWNER)),
    db: AsyncSession = Depends(get_db_session),
) -> StaffBranchAssignmentRead:
    return StaffBranchAssignmentRead.model_validate(await BranchService(db).assign_staff(branch_id, payload))


@router.delete("/staff/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_branch_staff(
    assignment_id: str,
    _: User = Depends(require_roles(UserRole.OWNER)),
    db: AsyncSession = Depends(get_db_session),
) -> None:
    await BranchService(db).remove_staff(assignment_id)
