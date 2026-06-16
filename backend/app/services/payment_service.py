from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.branch import DEFAULT_BRANCH_ID
from app.models.membership_plan import MembershipPlan
from app.models.payment import Payment
from app.models.subscription import Subscription
from app.repositories.payment_repository import PaymentRepository

ALLOWED_PAYMENT_METHODS = {"CARD", "CASH"}


class PaymentService:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = PaymentRepository(session)

    def build_plan_payment(
        self,
        subscription: Subscription,
        plan: MembershipPlan,
        method: str = "CARD",
        branch_id: str = DEFAULT_BRANCH_ID,
    ) -> Payment:
        normalized_method = method.upper()
        if normalized_method not in ALLOWED_PAYMENT_METHODS:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Непідтримуваний спосіб оплати")
        return Payment(
            subscription_id=subscription.id,
            amount=plan.price,
            method=normalized_method,
            status="SUCCESS",
            currency=plan.currency,
            branch_id=branch_id,
        )

    async def list_for_user(self, user_id: str) -> list[Payment]:
        return await self.repository.list_by_user(user_id)

    async def list_all(
        self,
        user_id: str | None = None,
        status_filter: str | None = None,
        method: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        branch_id: str | None = None,
    ) -> list[Payment]:
        if start_date and start_date.tzinfo is None:
            start_date = start_date.replace(tzinfo=UTC)
        if end_date and end_date.tzinfo is None:
            end_date = end_date.replace(tzinfo=UTC)
        return await self.repository.list_all(user_id, status_filter, method, start_date, end_date, branch_id)
