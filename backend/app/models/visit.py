import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Visit(Base):
    __tablename__ = "visits"
    __table_args__ = (
        Index("ix_visits_branch_active", "branch_id", "checked_out_at"),
        Index("ix_visits_user_active", "user_id", "checked_out_at"),
        Index("ix_visits_checked_in_at", "checked_in_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    branch_id: Mapped[str] = mapped_column(ForeignKey("branches.id", ondelete="RESTRICT"))
    booking_id: Mapped[str | None] = mapped_column(
        ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True
    )
    checked_in_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    checked_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    checked_in_by_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])
    branch = relationship("Branch", foreign_keys=[branch_id])
    booking = relationship("Booking", foreign_keys=[booking_id])
    checked_in_by = relationship("User", foreign_keys=[checked_in_by_id])

    @property
    def workout_class(self):
        """Заняття відвідування виводиться через повʼязане бронювання, без дублювання в таблиці."""
        return self.booking.workout_class if self.booking else None
