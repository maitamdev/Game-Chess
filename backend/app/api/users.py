from typing import Literal

from fastapi import APIRouter, Query
from sqlalchemy import func, or_, select

from app.api.deps import CurrentUser, DbDep
from app.api.errors import ApiError
from app.models import Game, RatingHistory, User
from app.schemas.game import GamesPage, GameSummary, PlayerBrief
from app.schemas.user import RatingPoint, UserPublic

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserPublic)
async def me(user: CurrentUser) -> UserPublic:
    return UserPublic.model_validate(user)


async def _get_user_or_404(db: DbDep, username: str) -> User:
    user = await db.scalar(select(User).where(User.username == username))
    if user is None:
        raise ApiError(404, "USER_NOT_FOUND", "Không tìm thấy người chơi")
    return user


@router.get("/{username}", response_model=UserPublic)
async def public_profile(username: str, db: DbDep) -> UserPublic:
    user = await _get_user_or_404(db, username)
    return UserPublic.model_validate(user)


def game_summary(game: Game, white: User, black: User) -> GameSummary:
    return GameSummary(
        id=game.id,
        white=PlayerBrief.model_validate(white),
        black=PlayerBrief.model_validate(black),
        variant=game.variant,
        time_control=game.time_control,
        result=game.result,
        termination=game.termination,
        white_elo_before=game.white_elo_before,
        black_elo_before=game.black_elo_before,
        elo_change=game.elo_change,
        started_at=game.started_at,
        ended_at=game.ended_at,
    )


@router.get("/{username}/games", response_model=GamesPage)
async def user_games(
    username: str,
    db: DbDep,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> GamesPage:
    user = await _get_user_or_404(db, username)
    condition = or_(Game.white_id == user.id, Game.black_id == user.id)
    total = await db.scalar(select(func.count(Game.id)).where(condition)) or 0
    rows = (
        await db.execute(
            select(Game)
            .where(condition)
            .order_by(Game.started_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).scalars().all()

    # nạp người chơi của các ván
    user_ids = {g.white_id for g in rows} | {g.black_id for g in rows}
    users = {
        u.id: u
        for u in (
            await db.execute(select(User).where(User.id.in_(user_ids)))
        ).scalars()
    } if user_ids else {}

    return GamesPage(
        items=[game_summary(g, users[g.white_id], users[g.black_id]) for g in rows],
        page=page,
        limit=limit,
        total=total,
    )


@router.get("/{username}/rating-history", response_model=list[RatingPoint])
async def rating_history(
    username: str,
    db: DbDep,
    variant: Literal["chess", "xiangqi", "caro", "jungle"] = Query("chess"),
) -> list[RatingPoint]:
    user = await _get_user_or_404(db, username)
    rows = (
        await db.execute(
            select(RatingHistory)
            .where(
                RatingHistory.user_id == user.id, RatingHistory.variant == variant
            )
            .order_by(RatingHistory.created_at.asc())
        )
    ).scalars().all()
    return [
        RatingPoint(elo=r.elo, variant=r.variant, game_id=r.game_id, created_at=r.created_at)
        for r in rows
    ]
