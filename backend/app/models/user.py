import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (Index("ix_users_elo_desc", "elo"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    # thống kê cờ vua
    elo: Mapped[int] = mapped_column(Integer, default=1200, nullable=False)
    games_played: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    wins: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    losses: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    draws: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # thống kê cờ tướng (Elo riêng theo game)
    xq_elo: Mapped[int] = mapped_column(Integer, default=1200, nullable=False)
    xq_games_played: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    xq_wins: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    xq_losses: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    xq_draws: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # thống kê cờ caro
    caro_elo: Mapped[int] = mapped_column(Integer, default=1200, nullable=False)
    caro_games_played: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    caro_wins: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    caro_losses: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    caro_draws: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # thống kê cờ thú
    jg_elo: Mapped[int] = mapped_column(Integer, default=1200, nullable=False)
    jg_games_played: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    jg_wins: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    jg_losses: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    jg_draws: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # thống kê ô ăn quan
    oq_elo: Mapped[int] = mapped_column(Integer, default=1200, nullable=False)
    oq_games_played: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    oq_wins: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    oq_losses: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    oq_draws: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
