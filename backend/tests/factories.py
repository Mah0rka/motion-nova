from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking, BookingStatus
from app.models.branch import Branch, StaffBranchAssignment
from app.models.expense import Expense, ExpenseCategory
from app.models.membership_plan import MembershipPlan
from app.models.subscription import Subscription, SubscriptionStatus, SubscriptionType
from app.models.user import User, UserRole
from app.models.visit import Visit
from app.models.workout_class import WorkoutClass, WorkoutType


async def add_user(session: AsyncSession, email: str, role: UserRole = UserRole.CLIENT) -> User:
    user = User(
        email=email,
        password_hash="hash",
        first_name=email.split("@")[0].title(),
        last_name="User",
        role=role,
    )
    session.add(user)
    await session.flush()
    return user


async def add_branch(session: AsyncSession, name: str = "Центр", *, active: bool = True) -> Branch:
    branch = Branch(name=name, address=f"{name} address", timezone="Europe/Kyiv", is_active=active)
    session.add(branch)
    await session.flush()
    return branch


async def assign_staff(session: AsyncSession, user: User, branch: Branch) -> StaffBranchAssignment:
    assignment = StaffBranchAssignment(user_id=user.id, branch_id=branch.id)
    session.add(assignment)
    await session.flush()
    return assignment


async def add_plan(
    session: AsyncSession,
    *,
    title: str = "Місячний",
    price: Decimal = Decimal("1200.00"),
    visits_limit: int | None = 12,
) -> MembershipPlan:
    plan = MembershipPlan(
        title=title,
        description=None,
        type=SubscriptionType.MONTHLY,
        duration_days=30,
        visits_limit=visits_limit,
        price=price,
        currency="UAH",
        is_active=True,
        is_public=True,
    )
    session.add(plan)
    await session.flush()
    return plan


async def add_subscription(
    session: AsyncSession,
    user: User,
    plan: MembershipPlan,
    *,
    remaining_visits: int | None = 12,
) -> Subscription:
    now = datetime.now(UTC)
    subscription = Subscription(
        user_id=user.id,
        plan_id=plan.id,
        start_date=now,
        end_date=now + timedelta(days=30),
        status=SubscriptionStatus.ACTIVE,
        frozen_until=None,
        total_visits=plan.visits_limit,
        remaining_visits=remaining_visits,
    )
    session.add(subscription)
    await session.flush()
    return subscription


async def add_class(
    session: AsyncSession,
    trainer: User,
    branch: Branch,
    *,
    title: str = "Functional",
    start_time: datetime | None = None,
    capacity: int = 10,
) -> WorkoutClass:
    start = start_time or (datetime.now(UTC) + timedelta(days=2)).replace(hour=10, minute=0, second=0, microsecond=0)
    workout_class = WorkoutClass(
        title=title,
        trainer_id=trainer.id,
        branch_id=branch.id,
        start_time=start,
        end_time=start + timedelta(hours=1),
        capacity=capacity,
        type=WorkoutType.GROUP,
    )
    session.add(workout_class)
    await session.flush()
    return workout_class


async def add_booking(session: AsyncSession, user: User, workout_class: WorkoutClass) -> Booking:
    booking = Booking(user_id=user.id, class_id=workout_class.id, status=BookingStatus.CONFIRMED)
    session.add(booking)
    await session.flush()
    return booking


async def add_visit(
    session: AsyncSession,
    user: User,
    branch: Branch,
    *,
    checked_in_at: datetime,
    checked_out_at: datetime | None = None,
    checked_in_by: User | None = None,
    booking: Booking | None = None,
) -> Visit:
    visit = Visit(
        user_id=user.id,
        branch_id=branch.id,
        booking_id=booking.id if booking else None,
        checked_in_at=checked_in_at,
        checked_out_at=checked_out_at,
        checked_in_by_id=(checked_in_by or user).id,
    )
    session.add(visit)
    await session.flush()
    return visit


async def add_expense(
    session: AsyncSession,
    branch: Branch,
    created_by: User,
    *,
    amount: Decimal,
    paid_at: datetime,
    category: ExpenseCategory = ExpenseCategory.RENT,
) -> Expense:
    expense = Expense(
        branch_id=branch.id,
        category=category,
        amount=amount,
        paid_at=paid_at,
        description=None,
        created_by_id=created_by.id,
    )
    session.add(expense)
    await session.flush()
    return expense
