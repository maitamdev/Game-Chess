"""Trạng thái + đồng hồ một ván online (mục 9, 12).

Nguyên tắc bất di bất dịch: server là trọng tài duy nhất. Đồng hồ tính
bằng time.monotonic(), trừ tại thời điểm nhận nước đi hợp lệ; cộng giờ
sau khi hoàn tất nước đi. Đồng hồ bắt đầu chạy sau nước đi đầu tiên
(ván chưa có nước đi được luật huỷ 30 giây bảo vệ).
"""

from __future__ import annotations

import asyncio
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select

from app.config import settings
from app.core.caro_rules import CaroGame
from app.core.chess_rules import ChessGame
from app.core.elo import elo_changes
from app.core.jungle_rules import JungleGame
from app.core.xiangqi_rules import XiangqiGame
from app.db import SessionLocal
from app.models import Game, Move, RatingHistory, User
from app.ws.manager import Connection

OTHER = {"white": "black", "black": "white"}

# Thống kê theo game: (elo, games_played, wins, losses, draws)
VARIANT_FIELDS = {
    "chess": ("elo", "games_played", "wins", "losses", "draws"),
    "xiangqi": ("xq_elo", "xq_games_played", "xq_wins", "xq_losses", "xq_draws"),
    "caro": (
        "caro_elo",
        "caro_games_played",
        "caro_wins",
        "caro_losses",
        "caro_draws",
    ),
    "jungle": ("jg_elo", "jg_games_played", "jg_wins", "jg_losses", "jg_draws"),
}

RULES_FACTORY = {
    "chess": ChessGame,
    "xiangqi": XiangqiGame,
    "caro": CaroGame,
    "jungle": JungleGame,
}


def user_variant_stats(user: User, variant: str) -> tuple[int, int]:
    """(elo, games_played) của user theo variant."""
    f = VARIANT_FIELDS[variant]
    return getattr(user, f[0]), getattr(user, f[1])


def parse_time_control(tc: str) -> tuple[int, int]:
    """'10+5' → (600000 ms, 5000 ms)"""
    minutes, _, inc = tc.partition("+")
    return int(minutes) * 60_000, int(inc or 0) * 1000


@dataclass
class PlayerSlot:
    user_id: uuid.UUID
    username: str
    elo_before: int
    games_played: int
    conn: Connection | None = None
    connected_once: bool = False
    disconnect_task: asyncio.Task | None = None


