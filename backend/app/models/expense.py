import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class ExpenseCategory(str, enum.Enum):
    RENT = "RENT"
    UTILITIES = "UTILITIES"
    SALARIES = "SALARIES"
    MARKETING = "MARKETING"
    EQUIPMENT = "EQUIPMENT"
    OTHER = "OTHER"


class Expense(Base):
    __tablename__ = "expenses"
    __table_args__ = (
        Index("ix_expenses_branch_paid_at", "branch_id", "paid_at"),
        Index("ix_expenses_paid_at", "paid_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    branch_id: Mapped[str] = mapped_column(ForeignKey("branches.id", ondelete="RESTRICT"))
    category: Mapped[ExpenseCategory] = mapped_column(Enum(ExpenseCategory, name="expense_category"))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    paid_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    description: Mapped[str | None] = mapped_column(Text(), nullable=True)
    created_by_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    branch = relationship("Branch", foreign_keys=[branch_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
