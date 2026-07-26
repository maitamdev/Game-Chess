from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import ApiError
from app.core.security import decode_token
from app.db import get_db
from app.models import User

DbDep = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    db: DbDep, authorization: Annotated[str | None, Header()] = None
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise ApiError(401, "UNAUTHORIZED", "Thiếu access token")
    user_id = decode_token(authorization.removeprefix("Bearer "), "access")
    if user_id is None:
        raise ApiError(401, "UNAUTHORIZED", "Access token không hợp lệ hoặc đã hết hạn")
    user = await db.get(User, user_id)
    if user is None:
        raise ApiError(401, "UNAUTHORIZED", "Tài khoản không tồn tại")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
