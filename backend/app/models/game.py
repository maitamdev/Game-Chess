import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base

# SQLite cần INTEGER thường mới autoincrement được
BigIntPk = BigInteger().with_variant(Integer, "sqlite")


class Game(Base):
    __tablename__ = "games"
    __table_args__ = (
        Index("ix_games_white_id", "white_id"),
        Index("ix_games_black_id", "black_id"),
        Index("ix_games_started_at", "started_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    white_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"))
    black_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"))
    # 'chess' | 'xiangqi' — với cờ tướng, white = Đỏ (đi trước)
    variant: Mapped[str] = mapped_column(String(10), default="chess", nullable=False)
    time_control: Mapped[str] = mapped_column(String(10), nullable=False)
    # 'white' | 'black' | 'draw' | null nếu đang chơi ('aborted' khi huỷ)
    result: Mapped[str | None] = mapped_column(String(10))
    # 'checkmate','resignation','timeout','stalemate','agreement',
    # 'repetition','fifty_move','insufficient','aborted'
    termination: Mapped[str | None] = mapped_column(String(20))
    pgn: Mapped[str | None] = mapped_column(Text)
    final_fen: Mapped[str | None] = mapped_column(String(100))
    white_elo_before: Mapped[int | None] = mapped_column(Integer)
    black_elo_before: Mapped[int | None] = mapped_column(Integer)
    # Thay đổi Elo của bên trắng (bên đen suy ra từ rating_history)
    elo_change: Mapped[int | None] = mapped_column(Integer)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Move(Base):
    __tablename__ = "moves"
    __table_args__ = (Index("ix_moves_game_ply", "game_id", "ply"),)

    id: Mapped[int] = mapped_column(BigIntPk, primary_key=True, autoincrement=True)
    game_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("games.id", ondelete="CASCADE"), nullable=False
    )
    ply: Mapped[int] = mapped_column(Integer, nullable=False)  # 1, 2, 3...
    san: Mapped[str] = mapped_column(String(16), nullable=False)
    # cờ vua "e2e4" (4-5), caro "104.98" (tối đa 7)
    uci: Mapped[str] = mapped_column(String(10), nullable=False)
    fen_after: Mapped[str] = mapped_column(String(100), nullable=False)
    time_left_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    evaluation: Mapped[int | None] = mapped_column(Integer)  # điền sau khi phân tích
