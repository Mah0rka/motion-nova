from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking
from app.models.expense import Expense
from app.models.subscription import Subscription
from app.models.user import User, UserRole
from app.models.visit import Visit
from app.models.workout_class import WorkoutClass


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_email(self, email: str) -> User | None:
        return (await self.session.execute(select(User).where(User.email == email.lower()))).scalar_one_or_none()

    async def get_by_id(self, user_id: str) -> User | None:
        return (await self.session.execute(select(User).where(User.id == user_id))).scalar_one_or_none()

    async def create(self, user: User) -> User:
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def count_all(self) -> int:
        return int((await self.session.execute(select(func.count()).select_from(User))).scalar_one())

    async def count_filtered(self, role: UserRole | None = None) -> int:
        statement = select(func.count()).select_from(User)
        if role:
            statement = statement.where(User.role == role)
        return int((await self.session.execute(statement)).scalar_one())

    async def list_all(self, role: UserRole | None = None) -> list[User]:
        statement = select(User).order_by(User.created_at.desc())
        if role:
            statement = statement.where(User.role == role)
        return list((await self.session.execute(statement)).scalars().all())

    async def list_page(self, page: int, page_size: int, role: UserRole | None = None) -> list[User]:
        statement = select(User).order_by(User.created_at.desc())
        if role:
            statement = statement.where(User.role == role)
        statement = statement.offset((page - 1) * page_size).limit(page_size)
        return list((await self.session.execute(statement)).scalars().all())

    async def commit(self, user: User) -> User:
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def count_by_role(self, role: UserRole) -> int:
        statement = select(func.count()).select_from(User).where(User.role == role)
        return int((await self.session.execute(statement)).scalar_one())

    async def has_business_relations(self, user_id: str) -> bool:
        statements = (
            select(func.count()).select_from(Subscription).where(Subscription.user_id == user_id),
            select(func.count()).select_from(Booking).where(Booking.user_id == user_id),
            select(func.count()).select_from(WorkoutClass).where(WorkoutClass.trainer_id == user_id),
            select(func.count()).select_from(Visit).where(Visit.user_id == user_id),
            select(func.count()).select_from(Visit).where(Visit.checked_in_by_id == user_id),
            select(func.count()).select_from(Expense).where(Expense.created_by_id == user_id),
        )
        for statement in statements:
            if int((await self.session.execute(statement)).scalar_one()) > 0:
                return True
        return False

    async def delete(self, user: User) -> None:
        await self.session.delete(user)
        await self.session.commit()
