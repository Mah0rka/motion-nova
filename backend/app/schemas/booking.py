from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.booking import BookingStatus
from app.schemas.schedule import ScheduleRead


class BookingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    class_id: str
    status: BookingStatus
    workout_class: ScheduleRead
    created_at: datetime
    updated_at: datetime
