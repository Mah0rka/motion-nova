from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_branch_scope, get_current_user, get_db_session, require_roles
from app.models.user import User, UserRole
from app.schemas.payment import PaymentRead
from app.services.branch_scope import BranchScope, ensure_management_scope
from app.services.payment_service import PaymentService

router = APIRouter()


@router.get("/my-payments", response_model=list[PaymentRead])
async def my_payments(
    current_user: User = Depends(require_roles(UserRole.CLIENT)),
    db: AsyncSession = Depends(get_db_session),
) -> list[PaymentRead]:
    payments = await PaymentService(db).list_for_user(current_user.id)
    return [PaymentRead.model_validate(item) for item in payments]


@router.get("", response_model=list[PaymentRead])
async def all_payments(
    user_id: str | None = Query(default=None, alias="userId"),
    status_filter: str | None = Query(default=None, alias="status"),
    method: str | None = Query(default=None, alias="method"),
    start_date: datetime | None = Query(default=None, alias="startDate"),
    end_date: datetime | None = Query(default=None, alias="endDate"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    branch_scope: BranchScope = Depends(get_branch_scope),
) -> list[PaymentRead]:
    branch_id = ensure_management_scope(branch_scope, current_user)
    payments = await PaymentService(db).list_all(user_id, status_filter, method, start_date, end_date, branch_id)
    return [PaymentRead.model_validate(item) for item in payments]
