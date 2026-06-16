import asyncio
import logging
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import select

from app.core.database import async_session_factory
from app.core.security import hash_password
from app.models.branch import Branch, DEFAULT_BRANCH_ID, StaffBranchAssignment
from app.models.booking import Booking, BookingStatus
from app.models.expense import Expense, ExpenseCategory
from app.models.membership_plan import MembershipPlan
from app.models.payment import Payment
from app.models.subscription import Subscription, SubscriptionStatus, SubscriptionType
from app.models.user import User, UserRole
from app.models.visit import Visit
from app.models.workout_class import WorkoutClass, WorkoutType

logger = logging.getLogger(__name__)
CLUB_TIMEZONE = ZoneInfo("Europe/Kyiv")


async def seed_demo_data() -> None:
    async with async_session_factory() as session:
        users = await _ensure_users(session)
        branches = await _ensure_branches(session)
        plans = await _ensure_membership_plans(session)
        await _ensure_assignments(session, users, branches)
        await _ensure_schedule(session, users["trainer"], branches)
        await _ensure_subscription_and_payment(session, users["client"], plans["monthly"], branches["main"])
        await _ensure_visits(session, users["client"], users["admin"], branches)
        await _ensure_expenses(session, users["owner"], branches)
        await _ensure_historical_demo_data(session, users, plans, branches)
        await session.commit()
        logger.info("Demo seed completed successfully")


