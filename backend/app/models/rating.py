import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.game import BigIntPk


class RatingHistory(Base):
    __tablename__ = "rating_history"
    __table_args__ = (Index("ix_rating_history_user", "user_id", "created_at"),)

    id: Mapped[int] = mapped_column(BigIntPk, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    elo: Mapped[int] = mapped_column(Integer, nullable=False)
    variant: Mapped[str] = mapped_column(String(10), default="chess", nullable=False)
    game_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("games.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
