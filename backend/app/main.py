import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api import auth, games, users
from app.api.errors import (
    ApiError,
    api_error_handler,
    http_exception_handler,
    validation_error_handler,
)
from app.config import settings
from app.db import Base, engine
from app.ws import router as ws_router
from app.ws.matchmaking import matchmaker
from app.ws.router import ping_reaper


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Dev với SQLite: tạo bảng trực tiếp. Sản xuất PostgreSQL: dùng
    # alembic upgrade head (scaffold trong backend/alembic).
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    matchmaker.start()
    reaper = asyncio.create_task(ping_reaper())
    yield
    matchmaker.stop()
    reaper.cancel()


app = FastAPI(title="Kỳ Đài API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(ApiError, api_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(games.router)
app.include_router(ws_router.router)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
