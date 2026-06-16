from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.workout_class import WorkoutType
from app.schemas.branch import BranchSummary
from app.schemas.user import UserRead


class VisitCheckInRequest(BaseModel):
    user_id: str
    booking_id: str | None = None


class VisitClassSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    type: WorkoutType
    start_time: datetime


class CheckInBookingOption(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workout_class: VisitClassSummary


class VisitRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    branch_id: str
    booking_id: str | None = None
    checked_in_at: datetime
    checked_out_at: datetime | None = None
    checked_in_by_id: str
    created_at: datetime
    user: UserRead
    branch: BranchSummary | None = None
    checked_in_by: UserRead | None = None
    workout_class: VisitClassSummary | None = None
