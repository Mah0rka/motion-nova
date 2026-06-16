import math

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.branch import StaffBranchAssignment
from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository
from app.services.branch_scope import BranchScope
from app.schemas.user import UserAdminCreate, UserAdminUpdate, UserListPage, UserProfileUpdate, UserRead


class UserService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repository = UserRepository(session)

    async def list_users(self, role: UserRole | None = None) -> list[User]:
        return await self.repository.list_all(role)

    async def list_users_page(self, page: int, page_size: int, role: UserRole | None = None) -> UserListPage:
        total = await self.repository.count_filtered(role)
        users = await self.repository.list_page(page=page, page_size=page_size, role=role)
        return UserListPage(
            items=[UserRead.model_validate(user) for user in users],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=max(1, math.ceil(total / page_size)) if total else 1,
        )

    async def update_profile(self, user: User, payload: UserProfileUpdate) -> User:
        for field_name, value in payload.model_dump(exclude_unset=True).items():
            setattr(user, field_name, value.strip() if isinstance(value, str) else value)
        return await self.repository.commit(user)

    async def create_user(
        self, actor: User, payload: UserAdminCreate, branch_scope: BranchScope | None = None
    ) -> User:
        self._ensure_actor_can_manage_role(actor, payload.role)
        if await self.repository.get_by_email(payload.email):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ця електронна пошта вже зареєстрована")
        user = User(
            email=payload.email.lower(),
            password_hash=hash_password(payload.password),
            first_name=payload.first_name.strip(),
            last_name=payload.last_name.strip(),
            phone=payload.phone.strip() if payload.phone else None,
            role=payload.role,
        )
        user = await self.repository.create(user)
        if actor.role == UserRole.ADMIN and user.role == UserRole.TRAINER:
            if branch_scope is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Оберіть філію перед створенням тренера",
                )
            branch_id = branch_scope.require_selected_branch()
            self.session.add(StaffBranchAssignment(user_id=user.id, branch_id=branch_id))
            await self.session.commit()
        return user

    async def update_user(self, actor: User, user_id: str, payload: UserAdminUpdate) -> User:
        user = await self.repository.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Користувача не знайдено")
        if actor.role == UserRole.ADMIN and user.role not in {UserRole.CLIENT, UserRole.TRAINER}:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Адміністратор не може керувати цим користувачем")
        updates = payload.model_dump(exclude_unset=True)
        next_role = updates.get("role")
        if next_role:
            self._ensure_actor_can_manage_role(actor, next_role)
            if actor.role == UserRole.ADMIN and next_role != user.role:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Адміністратор не може змінювати ролі користувачів",
                )
        email = updates.get("email")
        if email and email.lower() != user.email:
            existing = await self.repository.get_by_email(email)
            if existing and existing.id != user.id:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ця електронна пошта вже зареєстрована")
            user.email = email.lower()
        password = updates.pop("password", None)
        if password:
            user.password_hash = hash_password(password)
        for field_name, value in updates.items():
            if field_name != "email":
                setattr(user, field_name, value.strip() if isinstance(value, str) else value)
        return await self.repository.commit(user)

    async def delete_user(self, actor: User, user_id: str) -> None:
        user = await self.repository.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Користувача не знайдено")
        if actor.role != UserRole.OWNER:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Видаляти користувачів може лише власник")
        if actor.id == user.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Не можна видалити власний обліковий запис")
        if user.role == UserRole.OWNER and await self.repository.count_by_role(UserRole.OWNER) <= 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Не можна видалити останнього власника")
        if await self.repository.has_business_relations(user.id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Користувача неможливо видалити: є пов'язані записи",
            )
        await self.repository.delete(user)

    @staticmethod
    def _ensure_actor_can_manage_role(actor: User, target_role: UserRole) -> None:
        if actor.role == UserRole.OWNER:
            return
        if actor.role == UserRole.ADMIN and target_role in {UserRole.CLIENT, UserRole.TRAINER}:
            return
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Керування ролями заборонено")
