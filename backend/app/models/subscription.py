import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class SubscriptionType(str, enum.Enum):
    MONTHLY = "MONTHLY"
    YEARLY = "YEARLY"
    PAY_AS_YOU_GO = "PAY_AS_YOU_GO"


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    FROZEN = "FROZEN"
    EXPIRED = "EXPIRED"


class Subscription(Base, TimestampMixin):
    __tablename__ = "subscriptions"
    __table_args__ = (
        Index("ix_subscriptions_status", "status"),
        Index("ix_subscriptions_end_date", "end_date"),
        Index("ix_subscriptions_frozen_until", "frozen_until"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    plan_id: Mapped[str] = mapped_column(ForeignKey("membership_plans.id", ondelete="RESTRICT"))
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus, name="subscription_status"), default=SubscriptionStatus.ACTIVE
    )
    frozen_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    total_visits: Mapped[int | None]
    remaining_visits: Mapped[int | None]

    user = relationship("User", back_populates="subscriptions")
    plan = relationship("MembershipPlan", back_populates="subscriptions")
    payments = relationship("Payment", back_populates="subscription")
