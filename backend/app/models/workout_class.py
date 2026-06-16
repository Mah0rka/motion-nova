import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin
from app.models.branch import DEFAULT_BRANCH_ID


class WorkoutType(str, enum.Enum):
    GROUP = "GROUP"
    PERSONAL = "PERSONAL"


class WorkoutClass(Base, TimestampMixin):
    __tablename__ = "workout_classes"
    __table_args__ = (
        Index("ix_workout_classes_start_time", "start_time"),
        Index("ix_workout_classes_branch_start", "branch_id", "start_time"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    trainer_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    branch_id: Mapped[str] = mapped_column(
        ForeignKey("branches.id", ondelete="RESTRICT"), default=DEFAULT_BRANCH_ID
    )
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    capacity: Mapped[int] = mapped_column(Integer)
    type: Mapped[WorkoutType] = mapped_column(Enum(WorkoutType, name="workout_type"))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completion_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    completed_by_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    trainer = relationship("User", back_populates="classes", foreign_keys=[trainer_id])
    branch = relationship("Branch", back_populates="workout_classes")
    bookings = relationship("Booking", back_populates="workout_class", cascade="all, delete-orphan")
    completed_by = relationship("User", foreign_keys=[completed_by_id])
