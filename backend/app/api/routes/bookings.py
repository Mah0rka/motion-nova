from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db_session, require_roles
from app.models.user import User, UserRole
from app.schemas.booking import BookingRead
from app.services.booking_service import BookingService

router = APIRouter()


@router.post("/{class_id}", response_model=BookingRead, status_code=status.HTTP_201_CREATED)
async def create_booking(
    class_id: str,
    current_user: User = Depends(require_roles(UserRole.CLIENT)),
    db: AsyncSession = Depends(get_db_session),
) -> BookingRead:
    return BookingRead.model_validate(await BookingService(db).create_booking(current_user.id, class_id))


@router.get("", response_model=list[BookingRead])
async def list_bookings(
    current_user: User = Depends(require_roles(UserRole.CLIENT)),
    db: AsyncSession = Depends(get_db_session),
) -> list[BookingRead]:
    bookings = await BookingService(db).list_for_user(current_user.id)
    return [BookingRead.model_validate(item) for item in bookings]


@router.patch("/{booking_id}/cancel", response_model=BookingRead)
async def cancel_booking(
    booking_id: str,
    current_user: User = Depends(require_roles(UserRole.CLIENT)),
    db: AsyncSession = Depends(get_db_session),
) -> BookingRead:
    return BookingRead.model_validate(await BookingService(db).cancel_booking(current_user.id, booking_id))
