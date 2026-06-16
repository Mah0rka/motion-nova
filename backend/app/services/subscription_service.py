from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.branch import DEFAULT_BRANCH_ID
from app.models.membership_plan import MembershipPlan
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.user import User
from app.repositories.membership_plan_repository import MembershipPlanRepository
from app.repositories.subscription_repository import SubscriptionRepository
from app.schemas.subscription import SubscriptionManagementIssueRequest, SubscriptionManagementUpdate
from app.services.payment_service import PaymentService


class SubscriptionService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repository = SubscriptionRepository(session)
        self.plan_repository = MembershipPlanRepository(session)

    async def purchase(
        self,
        user_id: str,
        plan_id: str,
        payment_branch_id: str = DEFAULT_BRANCH_ID,
    ) -> Subscription:
        await self.repository.reactivate_elapsed_freezes(user_id=user_id)
        existing = await self.repository.list_by_user(user_id)
        if any(item.status in {SubscriptionStatus.ACTIVE, SubscriptionStatus.FROZEN} for item in existing):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Завершіть поточний абонемент перед придбанням нового",
            )
        plan = await self._resolve_plan(plan_id=plan_id, require_public=True)
        start_date = datetime.now(UTC)
        subscription = Subscription(
            user_id=user_id,
            plan_id=plan.id,
            start_date=start_date,
            end_date=start_date + timedelta(days=plan.duration_days),
            frozen_until=None,
            total_visits=plan.visits_limit,
            remaining_visits=plan.visits_limit,
            status=SubscriptionStatus.ACTIVE,
        )
        self.session.add(subscription)
        await self.session.flush()
        self.session.add(
            PaymentService(self.session).build_plan_payment(
                subscription, plan, branch_id=payment_branch_id
            )
        )
        await self.session.commit()
        return (await self.repository.get_by_id(subscription.id)) or subscription

    async def freeze(self, user_id: str, subscription_id: str, days: int) -> Subscription:
        if days < 7 or days > 30:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Тривалість заморозки має бути від 7 до 30 днів",
            )
        await self.repository.reactivate_elapsed_freezes(user_id=user_id)
        subscription = await self.repository.get_by_id(subscription_id)
        if not subscription or subscription.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Абонемент не знайдено")
        if subscription.status != SubscriptionStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Заморозити можна лише активний абонемент",
            )
        now = datetime.now(UTC)
        if subscription.end_date <= now:
            subscription.status = SubscriptionStatus.EXPIRED
            await self.session.commit()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Прострочений абонемент не можна заморозити",
            )
        subscription.status = SubscriptionStatus.FROZEN
        subscription.frozen_until = now + timedelta(days=days)
        subscription.end_date += timedelta(days=days)
        await self.session.commit()
        return (await self.repository.get_by_id(subscription.id)) or subscription

    async def unfreeze(self, user_id: str, subscription_id: str) -> Subscription:
        await self.repository.reactivate_elapsed_freezes(user_id=user_id)
        subscription = await self.repository.get_by_id(subscription_id)
        if not subscription or subscription.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Абонемент не знайдено")
        if subscription.status != SubscriptionStatus.FROZEN:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Абонемент не перебуває на паузі",
            )
        now = datetime.now(UTC)
        if subscription.frozen_until and subscription.frozen_until > now:
            unused_time = subscription.frozen_until - now
            subscription.end_date -= unused_time
        subscription.status = SubscriptionStatus.ACTIVE
        subscription.frozen_until = None
        await self.session.commit()
        return (await self.repository.get_by_id(subscription.id)) or subscription

    async def issue_for_management(self, payload: SubscriptionManagementIssueRequest) -> Subscription:
        plan = await self._resolve_plan(plan_id=payload.plan_id, require_public=False)
        user = await self.session.get(User, payload.user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Користувача не знайдено")
        start_date = payload.start_date or datetime.now(UTC)
        total_visits = payload.total_visits if payload.total_visits is not None else plan.visits_limit
        subscription = Subscription(
            user_id=user.id,
            plan_id=plan.id,
            start_date=start_date,
            end_date=payload.end_date or start_date + timedelta(days=plan.duration_days),
            status=SubscriptionStatus(payload.status),
            frozen_until=None,
            total_visits=total_visits,
            remaining_visits=payload.remaining_visits if payload.remaining_visits is not None else total_visits,
        )
        self._validate_management_update(subscription)
        self.session.add(subscription)
        await self.session.commit()
        return (await self.repository.get_by_id(subscription.id)) or subscription

    async def list_for_user(self, user_id: str) -> list[Subscription]:
        await self.repository.reactivate_elapsed_freezes(user_id=user_id)
        return await self.repository.list_by_user(user_id)

    async def list_for_management(self, *, user_id: str | None = None) -> list[Subscription]:
        await self.repository.reactivate_elapsed_freezes(user_id=user_id)
        return await self.repository.list_all(user_id=user_id)

    async def update_for_management(
        self, subscription_id: str, payload: SubscriptionManagementUpdate
    ) -> Subscription:
        await self.repository.reactivate_elapsed_freezes()
        subscription = await self.repository.get_by_id(subscription_id)
        if not subscription:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Абонемент не знайдено")
        updates = payload.model_dump(exclude_unset=True)
        if "plan_id" in updates:
            plan = await self._resolve_plan(plan_id=payload.plan_id, require_public=False)
            subscription.plan_id = plan.id
            if "total_visits" not in updates:
                subscription.total_visits = plan.visits_limit
            if "remaining_visits" not in updates:
                subscription.remaining_visits = plan.visits_limit
        for field in ("start_date", "end_date", "total_visits", "remaining_visits"):
            if field in updates:
                setattr(subscription, field, getattr(payload, field))
        if "status" in updates:
            new_status = SubscriptionStatus(payload.status)
            if new_status != SubscriptionStatus.FROZEN:
                if subscription.status == SubscriptionStatus.FROZEN:
                    now = datetime.now(UTC)
                    if subscription.frozen_until and subscription.frozen_until > now:
                        unused_time = subscription.frozen_until - now
                        if "end_date" not in updates:
                            subscription.end_date -= unused_time
                subscription.frozen_until = None
            subscription.status = new_status
        self._validate_management_update(subscription)
        await self.session.commit()
        return (await self.repository.get_by_id(subscription.id)) or subscription

    async def _resolve_plan(self, *, plan_id: str, require_public: bool) -> MembershipPlan:
        plan = await self.plan_repository.get_by_id(plan_id)
        if not plan or not plan.is_active or (require_public and not plan.is_public):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тарифний план не знайдено")
        return plan

    @staticmethod
    def _validate_management_update(subscription: Subscription) -> None:
        if subscription.start_date > subscription.end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Дата завершення абонемента має бути пізніше за дату початку",
            )
        if subscription.status == SubscriptionStatus.FROZEN and subscription.frozen_until is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Щоб призупинити абонемент, скористайтеся заморозкою",
            )
        if (
            subscription.total_visits is not None
            and subscription.remaining_visits is not None
            and subscription.remaining_visits > subscription.total_visits
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Залишок відвідувань не може перевищувати загальну кількість",
            )
