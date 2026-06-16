from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.expense import ExpenseCategory
from app.schemas.branch import BranchSummary
from app.schemas.user import UserRead


class ExpenseCreate(BaseModel):
    category: ExpenseCategory
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    paid_at: datetime
    description: str | None = Field(default=None, max_length=500)


class ExpenseUpdate(BaseModel):
    category: ExpenseCategory | None = None
    amount: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    paid_at: datetime | None = None
    description: str | None = Field(default=None, max_length=500)


class ExpenseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    branch_id: str
    category: ExpenseCategory
    amount: Decimal
    paid_at: datetime
    description: str | None = None
    created_by_id: str
    created_at: datetime
    branch: BranchSummary | None = None
    created_by: UserRead | None = None
