from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.booking import BookingStatus
from app.models.workout_class import WorkoutType
from app.schemas.branch import BranchSummary
from app.schemas.user import UserRead


class ScheduleCreate(BaseModel):
    title: str = Field(min_length=2, max_length=255)
    type: WorkoutType
    start_time: datetime = Field(alias="startTime")
    end_time: datetime = Field(alias="endTime")
    capacity: int = Field(ge=1, le=100)
    trainer_id: str | None = Field(default=None, alias="trainerId")


class ScheduleUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=255)
    type: WorkoutType | None = None
    start_time: datetime | None = Field(default=None, alias="startTime")
    end_time: datetime | None = Field(default=None, alias="endTime")
    capacity: int | None = Field(default=None, ge=1, le=100)
    trainer_id: str | None = Field(default=None, alias="trainerId")


class ScheduleCompleteRequest(BaseModel):
    comment: str | None = Field(default=None, max_length=1000)


class BookingSummaryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    status: BookingStatus


class ScheduleAttendeeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    status: BookingStatus
    created_at: datetime
    user: UserRead


class ScheduleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str | None = None
    type: WorkoutType
    branch_id: str
    branch: BranchSummary | None = None
    trainer_id: str
    trainer: UserRead | None = None
    start_time: datetime
    end_time: datetime
    capacity: int
    bookings: list[BookingSummaryRead] = []
    completed_at: datetime | None = None
    completion_comment: str | None = None
    completed_by: UserRead | None = None
    created_at: datetime
    updated_at: datetime


class ScheduleQuery(BaseModel):
    start_datetime: datetime | None = None
    end_datetime: datetime | None = None

    @model_validator(mode="after")
    def validate_range(self):
        if self.start_datetime and self.end_datetime and self.start_datetime > self.end_datetime:
            raise ValueError("start_datetime must be before end_datetime")
        return self
