import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Index, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin
from app.models.branch import DEFAULT_BRANCH_ID


class Payment(Base, TimestampMixin):
    __tablename__ = "payments"
    __table_args__ = (
        Index("ix_payments_created_at", "created_at"),
        Index("ix_payments_branch_created_at", "branch_id", "created_at"),
        Index("ix_payments_subscription_id", "subscription_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    subscription_id: Mapped[str] = mapped_column(ForeignKey("subscriptions.id", ondelete="RESTRICT"))
    branch_id: Mapped[str] = mapped_column(
        ForeignKey("branches.id", ondelete="RESTRICT"), default=DEFAULT_BRANCH_ID
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    currency: Mapped[str] = mapped_column(String(8), default="UAH")
    status: Mapped[str] = mapped_column(String(32))
    method: Mapped[str] = mapped_column(String(32))

    subscription = relationship("Subscription", back_populates="payments")
    branch = relationship("Branch", back_populates="payments")

    @property
    def user_id(self) -> str:
        """Derived owner of the purchased subscription; not duplicated in the database."""
        return self.subscription.user_id

    @property
    def user(self):
        """Compatibility projection for API responses."""
        return self.subscription.user
