from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.deps import DbDep
from app.api.errors import ApiError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models import User
from app.schemas.auth import AccessTokenOut, LoginIn, RefreshIn, RegisterIn, TokenOut
from app.schemas.user import UserPublic

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _tokens_for(user: User) -> TokenOut:
    return TokenOut(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user=UserPublic.model_validate(user),
    )


@router.post("/register", response_model=TokenOut)
async def register(body: RegisterIn, db: DbDep) -> TokenOut:
    existing = await db.scalar(select(User).where(User.username == body.username))
    if existing:
        raise ApiError(409, "USERNAME_TAKEN", "Tên đăng nhập đã được sử dụng")
    existing = await db.scalar(select(User).where(User.email == body.email))
    if existing:
        raise ApiError(409, "EMAIL_TAKEN", "Email đã được sử dụng")

    user = User(
        username=body.username,
        email=body.email,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        # race hai request đăng ký cùng lúc vượt qua bước kiểm tra SELECT
        await db.rollback()
        raise ApiError(409, "USERNAME_TAKEN", "Tên đăng nhập hoặc email đã được sử dụng")
    await db.refresh(user)
    return _tokens_for(user)


@router.post("/login", response_model=TokenOut)
async def login(body: LoginIn, db: DbDep) -> TokenOut:
    user = await db.scalar(select(User).where(User.username == body.username))
    if user is None or not verify_password(body.password, user.password_hash):
        raise ApiError(
            401, "INVALID_CREDENTIALS", "Tên đăng nhập hoặc mật khẩu không đúng"
        )
    return _tokens_for(user)


@router.post("/refresh", response_model=AccessTokenOut)
async def refresh(body: RefreshIn, db: DbDep) -> AccessTokenOut:
    user_id = decode_token(body.refresh_token, "refresh")
    if user_id is None:
        raise ApiError(401, "INVALID_REFRESH_TOKEN", "Refresh token không hợp lệ")
    user = await db.get(User, user_id)
    if user is None:
        raise ApiError(401, "INVALID_REFRESH_TOKEN", "Tài khoản không tồn tại")
    return AccessTokenOut(access_token=create_access_token(user.id))
