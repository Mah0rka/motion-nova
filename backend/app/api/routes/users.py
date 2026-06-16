from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.docs import (
    AUTH_REQUIRED_RESPONSE,
    PERMISSION_DENIED_RESPONSE,
    USER_EXAMPLE,
    VALIDATION_ERROR_RESPONSE,
    bad_request_response,
    conflict_response,
    merge_responses,
    no_content_response,
    not_found_response,
    response_example,
)
from app.api.deps import get_branch_scope, get_current_user, get_db_session, require_roles
from app.models.user import User, UserRole
from app.schemas.user import (
    UserAdminCreate,
    UserAdminUpdate,
    UserListPage,
    UserProfileUpdate,
    UserRead,
)
from app.services.branch_scope import BranchScope
from app.services.user_service import UserService

router = APIRouter()


@router.get(
    "/profile",
    response_model=UserRead,
    summary="Отримати власний профіль",
    description="Повертає профіль поточного авторизованого користувача.",
    responses=merge_responses(
        {200: response_example("Поточний профіль користувача.", USER_EXAMPLE)},
        AUTH_REQUIRED_RESPONSE,
    ),
)
async def profile(current_user: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current_user)


@router.patch(
    "/profile",
    response_model=UserRead,
    summary="Оновити власний профіль",
    description="Дозволяє користувачу змінити особисті дані без доступу до адміністративних полів.",
    responses=merge_responses(
        {
            200: response_example(
                "Профіль успішно оновлено.",
                {**USER_EXAMPLE, "first_name": "Анна-Марія", "phone": "+380501112244"},
            )
        },
        AUTH_REQUIRED_RESPONSE,
        VALIDATION_ERROR_RESPONSE,
    ),
)
async def update_profile(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> UserRead:
    service = UserService(db)
    user = await service.update_profile(current_user, payload)
    return UserRead.model_validate(user)


@router.get(
    "",
    response_model=list[UserRead],
    summary="Отримати список користувачів",
    description="Адміністративний список користувачів з необов'язковим фільтром за роллю.",
    responses=merge_responses(
        {200: response_example("Список користувачів.", [USER_EXAMPLE])},
        AUTH_REQUIRED_RESPONSE,
        PERMISSION_DENIED_RESPONSE,
        VALIDATION_ERROR_RESPONSE,
    ),
)
async def list_users(
    role: UserRole | None = Query(
        default=None,
        description="Необов'язковий фільтр за роллю користувача.",
        examples=["TRAINER"],
    ),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.OWNER)),
    db: AsyncSession = Depends(get_db_session),
) -> list[UserRead]:
    service = UserService(db)
    users = await service.list_users(role)
    return [UserRead.model_validate(user) for user in users]


@router.get(
    "/paginated",
    response_model=UserListPage,
    summary="Отримати сторінку користувачів",
    description="Повертає сторінку адміністративного списку користувачів з метаданими пагінації.",
    responses=merge_responses(
        {
            200: response_example(
                "Сторінка користувачів.",
                {
                    "items": [USER_EXAMPLE],
                    "total": 37,
                    "page": 2,
                    "page_size": 10,
                    "total_pages": 4,
                },
            )
        },
        AUTH_REQUIRED_RESPONSE,
        PERMISSION_DENIED_RESPONSE,
        VALIDATION_ERROR_RESPONSE,
    ),
)
async def list_users_paginated(
    role: UserRole | None = Query(
        default=None,
        description="Необов'язковий фільтр за роллю користувача.",
        examples=["TRAINER"],
    ),
    page: int = Query(default=1, ge=1, description="Номер сторінки, починаючи з 1."),
    page_size: int = Query(default=10, ge=1, le=100, description="Кількість записів на сторінці."),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.OWNER)),
    db: AsyncSession = Depends(get_db_session),
) -> UserListPage:
    service = UserService(db)
    return await service.list_users_page(page=page, page_size=page_size, role=role)


@router.post(
    "",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Створити користувача",
    description="Створює користувача з адміністративного інтерфейсу.",
    responses=merge_responses(
        {
            201: response_example(
                "Користувача успішно створено.", {**USER_EXAMPLE, **{"role": "TRAINER"}}
            )
        },
        conflict_response("Email уже зайнятий іншим користувачем.", "Email already registered"),
        AUTH_REQUIRED_RESPONSE,
        PERMISSION_DENIED_RESPONSE,
        VALIDATION_ERROR_RESPONSE,
    ),
)
async def create_user(
    payload: UserAdminCreate,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.OWNER)),
    db: AsyncSession = Depends(get_db_session),
    branch_scope: BranchScope = Depends(get_branch_scope),
) -> UserRead:
    service = UserService(db)
    user = await service.create_user(current_user, payload, branch_scope)
    return UserRead.model_validate(user)


@router.patch(
    "/{user_id}",
    response_model=UserRead,
    summary="Оновити користувача",
    description="Оновлює будь-які дозволені поля користувача з адміністративного інтерфейсу.",
    responses=merge_responses(
        {200: response_example("Користувача успішно оновлено.", {**USER_EXAMPLE, "role": "ADMIN"})},
        not_found_response("Користувача не знайдено.", "User not found"),
        conflict_response(
            "Новий email уже використовується іншим користувачем.", "Email already registered"
        ),
        AUTH_REQUIRED_RESPONSE,
        PERMISSION_DENIED_RESPONSE,
        VALIDATION_ERROR_RESPONSE,
    ),
)
async def update_user(
    user_id: Annotated[
        str,
        Path(
            description="Ідентифікатор користувача, якого треба змінити.",
            examples=["user-7f6c4d4c"],
        ),
    ],
    payload: UserAdminUpdate,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.OWNER)),
    db: AsyncSession = Depends(get_db_session),
) -> UserRead:
    service = UserService(db)
    user = await service.update_user(current_user, user_id, payload)
    return UserRead.model_validate(user)


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Видалити користувача",
    description=(
        "Видаляє користувача з перевірками безпеки: не можна видалити себе або останнього власника."
    ),
    responses=merge_responses(
        {204: no_content_response("Користувача успішно видалено.")},
        bad_request_response(
            "Операція заблокована правилами безпеки.",
            "You cannot delete your own account",
        ),
        not_found_response("Користувача не знайдено.", "User not found"),
        AUTH_REQUIRED_RESPONSE,
        PERMISSION_DENIED_RESPONSE,
        VALIDATION_ERROR_RESPONSE,
    ),
)
async def delete_user(
    user_id: str = Path(
        description="Ідентифікатор користувача, якого треба видалити.",
        examples=["user-7f6c4d4c"],
    ),
    current_user: User = Depends(require_roles(UserRole.OWNER)),
    db: AsyncSession = Depends(get_db_session),
) -> None:
    service = UserService(db)
    await service.delete_user(current_user, user_id)
