import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PlayerBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    elo: int


class GameSummary(BaseModel):
    id: uuid.UUID
    white: PlayerBrief
    black: PlayerBrief
    variant: str
    time_control: str
    result: str | None
    termination: str | None
    white_elo_before: int | None
    black_elo_before: int | None
    elo_change: int | None
    started_at: datetime
    ended_at: datetime | None


class MoveOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ply: int
    san: str
    uci: str
    fen_after: str
    time_left_ms: int
    evaluation: int | None


class GameDetail(GameSummary):
    pgn: str | None
    final_fen: str | None
    moves: list[MoveOut]


class GamesPage(BaseModel):
    items: list[GameSummary]
    page: int
    limit: int
    total: int
