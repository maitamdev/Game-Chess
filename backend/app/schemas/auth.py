import re

from pydantic import BaseModel, EmailStr, field_validator

from app.schemas.user import UserPublic

USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]{3,20}$")


class RegisterIn(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        if not USERNAME_RE.match(v):
            raise ValueError(
                "Tên đăng nhập 3–20 ký tự, chỉ gồm chữ cái, số và dấu gạch dưới"
            )
        return v

    @field_validator("email", mode="after")
    @classmethod
    def email_lowercase(cls, v: str) -> str:
        # chuẩn hoá chữ thường để unique constraint không phân biệt hoa/thường
        return v.lower()

    @field_validator("password")
    @classmethod
    def password_valid(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Mật khẩu tối thiểu 8 ký tự")
        # bcrypt giới hạn 72 byte (tiếng Việt 2–4 byte/ký tự)
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Mật khẩu tối đa 72 byte")
        return v


class LoginIn(BaseModel):
    username: str
    password: str


class RefreshIn(BaseModel):
    refresh_token: str


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    user: UserPublic


class AccessTokenOut(BaseModel):
    access_token: str
