from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.schemas.branch import BranchSummary
from app.schemas.user import UserRead


class PaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    subscription_id: str
    user_id: str
    branch_id: str
    amount: Decimal
    currency: str
    status: str
    method: str
    user: UserRead | None = None
    branch: BranchSummary | None = None
    created_at: datetime
    updated_at: datetime
