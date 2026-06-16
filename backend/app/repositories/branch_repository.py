from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.branch import Branch, StaffBranchAssignment


class BranchRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_branches(self, *, include_inactive: bool = False) -> list[Branch]:
        statement = select(Branch).order_by(Branch.name.asc())
        if not include_inactive:
            statement = statement.where(Branch.is_active.is_(True))
        return list((await self.session.execute(statement)).scalars().all())

    async def get_branch(self, branch_id: str) -> Branch | None:
        return await self.session.get(Branch, branch_id)

    async def create_branch(self, branch: Branch) -> Branch:
        self.session.add(branch)
        await self.session.flush()
        return branch

    async def list_user_assignments(self, user_id: str) -> list[StaffBranchAssignment]:
        result = await self.session.execute(
            select(StaffBranchAssignment)
            .where(StaffBranchAssignment.user_id == user_id)
            .options(selectinload(StaffBranchAssignment.branch))
            .order_by(StaffBranchAssignment.branch_id)
        )
        return list(result.scalars().all())

    async def list_branch_assignments(self, branch_id: str) -> list[StaffBranchAssignment]:
        result = await self.session.execute(
            select(StaffBranchAssignment)
            .where(StaffBranchAssignment.branch_id == branch_id)
            .options(selectinload(StaffBranchAssignment.user))
            .order_by(StaffBranchAssignment.created_at)
        )
        return list(result.scalars().all())

    async def get_assignment(self, *, user_id: str, branch_id: str) -> StaffBranchAssignment | None:
        result = await self.session.execute(
            select(StaffBranchAssignment).where(
                StaffBranchAssignment.user_id == user_id,
                StaffBranchAssignment.branch_id == branch_id,
            )
        )
        return result.scalar_one_or_none()
