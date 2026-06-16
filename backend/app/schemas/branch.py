from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserRead


class BranchCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    address: str = Field(min_length=2, max_length=255)
    timezone: str = Field(default="Europe/Kyiv", min_length=2, max_length=64)


class BranchUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    address: str | None = Field(default=None, min_length=2, max_length=255)
    timezone: str | None = Field(default=None, min_length=2, max_length=64)
    is_active: bool | None = None


class BranchSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    address: str
    timezone: str
    is_active: bool


class BranchRead(BranchSummary):
    created_at: datetime
    updated_at: datetime


class AccessibleBranchRead(BranchRead):
    pass


class StaffBranchAssignmentCreate(BaseModel):
    user_id: str


class StaffBranchAssignmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    branch_id: str
    user: UserRead | None = None
    created_at: datetime
    updated_at: datetime
