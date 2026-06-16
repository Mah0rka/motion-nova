from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.branch import Branch, StaffBranchAssignment
from app.models.user import User, UserRole
from app.repositories.branch_repository import BranchRepository
from app.schemas.branch import BranchCreate, BranchUpdate, StaffBranchAssignmentCreate


@dataclass(frozen=True)
class AccessibleBranch:
    branch: Branch


class BranchService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repository = BranchRepository(session)

    async def list_accessible(
        self, current_user: User, *, include_inactive: bool = False
    ) -> list[AccessibleBranch]:
        if current_user.role in {UserRole.OWNER, UserRole.CLIENT}:
            branches = await self.repository.list_branches(
                include_inactive=include_inactive and current_user.role == UserRole.OWNER
            )
            return [AccessibleBranch(branch=branch) for branch in branches]

        assignments = await self.repository.list_user_assignments(current_user.id)
        branches = sorted(
            {assignment.branch.id: assignment.branch for assignment in assignments if assignment.branch.is_active}.values(),
            key=lambda item: item.name,
        )
        return [AccessibleBranch(branch=branch) for branch in branches]

    async def create_branch(self, payload: BranchCreate) -> Branch:
        branch = Branch(**payload.model_dump())
        await self.repository.create_branch(branch)
        await self.session.commit()
        await self.session.refresh(branch)
        return branch

    async def update_branch(self, branch_id: str, payload: BranchUpdate) -> Branch:
        branch = await self._require_branch(branch_id)
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(branch, field, value)
        await self.session.commit()
        await self.session.refresh(branch)
        return branch

    async def list_staff(self, branch_id: str) -> list[StaffBranchAssignment]:
        await self._require_branch(branch_id)
        return await self.repository.list_branch_assignments(branch_id)

    async def assign_staff(
        self, branch_id: str, payload: StaffBranchAssignmentCreate
    ) -> StaffBranchAssignment:
        await self._require_branch(branch_id)
        user = await self.session.get(User, payload.user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Користувача не знайдено")
        if user.role not in {UserRole.ADMIN, UserRole.TRAINER}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Прив'язку до філії можуть отримувати лише адміністратори або тренери",
            )
        assignment = await self.repository.get_assignment(user_id=user.id, branch_id=branch_id)
        if assignment:
            return assignment
        assignment = StaffBranchAssignment(user_id=user.id, branch_id=branch_id)
        self.session.add(assignment)
        await self.session.commit()
        await self.session.refresh(assignment)
        return assignment

    async def remove_staff(self, assignment_id: str) -> None:
        assignment = await self.session.get(StaffBranchAssignment, assignment_id)
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Призначення співробітника не знайдено"
            )
        await self.session.delete(assignment)
        await self.session.commit()

    async def _require_branch(self, branch_id: str) -> Branch:
        branch = await self.repository.get_branch(branch_id)
        if not branch:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Філію не знайдено")
        return branch
