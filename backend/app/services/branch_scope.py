from __future__ import annotations

from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.repositories.branch_repository import BranchRepository


@dataclass(frozen=True)
class BranchScope:
    selected_branch_id: str | None
    allowed_branch_ids: frozenset[str]
    is_network_wide: bool

    def allows(self, branch_id: str) -> bool:
        return branch_id in self.allowed_branch_ids

    def require_selected_branch(self) -> str:
        if self.selected_branch_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Оберіть філію перед виконанням цієї дії",
            )
        return self.selected_branch_id


def ensure_branch_access(scope: BranchScope, branch_id: str) -> None:
    if not scope.allows(branch_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Немає доступу до цієї філії")


def ensure_branch_role(scope: BranchScope, current_user: User, branch_id: str, *roles: UserRole) -> None:
    ensure_branch_access(scope, branch_id)
    if current_user.role == UserRole.OWNER:
        return
    if current_user.role not in set(roles):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостатньо прав для цієї філії")


async def resolve_branch_scope(
    session: AsyncSession,
    current_user: User,
    requested_branch_id: str | None,
) -> BranchScope:
    repository = BranchRepository(session)
    active_branches = await repository.list_branches()
    active_branch_ids = frozenset(branch.id for branch in active_branches)

    if requested_branch_id and requested_branch_id not in active_branch_ids:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Філію не знайдено")

    if current_user.role in {UserRole.OWNER, UserRole.CLIENT}:
        return BranchScope(
            selected_branch_id=requested_branch_id,
            allowed_branch_ids=active_branch_ids,
            is_network_wide=requested_branch_id is None,
        )

    assignments = await repository.list_user_assignments(current_user.id)
    allowed_branch_ids = frozenset(
        assignment.branch_id for assignment in assignments if assignment.branch.is_active
    )
    if not allowed_branch_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Немає активної прив'язки до філії")

    if requested_branch_id:
        if requested_branch_id not in allowed_branch_ids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Немає доступу до цієї філії")
        selected_branch_id = requested_branch_id
    elif len(allowed_branch_ids) == 1:
        selected_branch_id = next(iter(allowed_branch_ids))
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Оберіть філію перед виконанням цієї дії",
        )

    return BranchScope(
        selected_branch_id=selected_branch_id,
        allowed_branch_ids=allowed_branch_ids,
        is_network_wide=False,
    )


def ensure_management_scope(scope: BranchScope, current_user: User) -> str | None:
    if current_user.role == UserRole.OWNER:
        return scope.selected_branch_id
    branch_id = scope.require_selected_branch()
    ensure_branch_role(scope, current_user, branch_id, UserRole.ADMIN)
    return branch_id
