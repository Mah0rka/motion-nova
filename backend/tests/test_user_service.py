import pytest
from fastapi import HTTPException

from app.models.user import UserRole
from app.schemas.user import UserAdminCreate, UserAdminUpdate
from app.services.user_service import UserService
from tests.factories import add_branch, add_class, add_user, assign_staff


def payload(email: str, role: UserRole) -> UserAdminCreate:
    return UserAdminCreate(email=email, password="Password123!", first_name="Test", last_name="User", role=role)


@pytest.mark.asyncio
async def test_owner_can_create_and_update_users(db_session):
    owner = await add_user(db_session, "owner@example.com", UserRole.OWNER)
    await db_session.commit()
    service = UserService(db_session)

    created = await service.create_user(owner, payload("trainer@example.com", UserRole.TRAINER))
    updated = await service.update_user(owner, created.id, UserAdminUpdate(first_name="Coach"))

    assert updated.first_name == "Coach"
    assert updated.role == UserRole.TRAINER


@pytest.mark.asyncio
async def test_admin_can_create_client_or_trainer_but_not_admin(db_session):
    admin = await add_user(db_session, "admin@example.com", UserRole.ADMIN)
    await db_session.commit()
    service = UserService(db_session)

    client = await service.create_user(admin, payload("client@example.com", UserRole.CLIENT))
    assert client.role == UserRole.CLIENT
    with pytest.raises(HTTPException) as error:
        await service.create_user(admin, payload("second-admin@example.com", UserRole.ADMIN))
    assert error.value.status_code == 403


@pytest.mark.asyncio
async def test_owner_can_delete_unrelated_user_but_not_self(db_session):
    owner = await add_user(db_session, "owner@example.com", UserRole.OWNER)
    client = await add_user(db_session, "client@example.com")
    await db_session.commit()
    service = UserService(db_session)

    await service.delete_user(owner, client.id)
    assert await service.repository.get_by_id(client.id) is None

    with pytest.raises(HTTPException) as error:
        await service.delete_user(owner, owner.id)
    assert error.value.status_code == 400


@pytest.mark.asyncio
async def test_user_with_business_records_cannot_be_deleted(db_session):
    owner = await add_user(db_session, "owner@example.com", UserRole.OWNER)
    trainer = await add_user(db_session, "trainer@example.com", UserRole.TRAINER)
    branch = await add_branch(db_session)
    await assign_staff(db_session, trainer, branch)
    await add_class(db_session, trainer, branch)
    await db_session.commit()

    with pytest.raises(HTTPException) as error:
        await UserService(db_session).delete_user(owner, trainer.id)
    assert error.value.status_code == 409