@dataclass
class GameSession:
    game_id: uuid.UUID
    time_control: str
    white: PlayerSlot
    black: PlayerSlot
    variant: str = "chess"
    initial_ms: int = 0
    increment_ms: int = 0
    rules: ChessGame | XiangqiGame | CaroGame | JungleGame = field(
        default_factory=ChessGame
    )
    moves: list[dict[str, Any]] = field(default_factory=list)
    white_ms: float = 0
    black_ms: float = 0
    turn_started: float | None = None  # monotonic; None = đồng hồ chưa chạy
    status: str = "active"  # active | finished
    draw_offer_from: str | None = None  # 'white' | 'black'
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    viewers: list[Connection] = field(default_factory=list)
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    _tasks: list[asyncio.Task] = field(default_factory=list)

    # ---------- tiện ích ----------

    def slot_of(self, user_id: uuid.UUID) -> tuple[str, PlayerSlot] | None:
        if self.white.user_id == user_id:
            return "white", self.white
        if self.black.user_id == user_id:
            return "black", self.black
        return None

    def _slot(self, color: str) -> PlayerSlot:
        return self.white if color == "white" else self.black

    def current_times(self) -> tuple[int, int]:
        """Thời gian hai bên tại thời điểm gọi (đã trừ phần đang trôi)."""
        w, b = self.white_ms, self.black_ms
        if self.status == "active" and self.turn_started is not None:
            elapsed = (time.monotonic() - self.turn_started) * 1000
            if self.rules.turn_color == "white":
                w -= elapsed
            else:
                b -= elapsed
        return max(0, int(w)), max(0, int(b))

    def state_message(self) -> dict[str, Any]:
        w, b = self.current_times()
        return {
            "type": "game_state",
            "game_id": str(self.game_id),
            "fen": self.rules.fen(),
            "ply": self.rules.ply,
            "turn": self.rules.turn_color,
            "white_time_ms": w,
            "black_time_ms": b,
            "moves": [m["san"] for m in self.moves],
            "server_time": int(time.time() * 1000),
        }

    async def broadcast(self, message: dict[str, Any]) -> None:
        for conn in [self.white.conn, self.black.conn, *self.viewers]:
            if conn is not None:
                await conn.send(message)

    async def _send_opponent(self, color: str, message: dict[str, Any]) -> None:
        conn = self._slot(OTHER[color]).conn
        if conn is not None:
            await conn.send(message)

    # ---------- vòng đời ----------

    def start_tasks(self) -> None:
        self._tasks.append(asyncio.create_task(self._flag_watchdog()))
        self._tasks.append(asyncio.create_task(self._abort_watchdog()))

    def _cancel_tasks(self) -> None:
        # _finish có thể đang chạy bên trong một trong các task này
        # (watchdog hết giờ / xử thua mất kết nối) — không tự hủy chính mình.
        # Gán None TRƯỚC khi cancel để attach() không còn thấy task nào
        # (attach cancel một task đang chạy _finish sẽ giết ván giữa chừng).
        current = asyncio.current_task()
        for t in self._tasks:
            if t is not current:
                t.cancel()
        for slot in (self.white, self.black):
            task = slot.disconnect_task
            slot.disconnect_task = None
            if task is not None and task is not current:
                task.cancel()

    # ---------- kết nối ----------

    async def attach(self, conn: Connection, mark_connected: bool = True) -> None:
        """Gắn kết nối vào ván. Hai tab cùng tài khoản: chỉ tab mới nhất
        được đi nước, tab cũ chuyển sang chế độ chỉ xem (mục 12).

        mark_connected=False khi gắn lúc vừa ghép cặp — người chơi chỉ được
        tính "đã từng kết nối" khi thật sự vào ván (gửi sync), phục vụ luật
        huỷ ván 30 giây.
        """
        found = self.slot_of(conn.user_id)
        if found is None:
            if conn not in self.viewers:
                self.viewers.append(conn)
            return
        color, slot = found
        if mark_connected:
            slot.connected_once = True
        # tab từng bị đẩy xuống chỉ-xem nay thăng lại làm tab chơi
        if conn in self.viewers:
            self.viewers.remove(conn)
        old = slot.conn
        if old is conn:
            return
        slot.conn = conn
        if old is not None:
            self.viewers.append(old)
            await old.send({"type": "view_only", "game_id": str(self.game_id)})
        # chỉ hủy task xử-thua khi ván còn active — tránh cancel trúng task
        # đang chạy _finish (ván sẽ kẹt vĩnh viễn không kết quả)
        if self.status == "active" and slot.disconnect_task is not None:
            slot.disconnect_task.cancel()
            slot.disconnect_task = None
            # báo cho ĐỐI THỦ của người vừa quay lại
            await self._send_opponent(
                color, {"type": "opponent_reconnected", "game_id": str(self.game_id)}
            )

    async def detach(self, conn: Connection) -> None:
        """Kết nối rời đi (đóng tab, rớt mạng). Đồng hồ vẫn chạy; quá 60
        giây không quay lại → xử thua vì hết thời gian (mục 12).

        Kiểm tra vai trò NGƯỜI CHƠI trước danh sách chỉ-xem — một kết nối
        có thể từng nằm trong viewers rồi được thăng lại làm tab chơi."""
        found = self.slot_of(conn.user_id)
        if found is None or found[1].conn is not conn:
            if conn in self.viewers:
                self.viewers.remove(conn)
            return
        color, slot = found
        slot.conn = None
        if self.status != "active":
            return
        await self._send_opponent(
            color,
            {
                "type": "opponent_disconnected",
                "game_id": str(self.game_id),
                "reconnect_deadline_ms": int(settings.disconnect_forfeit_seconds * 1000),
            },
        )
        slot.disconnect_task = asyncio.create_task(self._forfeit_after(color))

    async def _forfeit_after(self, color: str) -> None:
        try:
            await asyncio.sleep(settings.disconnect_forfeit_seconds)
            async with self.lock:
                if self.status != "active" or self._slot(color).conn is not None:
                    return
                winner = OTHER[color]
                if not self.rules.has_mating_material(winner):
                    await self._finish("draw", "timeout")
                else:
                    await self._finish(winner, "timeout")
        except asyncio.CancelledError:
            raise
        except Exception:
            import traceback

            traceback.print_exc()

    # ---------- đồng hồ ----------

    async def _flag_watchdog(self) -> None:
        """Phát hiện hết giờ theo mốc thời gian server, kể cả khi cả hai
        client đứt mạng (mục 12)."""
        while True:
            await asyncio.sleep(0.25)
            if self.status != "active" or self.turn_started is None:
                continue
            w, b = self.current_times()
            side = self.rules.turn_color
            remaining = w if side == "white" else b
            if remaining > 0:
                continue
            async with self.lock:
                if self.status != "active":
                    return
                if side == "white":
                    self.white_ms = 0
                else:
                    self.black_ms = 0
                winner = OTHER[side]
                # Hết giờ nhưng bên còn lại không đủ lực chiếu bí → hoà
                if not self.rules.has_mating_material(winner):
                    await self._finish("draw", "timeout")
                else:
                    await self._finish(winner, "timeout")
                return

    async def _abort_watchdog(self) -> None:
        """Không có nước đi nào trong 30 giây đầu và một bên chưa từng kết
        nối → huỷ ván, không tính Elo (mục 12). Lưới an toàn bổ sung: cả
        hai đã kết nối nhưng không ai đi nước nào sau 2 phút → cũng huỷ,
        tránh ván treo vô hạn vì đồng hồ chưa chạy trước nước đầu."""
        await asyncio.sleep(settings.abort_seconds)
        async with self.lock:
            if self.status == "active" and self.rules.ply == 0 and not (
                self.white.connected_once and self.black.connected_once
            ):
                await self._finish("aborted", "aborted")
                return
        await asyncio.sleep(120 - settings.abort_seconds)
        async with self.lock:
            if self.status == "active" and self.rules.ply == 0:
                await self._finish("aborted", "aborted")

    # ---------- hành động của người chơi ----------

    async def _reject(self, conn: Connection, reason: str) -> None:
        await conn.send(
            {"type": "illegal_move", "game_id": str(self.game_id), "reason": reason}
        )

    async def handle_move(self, conn: Connection, uci: str, ply: int) -> None:
        async with self.lock:
            if self.status != "active":
                return await self._reject(conn, "game_over")
            found = self.slot_of(conn.user_id)
            if found is None:
                return await self._reject(conn, "not_in_game")
            color, slot = found
            if slot.conn is not conn:
                return await self._reject(conn, "view_only")
            if self.rules.turn_color != color:
                return await self._reject(conn, "not_your_turn")
            # Chặn gửi trùng và gửi lệch thứ tự (mục 9)
            if ply != self.rules.ply + 1:
                return await self._reject(conn, "ply_mismatch")

            now = time.monotonic()
            clock_running = self.turn_started is not None
            elapsed = (now - self.turn_started) * 1000 if clock_running else 0.0
            key = "white_ms" if color == "white" else "black_ms"

            # Hết giờ ngay tại thời điểm nhận nước đi (bất kể nước gì)
            if clock_running and getattr(self, key) - elapsed <= 0:
                setattr(self, key, 0)
                winner = OTHER[color]
                if not self.rules.has_mating_material(winner):
                    await self._finish("draw", "timeout")
                else:
                    await self._finish(winner, "timeout")
                return

            applied = self.rules.try_move(uci)
            if applied is None:
                # KHÔNG trừ giờ cho nước bất hợp lệ — turn_started giữ nguyên,
                # đồng hồ vẫn đo liên tục từ đầu lượt, không bị tính hai lần
                return await self._reject(conn, "illegal")

            # Trừ thời gian tại thời điểm nhận được nước đi hợp lệ;
            # cộng giờ sau khi hoàn tất nước đi (chỉ khi đồng hồ đã chạy)
            if clock_running:
                setattr(self, key, getattr(self, key) - elapsed + self.increment_ms)

            # Đồng hồ bắt đầu chạy từ sau nước đi đầu tiên
            self.turn_started = now if self.rules.ply >= 1 else None

            time_left = int(self.white_ms if color == "white" else self.black_ms)
            record = {
                "ply": self.rules.ply,
                "san": applied.san,
                "uci": applied.uci,
                "fen_after": applied.fen_after,
                "time_left_ms": time_left,
            }
            self.moves.append(record)
            # Đề nghị hoà có hiệu lực tới khi bên NHẬN đi nước (ngầm từ chối);
            # nước đi của chính người đề nghị không tự vô hiệu hoá nó
            if self.draw_offer_from is not None and color != self.draw_offer_from:
                self.draw_offer_from = None

            async with SessionLocal() as db:
                db.add(Move(game_id=self.game_id, **record))
                await db.commit()

            w, b = self.current_times()
            await self.broadcast(
                {
                    "type": "move_made",
                    "game_id": str(self.game_id),
                    "uci": applied.uci,
                    "san": applied.san,
                    "ply": record["ply"],
                    "fen": applied.fen_after,
                    "white_time_ms": w,
                    "black_time_ms": b,
                    "check": applied.is_check,
                    "server_time": int(time.time() * 1000),
                }
            )

            end = self.rules.detect_end()
            if end is not None:
                await self._finish(end.result, end.termination)

    async def handle_resign(self, conn: Connection) -> None:
        async with self.lock:
            if self.status != "active":
                return
            found = self.slot_of(conn.user_id)
            if found is None or found[1].conn is not conn:
                return
            await self._finish(OTHER[found[0]], "resignation")

    async def handle_draw_offer(self, conn: Connection) -> None:
        async with self.lock:
            if self.status != "active":
                return
            found = self.slot_of(conn.user_id)
            if found is None or found[1].conn is not conn:
                return
            color, slot = found
            self.draw_offer_from = color
            await self._send_opponent(
                color,
                {
                    "type": "draw_offered",
                    "game_id": str(self.game_id),
                    "from": slot.username,
                },
            )

    async def handle_draw_response(self, conn: Connection, accept: bool) -> None:
        async with self.lock:
            if self.status != "active" or self.draw_offer_from is None:
                return
            found = self.slot_of(conn.user_id)
            if found is None or found[0] == self.draw_offer_from:
                return
            if accept:
                await self._finish("draw", "agreement")
            else:
                self.draw_offer_from = None

    # ---------- kết thúc ----------

    async def _finish(self, result: str, termination: str) -> None:
        """result: 'white' | 'black' | 'draw' | 'aborted'"""
        if self.status != "active":
            return
        self.status = "finished"
        self._cancel_tasks()

        white_delta = black_delta = 0
        rated = result in ("white", "black", "draw")
        if rated:
            white_delta, black_delta = elo_changes(
                self.white.elo_before,
                self.black.elo_before,
                self.white.games_played,
                self.black.games_played,
                result,
            )

        elo_f, games_f, wins_f, losses_f, draws_f = VARIANT_FIELDS[self.variant]
        async with SessionLocal() as db:
            game = await db.get(Game, self.game_id)
            assert game is not None
            game.result = result
            game.termination = termination
            game.final_fen = self.rules.fen()
            game.ended_at = datetime.now(timezone.utc)
            game.elo_change = white_delta if rated else 0
            if self.moves:
                game.pgn = self.rules.build_pgn(
                    self.white.username,
                    self.black.username,
                    result if rated else "draw",
                    self.time_control,
                    self.started_at,
                )
            if rated:
                for slot, delta, win_res in (
                    (self.white, white_delta, "white"),
                    (self.black, black_delta, "black"),
                ):
                    user = await db.get(User, slot.user_id)
                    assert user is not None
                    setattr(user, elo_f, getattr(user, elo_f) + delta)
                    setattr(user, games_f, getattr(user, games_f) + 1)
                    if result == "draw":
                        setattr(user, draws_f, getattr(user, draws_f) + 1)
                    elif result == win_res:
                        setattr(user, wins_f, getattr(user, wins_f) + 1)
                    else:
                        setattr(user, losses_f, getattr(user, losses_f) + 1)
                    db.add(
                        RatingHistory(
                            user_id=user.id,
                            elo=getattr(user, elo_f),
                            variant=self.variant,
                            game_id=self.game_id,
                        )
                    )
            await db.commit()

        new_elos = {
            "white": self.white.elo_before + white_delta,
            "black": self.black.elo_before + black_delta,
        }
        for color, slot in (("white", self.white), ("black", self.black)):
            delta = white_delta if color == "white" else black_delta
            if slot.conn is not None:
                await slot.conn.send(
                    {
                        "type": "game_over",
                        "game_id": str(self.game_id),
                        "result": result,
                        "termination": termination,
                        "elo_change": delta if rated else 0,
                        "new_elo": new_elos[color] if rated else slot.elo_before,
                    }
                )
        for viewer in self.viewers:
            await viewer.send(
                {
                    "type": "game_over",
                    "game_id": str(self.game_id),
                    "result": result,
                    "termination": termination,
                    "elo_change": 0,
                    "new_elo": 0,
                }
            )
        sessions.pop(self.game_id, None)


