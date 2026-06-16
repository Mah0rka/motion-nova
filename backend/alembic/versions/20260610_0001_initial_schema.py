"""initial schema (consolidated diploma scope)

Single migration that builds the final 10-table domain directly. The system has
no deployed database yet, so the historical incremental migrations were collapsed
into this one for a clean, defendable schema.

Revision ID: 20260610_0001
Revises:
Create Date: 2026-06-10 21:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260610_0001"
down_revision: str | None = None
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


user_role = postgresql.ENUM(
    "CLIENT", "TRAINER", "ADMIN", "OWNER", name="user_role", create_type=False
)
subscription_type = postgresql.ENUM(
    "MONTHLY", "YEARLY", "PAY_AS_YOU_GO", name="subscription_type", create_type=False
)
subscription_status = postgresql.ENUM(
    "ACTIVE", "FROZEN", "EXPIRED", name="subscription_status", create_type=False
)
workout_type = postgresql.ENUM("GROUP", "PERSONAL", name="workout_type", create_type=False)
booking_status = postgresql.ENUM("CONFIRMED", "CANCELLED", name="booking_status", create_type=False)
expense_category = postgresql.ENUM(
    "RENT", "UTILITIES", "SALARIES", "MARKETING", "EQUIPMENT", "OTHER",
    name="expense_category", create_type=False,
)


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    ]


def upgrade() -> None:
    bind = op.get_bind()
    for enum_type in (
        user_role,
        subscription_type,
        subscription_status,
        workout_type,
        booking_status,
        expense_category,
    ):
        enum_type.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=512), nullable=False),
        sa.Column("role", user_role, nullable=False, server_default="CLIENT"),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=True),
        *_timestamps(),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "branches",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("address", sa.String(length=255), nullable=False),
        sa.Column("timezone", sa.String(length=64), nullable=False, server_default="Europe/Kyiv"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        *_timestamps(),
    )
    op.create_index("ix_branches_name", "branches", ["name"])
    op.create_index("ix_branches_is_active", "branches", ["is_active"])

    op.create_table(
        "staff_branch_assignments",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("branch_id", sa.String(length=36), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_staff_branch_assignments_user_id_users", ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["branch_id"], ["branches.id"], name="fk_staff_branch_assignments_branch_id_branches", ondelete="CASCADE"
        ),
        sa.UniqueConstraint("user_id", "branch_id", name="uq_staff_branch_assignments_user_branch"),
    )
    op.create_index("ix_staff_branch_assignments_user", "staff_branch_assignments", ["user_id"])
    op.create_index("ix_staff_branch_assignments_branch", "staff_branch_assignments", ["branch_id"])

    op.create_table(
        "membership_plans",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("type", subscription_type, nullable=False),
        sa.Column("duration_days", sa.Integer(), nullable=False),
        sa.Column("visits_limit", sa.Integer(), nullable=True),
        sa.Column("price", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="UAH"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.true()),
        *_timestamps(),
    )
    op.create_index("ix_membership_plans_is_active", "membership_plans", ["is_active"])
    op.create_index("ix_membership_plans_is_public", "membership_plans", ["is_public"])

    op.create_table(
        "subscriptions",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("plan_id", sa.String(length=36), nullable=False),
        sa.Column("start_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", subscription_status, nullable=False, server_default="ACTIVE"),
        sa.Column("frozen_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("total_visits", sa.Integer(), nullable=True),
        sa.Column("remaining_visits", sa.Integer(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_subscriptions_user_id_users", ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["plan_id"], ["membership_plans.id"], name="fk_subscriptions_plan_id_membership_plans", ondelete="RESTRICT"
        ),
    )
    op.create_index("ix_subscriptions_status", "subscriptions", ["status"])
    op.create_index("ix_subscriptions_end_date", "subscriptions", ["end_date"])
    op.create_index("ix_subscriptions_frozen_until", "subscriptions", ["frozen_until"])

    op.create_table(
        "payments",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("subscription_id", sa.String(length=36), nullable=False),
        sa.Column("branch_id", sa.String(length=36), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="UAH"),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("method", sa.String(length=32), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["subscription_id"], ["subscriptions.id"], name="fk_payments_subscription_id_subscriptions", ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["branch_id"], ["branches.id"], name="fk_payments_branch_id_branches", ondelete="RESTRICT"
        ),
    )
    op.create_index("ix_payments_created_at", "payments", ["created_at"])
    op.create_index("ix_payments_branch_created_at", "payments", ["branch_id", "created_at"])
    op.create_index("ix_payments_subscription_id", "payments", ["subscription_id"])

    op.create_table(
        "workout_classes",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("trainer_id", sa.String(length=36), nullable=False),
        sa.Column("branch_id", sa.String(length=36), nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.Column("type", workout_type, nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completion_comment", sa.Text(), nullable=True),
        sa.Column("completed_by_id", sa.String(length=36), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["trainer_id"], ["users.id"], name="fk_workout_classes_trainer_id_users", ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["branch_id"], ["branches.id"], name="fk_workout_classes_branch_id_branches", ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["completed_by_id"], ["users.id"], name="fk_workout_classes_completed_by_id_users", ondelete="SET NULL"
        ),
    )
    op.create_index("ix_workout_classes_start_time", "workout_classes", ["start_time"])
    op.create_index("ix_workout_classes_branch_start", "workout_classes", ["branch_id", "start_time"])

    op.create_table(
        "bookings",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("class_id", sa.String(length=36), nullable=False),
        sa.Column("status", booking_status, nullable=False, server_default="CONFIRMED"),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_bookings_user_id_users", ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["class_id"], ["workout_classes.id"], name="fk_bookings_class_id_workout_classes", ondelete="CASCADE"
        ),
        sa.UniqueConstraint("user_id", "class_id", name="uq_bookings_user_class"),
    )
    op.create_index("ix_bookings_user_class", "bookings", ["user_id", "class_id"])

    op.create_table(
        "visits",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("branch_id", sa.String(length=36), nullable=False),
        sa.Column("booking_id", sa.String(length=36), nullable=True),
        sa.Column("checked_in_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("checked_out_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("checked_in_by_id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_visits_user_id_users", ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["branch_id"], ["branches.id"], name="fk_visits_branch_id_branches", ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["booking_id"], ["bookings.id"], name="fk_visits_booking_id_bookings", ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["checked_in_by_id"], ["users.id"], name="fk_visits_checked_in_by_id_users", ondelete="RESTRICT"
        ),
    )
    op.create_index("ix_visits_branch_active", "visits", ["branch_id", "checked_out_at"])
    op.create_index("ix_visits_user_active", "visits", ["user_id", "checked_out_at"])
    op.create_index("ix_visits_checked_in_at", "visits", ["checked_in_at"])

    op.create_table(
        "expenses",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("branch_id", sa.String(length=36), nullable=False),
        sa.Column("category", expense_category, nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_by_id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(
            ["branch_id"], ["branches.id"], name="fk_expenses_branch_id_branches", ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["created_by_id"], ["users.id"], name="fk_expenses_created_by_id_users", ondelete="RESTRICT"
        ),
    )
    op.create_index("ix_expenses_branch_paid_at", "expenses", ["branch_id", "paid_at"])
    op.create_index("ix_expenses_paid_at", "expenses", ["paid_at"])


def downgrade() -> None:
    op.drop_table("expenses")
    op.drop_table("visits")
    op.drop_index("ix_bookings_user_class", table_name="bookings")
    op.drop_table("bookings")
    op.drop_table("workout_classes")
    op.drop_table("payments")
    op.drop_table("subscriptions")
    op.drop_table("membership_plans")
    op.drop_table("staff_branch_assignments")
    op.drop_table("branches")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

    bind = op.get_bind()
    for enum_type in (
        expense_category,
        booking_status,
        workout_type,
        subscription_status,
        subscription_type,
        user_role,
    ):
        enum_type.drop(bind, checkfirst=True)
