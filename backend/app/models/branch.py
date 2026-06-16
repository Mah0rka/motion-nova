from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


DEFAULT_BRANCH_ID = "00000000-0000-0000-0000-000000000001"


class Branch(Base, TimestampMixin):
    __tablename__ = "branches"
    __table_args__ = (
        Index("ix_branches_name", "name"),
        Index("ix_branches_is_active", "is_active"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(160))
    address: Mapped[str] = mapped_column(String(255))
    timezone: Mapped[str] = mapped_column(String(64), default="Europe/Kyiv")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    staff_assignments = relationship(
        "StaffBranchAssignment", back_populates="branch", cascade="all, delete-orphan"
    )
    workout_classes = relationship("WorkoutClass", back_populates="branch")
    payments = relationship("Payment", back_populates="branch")


class StaffBranchAssignment(Base, TimestampMixin):
    __tablename__ = "staff_branch_assignments"
    __table_args__ = (
        UniqueConstraint("user_id", "branch_id", name="uq_staff_branch_assignments_user_branch"),
        Index("ix_staff_branch_assignments_user", "user_id"),
        Index("ix_staff_branch_assignments_branch", "branch_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    branch_id: Mapped[str] = mapped_column(ForeignKey("branches.id", ondelete="CASCADE"))

    user = relationship("User", back_populates="staff_branch_assignments")
    branch = relationship("Branch", back_populates="staff_assignments")