async def _ensure_users(session) -> dict[str, User]:
    definitions = {
        "owner": ("owner@example.com", "Owner", "Account", UserRole.OWNER),
        "admin": ("admin@example.com", "Admin", "Account", UserRole.ADMIN),
        "trainer": ("trainer@example.com", "Trainer", "Account", UserRole.TRAINER),
        "client": ("client@example.com", "Client", "Account", UserRole.CLIENT),
        "client2": ("client2@example.com", "Client", "Two", UserRole.CLIENT),
        "client3": ("client3@example.com", "Client", "Three", UserRole.CLIENT),
    }
    result: dict[str, User] = {}
    for key, (email, first_name, last_name, role) in definitions.items():
        user = (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if not user:
            user = User(
                email=email,
                password_hash=hash_password("Password123!"),
                first_name=first_name,
                last_name=last_name,
                role=role,
            )
            session.add(user)
            await session.flush()
        result[key] = user
    return result


async def _ensure_branches(session) -> dict[str, Branch]:
    definitions = {
        "main": (DEFAULT_BRANCH_ID, "Полтава — Центр", "вул. Соборності, 40"),
        "north": ("00000000-0000-0000-0000-000000000002", "Полтава — Поділ", "Панянський узвіз, 12"),
    }
    result: dict[str, Branch] = {}
    for key, (branch_id, name, address) in definitions.items():
        branch = await session.get(Branch, branch_id)
        if not branch:
            branch = Branch(id=branch_id, name=name, address=address, timezone="Europe/Kyiv", is_active=True)
            session.add(branch)
            await session.flush()
        result[key] = branch
    return result


async def _ensure_assignments(session, users: dict[str, User], branches: dict[str, Branch]) -> None:
    for user in (users["admin"], users["trainer"]):
        for branch in branches.values():
            existing = (await session.execute(select(StaffBranchAssignment).where(
                StaffBranchAssignment.user_id == user.id,
                StaffBranchAssignment.branch_id == branch.id,
            ))).scalar_one_or_none()
            if not existing:
                session.add(StaffBranchAssignment(user_id=user.id, branch_id=branch.id))
    await session.flush()


async def _ensure_membership_plans(session) -> dict[str, MembershipPlan]:
    definitions = {
        "monthly": dict(title="Місячний абонемент", description="12 занять протягом 30 днів.", type=SubscriptionType.MONTHLY, duration_days=30, visits_limit=12, price=Decimal("990.00"), currency="UAH", is_active=True, is_public=True),
        "yearly": dict(title="Річний абонемент", description="Річний безлімітний доступ.", type=SubscriptionType.YEARLY, duration_days=365, visits_limit=None, price=Decimal("14900.00"), currency="UAH", is_active=True, is_public=True),
    }
    result: dict[str, MembershipPlan] = {}
    for key, payload in definitions.items():
        plan = (await session.execute(select(MembershipPlan).where(MembershipPlan.title == payload["title"]))).scalar_one_or_none()
        if not plan:
            plan = MembershipPlan(**payload)
            session.add(plan)
            await session.flush()
        result[key] = plan
    return result


async def _ensure_schedule(session, trainer: User, branches: dict[str, Branch]) -> None:
    now = datetime.now(CLUB_TIMEZONE)
    definitions = (
        ("Morning Mobility", branches["main"].id, 1, 9, WorkoutType.GROUP, 12),
        ("Personal Strength", branches["north"].id, 2, 10, WorkoutType.PERSONAL, 1),
    )
    for title, branch_id, plus_days, hour, workout_type, capacity in definitions:
        existing = (await session.execute(select(WorkoutClass).where(WorkoutClass.title == title))).scalar_one_or_none()
        if not existing:
            start = (now + timedelta(days=plus_days)).replace(hour=hour, minute=0, second=0, microsecond=0)
            session.add(WorkoutClass(title=title, trainer_id=trainer.id, branch_id=branch_id, start_time=start, end_time=start + timedelta(hours=1), capacity=capacity, type=workout_type))
    await session.flush()


async def _ensure_subscription_and_payment(session, client: User, plan: MembershipPlan, branch: Branch) -> None:
    subscription = (await session.execute(select(Subscription).where(Subscription.user_id == client.id))).scalars().first()
    if not subscription:
        start = datetime.now(UTC)
        subscription = Subscription(user_id=client.id, plan_id=plan.id, start_date=start, end_date=start + timedelta(days=30), status=SubscriptionStatus.ACTIVE, frozen_until=None, total_visits=plan.visits_limit, remaining_visits=plan.visits_limit)
        session.add(subscription)
        await session.flush()
    payment = (await session.execute(select(Payment).where(Payment.subscription_id == subscription.id))).scalars().first()
    if not payment:
        session.add(Payment(subscription_id=subscription.id, branch_id=branch.id, amount=plan.price, currency=plan.currency, status="SUCCESS", method="CARD"))


async def _ensure_visits(
    session, client: User, checked_in_by: User, branches: dict[str, Branch]
) -> None:
    existing = (await session.execute(select(Visit).where(Visit.user_id == client.id))).scalars().first()
    if existing:
        return
    now = datetime.now(UTC)
    session.add(
        Visit(
            user_id=client.id,
            branch_id=branches["main"].id,
            checked_in_at=now - timedelta(days=2, hours=1),
            checked_out_at=now - timedelta(days=2),
            checked_in_by_id=checked_in_by.id,
        )
    )
    session.add(
        Visit(
            user_id=client.id,
            branch_id=branches["north"].id,
            checked_in_at=now - timedelta(days=5, hours=2),
            checked_out_at=now - timedelta(days=5, minutes=45),
            checked_in_by_id=checked_in_by.id,
        )
    )
    session.add(
        Visit(
            user_id=client.id,
            branch_id=branches["main"].id,
            checked_in_at=now - timedelta(minutes=20),
            checked_out_at=None,
            checked_in_by_id=checked_in_by.id,
        )
    )
    await session.flush()


async def _ensure_expenses(session, owner: User, branches: dict[str, Branch]) -> None:
    existing = (await session.execute(select(Expense))).scalars().first()
    if existing:
        return
    now = datetime.now(UTC)
    definitions = (
        ("main", ExpenseCategory.RENT, Decimal("18000.00"), 20, "Оренда залу — поточний місяць"),
        ("main", ExpenseCategory.UTILITIES, Decimal("4200.00"), 12, "Комунальні послуги"),
        ("main", ExpenseCategory.SALARIES, Decimal("32000.00"), 5, "Зарплати персоналу"),
        ("north", ExpenseCategory.RENT, Decimal("14000.00"), 20, "Оренда залу — поточний місяць"),
        ("north", ExpenseCategory.MARKETING, Decimal("3500.00"), 8, "Таргетована реклама"),
        ("north", ExpenseCategory.EQUIPMENT, Decimal("9800.00"), 30, "Нові гантелі та килимки"),
    )
    for branch_key, category, amount, days_ago, description in definitions:
        session.add(
            Expense(
                branch_id=branches[branch_key].id,
                category=category,
                amount=amount,
                paid_at=now - timedelta(days=days_ago),
                description=description,
                created_by_id=owner.id,
            )
        )
    await session.flush()


async def _ensure_historical_demo_data(
    session,
    users: dict[str, User],
    plans: dict[str, MembershipPlan],
    branches: dict[str, Branch],
) -> None:
    marker = await session.get(Payment, "demo-pay-main-0-0")
    if marker:
        return

    now = datetime.now(UTC).replace(minute=0, second=0, microsecond=0)
    clients = [users["client"], users["client2"], users["client3"]]
    branch_profiles = {
        "main": {
            "revenue_multiplier": Decimal("1.00"),
            "visit_sets": 4,
            "rent": Decimal("18500.00"),
            "salary": Decimal("33000.00"),
            "marketing": Decimal("1800.00"),
            "capacity": 12,
        },
        "north": {
            "revenue_multiplier": Decimal("0.82"),
            "visit_sets": 2,
            "rent": Decimal("14200.00"),
            "salary": Decimal("25000.00"),
            "marketing": Decimal("4200.00"),
            "capacity": 10,
        },
    }

    for month_index in range(5):
        month_anchor = now - timedelta(days=month_index * 30)
        for branch_key, profile in branch_profiles.items():
            branch = branches[branch_key]
            plan = plans["monthly"]
            for client_index, client in enumerate(clients):
                subscription_id = f"demo-sub-{branch_key}-{month_index}-{client_index}"
                subscription = await session.get(Subscription, subscription_id)
                if not subscription:
                    start = month_anchor - timedelta(days=21 - client_index)
                    subscription = Subscription(
                        id=subscription_id,
                        user_id=client.id,
                        plan_id=plan.id,
                        start_date=start,
                        end_date=start + timedelta(days=30),
                        status=SubscriptionStatus.ACTIVE if month_index == 0 else SubscriptionStatus.EXPIRED,
                        frozen_until=None,
                        total_visits=plan.visits_limit,
                        remaining_visits=max((plan.visits_limit or 0) - 4, 0) if plan.visits_limit else None,
                    )
                    session.add(subscription)
                    await session.flush()

                payment_id = f"demo-pay-{branch_key}-{month_index}-{client_index}"
                if not await session.get(Payment, payment_id):
                    session.add(
                        Payment(
                            id=payment_id,
                            subscription_id=subscription.id,
                            branch_id=branch.id,
                            amount=(plan.price * profile["revenue_multiplier"]).quantize(Decimal("0.01")),
                            currency=plan.currency,
                            status="SUCCESS",
                            method="CARD",
                            created_at=month_anchor - timedelta(days=18 - client_index),
                        )
                    )

            expense_items = (
                ("rent", ExpenseCategory.RENT, profile["rent"], "Щомісячна оренда"),
                ("salary", ExpenseCategory.SALARIES, profile["salary"], "Зарплати команди"),
                ("marketing", ExpenseCategory.MARKETING, profile["marketing"], "Локальна реклама"),
            )
            for suffix, category, amount, description in expense_items:
                expense_id = f"demo-exp-{branch_key}-{month_index}-{suffix}"
                if not await session.get(Expense, expense_id):
                    session.add(
                        Expense(
                            id=expense_id,
                            branch_id=branch.id,
                            category=category,
                            amount=amount,
                            paid_at=month_anchor - timedelta(days=10),
                            description=description,
                            created_by_id=users["owner"].id,
                        )
                    )

            for class_index in range(2):
                class_id = f"demo-class-{branch_key}-{month_index}-{class_index}"
                workout_class = await session.get(WorkoutClass, class_id)
                if not workout_class:
                    start = (month_anchor - timedelta(days=class_index * 3 + 3)).replace(
                        hour=18 + class_index,
                    )
                    workout_class = WorkoutClass(
                        id=class_id,
                        title=f"{branch.name} Demo Class {month_index + 1}.{class_index + 1}",
                        trainer_id=users["trainer"].id,
                        branch_id=branch.id,
                        start_time=start,
                        end_time=start + timedelta(hours=1),
                        capacity=profile["capacity"],
                        type=WorkoutType.GROUP,
                    )
                    session.add(workout_class)
                    await session.flush()

                for client_index, client in enumerate(clients):
                    if branch_key == "north" and client_index == 2:
                        continue
                    booking_id = f"demo-book-{branch_key}-{month_index}-{class_index}-{client_index}"
                    if not await session.get(Booking, booking_id):
                        session.add(
                            Booking(
                                id=booking_id,
                                user_id=client.id,
                                class_id=workout_class.id,
                                status=BookingStatus.CONFIRMED,
                            )
                        )

            for client_index, client in enumerate(clients):
                for repeat in range(profile["visit_sets"]):
                    visit_id = f"demo-visit-{branch_key}-{month_index}-{client_index}-{repeat}"
                    if await session.get(Visit, visit_id):
                        continue
                    checked_in_at = (month_anchor - timedelta(days=repeat * 4 + client_index)).replace(
                        hour=8 + ((repeat + client_index) % 12),
                    )
                    session.add(
                        Visit(
                            id=visit_id,
                            user_id=client.id,
                            branch_id=branch.id,
                            booking_id=None,
                            checked_in_at=checked_in_at,
                            checked_out_at=checked_in_at + timedelta(minutes=75),
                            checked_in_by_id=users["admin"].id,
                        )
                    )

    await session.flush()


def main() -> None:
    asyncio.run(seed_demo_data())


if __name__ == "__main__":
    main()
