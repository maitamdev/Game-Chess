import uuid
from typing import Literal

from fastapi import APIRouter, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy import select

from app.api.deps import DbDep
from app.api.errors import ApiError
from app.api.users import game_summary
from app.models import Game, Move, User
from app.schemas.game import GameDetail, MoveOut
from app.schemas.user import UserPublic

router = APIRouter(prefix="/api", tags=["games"])


async def _load_game(db: DbDep, game_id: uuid.UUID) -> tuple[Game, User, User]:
    game = await db.get(Game, game_id)
    if game is None:
        raise ApiError(404, "GAME_NOT_FOUND", "Không tìm thấy ván đấu")
    white = await db.get(User, game.white_id)
    black = await db.get(User, game.black_id)
    assert white and black
    return game, white, black


@router.get("/games/{game_id}", response_model=GameDetail)
async def game_detail(game_id: uuid.UUID, db: DbDep) -> GameDetail:
    game, white, black = await _load_game(db, game_id)
    moves = (
        await db.execute(
            select(Move).where(Move.game_id == game.id).order_by(Move.ply.asc())
        )
    ).scalars().all()
    summary = game_summary(game, white, black)
    return GameDetail(
        **summary.model_dump(),
        pgn=game.pgn,
        final_fen=game.final_fen,
        moves=[MoveOut.model_validate(m) for m in moves],
    )


@router.get("/games/{game_id}/pgn")
async def game_pgn(game_id: uuid.UUID, db: DbDep) -> PlainTextResponse:
    game, white, black = await _load_game(db, game_id)
    if not game.pgn:
        raise ApiError(404, "PGN_NOT_READY", "Ván chưa kết thúc, chưa có PGN")
    filename = f"kydai-{white.username}-vs-{black.username}.pgn"
    return PlainTextResponse(
        game.pgn,
        media_type="application/x-chess-pgn",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/leaderboard", response_model=list[UserPublic])
async def leaderboard(
    db: DbDep,
    limit: int = Query(100, ge=1, le=100),
    variant: Literal["chess", "xiangqi", "caro", "jungle"] = Query("chess"),
) -> list[UserPublic]:
    order = {
        "chess": User.elo.desc(),
        "xiangqi": User.xq_elo.desc(),
        "caro": User.caro_elo.desc(),
        "jungle": User.jg_elo.desc(),
    }[variant]
    rows = (
        await db.execute(select(User).order_by(order).limit(limit))
    ).scalars().all()
    return [UserPublic.model_validate(u) for u in rows]