# Registry phiên ván đang diễn ra (bộ nhớ tiến trình)
sessions: dict[uuid.UUID, GameSession] = {}


async def create_session(
    white_user: User, black_user: User, time_control: str, variant: str = "chess"
) -> GameSession:
    """Tạo bản ghi ván + phiên trong bộ nhớ khi ghép cặp thành công."""
    initial_ms, increment_ms = parse_time_control(time_control)
    w_elo, w_games = user_variant_stats(white_user, variant)
    b_elo, b_games = user_variant_stats(black_user, variant)
    async with SessionLocal() as db:
        game = Game(
            white_id=white_user.id,
            black_id=black_user.id,
            variant=variant,
            time_control=time_control,
            white_elo_before=w_elo,
            black_elo_before=b_elo,
        )
        db.add(game)
        await db.commit()
        await db.refresh(game)

    session = GameSession(
        game_id=game.id,
        time_control=time_control,
        variant=variant,
        rules=RULES_FACTORY[variant](),
        white=PlayerSlot(
            user_id=white_user.id,
            username=white_user.username,
            elo_before=w_elo,
            games_played=w_games,
        ),
        black=PlayerSlot(
            user_id=black_user.id,
            username=black_user.username,
            elo_before=b_elo,
            games_played=b_games,
        ),
        initial_ms=initial_ms,
        increment_ms=increment_ms,
        white_ms=initial_ms,
        black_ms=initial_ms,
        started_at=datetime.now(timezone.utc),
    )
    sessions[game.id] = session
    session.start_tasks()
    return session
