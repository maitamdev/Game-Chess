import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    elo: int
    games_played: int
    wins: int
    losses: int
    draws: int
    xq_elo: int
    xq_games_played: int
    xq_wins: int
    xq_losses: int
    xq_draws: int
    caro_elo: int
    caro_games_played: int
    caro_wins: int
    caro_losses: int
    caro_draws: int
    jg_elo: int
    jg_games_played: int
    jg_wins: int
    jg_losses: int
    jg_draws: int
    created_at: datetime


class RatingPoint(BaseModel):
    elo: int
    variant: str
    game_id: uuid.UUID | None
    created_at: datetime
