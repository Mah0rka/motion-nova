from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_branch_scope, get_current_user, get_db_session, rate_limit, require_roles
from app.core.config import settings
from app.models.user import User, UserRole
from app.schemas.membership_plan import MembershipPlanCreate, MembershipPlanRead, MembershipPlanUpdate
from app.schemas.subscription import (
    SubscriptionFreezeRequest,
    SubscriptionManagementIssueRequest,
    SubscriptionManagementUpdate,
    SubscriptionPurchaseRequest,
    SubscriptionRead,
)
from app.services.branch_scope import BranchScope, ensure_management_scope
from app.services.membership_plan_service import MembershipPlanService
from app.services.subscription_service import SubscriptionService

router = APIRouter()


@router.get("/plans", response_model=list[MembershipPlanRead])
async def list_membership_plans(
    current_user: User = Depends(require_roles(UserRole.CLIENT, UserRole.ADMIN, UserRole.OWNER)),
    db: AsyncSession = Depends(get_db_session),
) -> list[MembershipPlanRead]:
    plans = await MembershipPlanService(db).list_plans(
        active_only=current_user.role == UserRole.CLIENT,
        public_only=current_user.role == UserRole.CLIENT,
    )
    return [MembershipPlanRead.model_validate(item) for item in plans]


@router.post("/plans", response_model=MembershipPlanRead, status_code=status.HTTP_201_CREATED)
async def create_membership_plan(
    payload: MembershipPlanCreate,
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.OWNER)),
    db: AsyncSession = Depends(get_db_session),
) -> MembershipPlanRead:
    return MembershipPlanRead.model_validate(await MembershipPlanService(db).create_plan(payload))


@router.patch("/plans/{plan_id}", response_model=MembershipPlanRead)
async def update_membership_plan(
    plan_id: str,
    payload: MembershipPlanUpdate,
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.OWNER)),
    db: AsyncSession = Depends(get_db_session),
) -> MembershipPlanRead:
    return MembershipPlanRead.model_validate(await MembershipPlanService(db).update_plan(plan_id, payload))


@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_membership_plan(
    plan_id: str,
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.OWNER)),
    db: AsyncSession = Depends(get_db_session),
) -> None:
    await MembershipPlanService(db).delete_plan(plan_id)


@router.post("/purchase", response_model=SubscriptionRead)
async def purchase_subscription(
    payload: SubscriptionPurchaseRequest,
    current_user: User = Depends(require_roles(UserRole.CLIENT)),
    _: None = Depends(
        rate_limit(
            "subscriptions:purchase",
            settings.subscription_purchase_rate_limit,
            settings.auth_rate_limit_window_seconds,
        )
    ),
    db: AsyncSession = Depends(get_db_session),
    branch_scope: BranchScope = Depends(get_branch_scope),
) -> SubscriptionRead:
    subscription = await SubscriptionService(db).purchase(
        current_user.id,
        plan_id=payload.plan_id,
        payment_branch_id=branch_scope.require_selected_branch(),
    )
    return SubscriptionRead.model_validate(subscription)


@router.patch("/{subscription_id}/freeze", response_model=SubscriptionRead)
async def freeze_subscription(
    subscription_id: str,
    payload: SubscriptionFreezeRequest,
    current_user: User = Depends(require_roles(UserRole.CLIENT)),
    db: AsyncSession = Depends(get_db_session),
) -> SubscriptionRead:
    subscription = await SubscriptionService(db).freeze(current_user.id, subscription_id, payload.days)
    return SubscriptionRead.model_validate(subscription)


@router.patch("/{subscription_id}/unfreeze", response_model=SubscriptionRead)
async def unfreeze_subscription(
    subscription_id: str,
    current_user: User = Depends(require_roles(UserRole.CLIENT)),
    db: AsyncSession = Depends(get_db_session),
) -> SubscriptionRead:
    subscription = await SubscriptionService(db).unfreeze(current_user.id, subscription_id)
    return SubscriptionRead.model_validate(subscription)


@router.get("", response_model=list[SubscriptionRead])
async def all_subscriptions(
    user_id: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    branch_scope: BranchScope = Depends(get_branch_scope),
) -> list[SubscriptionRead]:
    ensure_management_scope(branch_scope, current_user)
    subscriptions = await SubscriptionService(db).list_for_management(user_id=user_id)
    return [SubscriptionRead.model_validate(item) for item in subscriptions]


@router.patch("/{subscription_id}", response_model=SubscriptionRead)
async def update_client_subscription(
    subscription_id: str,
    payload: SubscriptionManagementUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    branch_scope: BranchScope = Depends(get_branch_scope),
) -> SubscriptionRead:
    ensure_management_scope(branch_scope, current_user)
    return SubscriptionRead.model_validate(
        await SubscriptionService(db).update_for_management(subscription_id, payload)
    )


@router.post("/issue", response_model=SubscriptionRead, status_code=status.HTTP_201_CREATED)
async def issue_client_subscription(
    payload: SubscriptionManagementIssueRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    branch_scope: BranchScope = Depends(get_branch_scope),
) -> SubscriptionRead:
    ensure_management_scope(branch_scope, current_user)
    return SubscriptionRead.model_validate(await SubscriptionService(db).issue_for_management(payload))


@router.get("/my-subscriptions", response_model=list[SubscriptionRead])
async def my_subscriptions(
    current_user: User = Depends(require_roles(UserRole.CLIENT)),
    db: AsyncSession = Depends(get_db_session),
) -> list[SubscriptionRead]:
    subscriptions = await SubscriptionService(db).list_for_user(current_user.id)
    return [SubscriptionRead.model_validate(item) for item in subscriptions]
