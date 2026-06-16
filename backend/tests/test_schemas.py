from datetime import UTC, datetime, timedelta

from app.models.workout_class import WorkoutType
from app.schemas.schedule import ScheduleCreate
from app.schemas.user import UserRead


def test_schedule_schema_contains_only_single_class_fields():
    start = datetime.now(UTC) + timedelta(days=1)
    ScheduleCreate(title="Functional", type=WorkoutType.GROUP, startTime=start, endTime=start + timedelta(hours=1), capacity=10)
    assert "recurrence" not in ScheduleCreate.model_fields
    assert "is_paid_extra" not in ScheduleCreate.model_fields


def test_user_read_has_no_verification_flag():
    assert "is_verified" not in UserRead.model_fields
