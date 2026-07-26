"""Hàng đợi ghép cặp (mục 5.3), theo (game, thể thức).

Tìm đối thủ trong dải Elo ±100; cứ mỗi 5 giây chờ, nới dải thêm 50
(tối đa ±400). Elo dùng để ghép là Elo của đúng variant (cờ vua /
cờ tướng riêng). Hàng đợi giữ trong bộ nhớ tiến trình — chạy nhiều
tiến trình phải chuyển sang Redis (mục 9 spec).
"""

from __future__ import annotations

import asyncio
import random
import time
import uuid
from dataclasses import dataclass, field

from app.config import settings
from app.db import SessionLocal
from app.models import User
from app.ws.game_session import create_session, sessions, user_variant_stats
from app.ws.manager import Connection

VALID_TIME_CONTROLS = {"3+2", "5+0", "10+0", "15+10"}
VALID_VARIANTS = {"chess", "xiangqi", "caro", "jungle", "oanquan"}


@dataclass
class QueueEntry:
    conn: Connection
    user_id: uuid.UUID
    elo: int
    joined_at: float = field(default_factory=time.monotonic)

    def band(self) -> int:
        waited = time.monotonic() - self.joined_at
        band = settings.mm_base_band + settings.mm_band_step * int(
            waited // settings.mm_step_seconds
        )
        return min(band, settings.mm_max_band)


class Matchmaker:
    def __init__(self) -> None:
        self.queues: dict[tuple[str, str], list[QueueEntry]] = {
            (v, tc): [] for v in VALID_VARIANTS for tc in VALID_TIME_CONTROLS
        }
        # user đang trong quá trình tạo ván (đã rời queue, session chưa
        # đăng ký) — chặn join_queue lọt khe cửa sổ await của _create_game
        self.pending_users: set[uuid.UUID] = set()
        self._task: asyncio.Task | None = None

    def start(self) -> None:
        self._task = asyncio.create_task(self._loop())

    def stop(self) -> None:
        if self._task:
            self._task.cancel()

    async def join(self, conn: Connection, time_control: str, variant: str) -> None:
        if variant not in VALID_VARIANTS or time_control not in VALID_TIME_CONTROLS:
            await conn.send(
                {
                    "type": "error",
                    "code": "INVALID_TIME_CONTROL",
                    "message": "Thể thức hoặc loại cờ không hợp lệ",
                }
            )
            return
        # Đang có ván chưa kết thúc (hoặc đang được ghép) thì không được
        # vào hàng đợi — tránh hai ván xếp hạng cùng lúc, lost-update Elo
        in_game = conn.user_id in self.pending_users or any(
            session.status == "active" and session.slot_of(conn.user_id) is not None
            for session in sessions.values()
        )
        if in_game:
            await conn.send(
                {
                    "type": "error",
                    "code": "ALREADY_IN_GAME",
                    "message": "Bạn đang có ván đấu chưa kết thúc",
                }
            )
            return
        self.remove_user(conn.user_id)
        async with SessionLocal() as db:
            user = await db.get(User, conn.user_id)
        if user is None:
            return
        elo, _ = user_variant_stats(user, variant)
        queue = self.queues[(variant, time_control)]
        queue.append(QueueEntry(conn=conn, user_id=user.id, elo=elo))
        await conn.send({"type": "queued", "position": len(queue)})

    def remove_user(self, user_id: uuid.UUID) -> None:
        for queue in self.queues.values():
            queue[:] = [e for e in queue if e.user_id != user_id]

    def remove_conn(self, conn: Connection) -> None:
        for queue in self.queues.values():
            queue[:] = [e for e in queue if e.conn is not conn]

    async def _loop(self) -> None:
        while True:
            await asyncio.sleep(1.0)
            for (variant, time_control), queue in self.queues.items():
                await self._match_queue(variant, time_control, queue)

    async def _match_queue(
        self, variant: str, time_control: str, queue: list[QueueEntry]
    ) -> None:
        queue.sort(key=lambda e: e.joined_at)
        i = 0
        while i < len(queue) - 1:
            a = queue[i]
            matched = None
            for j in range(i + 1, len(queue)):
                b = queue[j]
                diff = abs(a.elo - b.elo)
                if diff <= a.band() and diff <= b.band():
                    matched = j
                    break
            if matched is None:
                i += 1
                continue
            b = queue.pop(matched)
            queue.pop(i)
            # đánh dấu TRƯỚC bất kỳ await nào — join_queue trong lúc tạo ván
            # sẽ bị chặn bởi pending_users
            self.pending_users.update({a.user_id, b.user_id})
            try:
                await self._create_game(a, b, variant, time_control)
            finally:
                self.pending_users.discard(a.user_id)
                self.pending_users.discard(b.user_id)

    async def _create_game(
        self, a: QueueEntry, b: QueueEntry, variant: str, time_control: str
    ) -> None:
        async with SessionLocal() as db:
            user_a = await db.get(User, a.user_id)
            user_b = await db.get(User, b.user_id)
        if user_a is None or user_b is None:
            return
        if random.random() < 0.5:
            white_user, black_user = user_a, user_b
            white_entry, black_entry = a, b
        else:
            white_user, black_user = user_b, user_a
            white_entry, black_entry = b, a

        session = await create_session(white_user, black_user, time_control, variant)
        await session.attach(white_entry.conn, mark_connected=False)
        await session.attach(black_entry.conn, mark_connected=False)

        for entry, color, opponent in (
            (white_entry, "white", black_user),
            (black_entry, "black", white_user),
        ):
            opp_elo, _ = user_variant_stats(opponent, variant)
            await entry.conn.send(
                {
                    "type": "match_found",
                    "game_id": str(session.game_id),
                    "color": color,
                    "variant": variant,
                    "opponent": {"username": opponent.username, "elo": opp_elo},
                    "time_control": time_control,
                }
            )


matchmaker = Matchmaker()
