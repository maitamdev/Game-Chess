"""Luật cờ caro (Gomoku) phía server — port 1:1 từ frontend/lib/caro/rules.ts.

Bàn 200×200, X đi trước, thắng khi ≥5 quân liên tiếp. Giao diện trùng
ChessGame/XiangqiGame để GameSession dùng chung: X ánh xạ "white" (đi trước),
O ánh xạ "black". FEN không khả thi với bàn 40 000 ô nên fen() trả về tóm tắt
"<ply> <bên đi>"; client luôn dựng lại bàn từ danh sách nước đi.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timezone

CARO_SIZE = 200

DIRS = [(1, 0), (0, 1), (1, 1), (1, -1)]

_UCI_RE = re.compile(r"^(\d{1,3})\.(\d{1,3})$")


@dataclass
class AppliedMove:
    san: str
    uci: str
    fen_after: str
    is_check: bool


@dataclass
class GameEnd:
    result: str  # 'white' | 'black' | 'draw'
    termination: str


class CaroGame:
    def __init__(self, uci_moves: list[str] | None = None):
        self.grid = bytearray(CARO_SIZE * CARO_SIZE)  # 0 trống, 1 x, 2 o
        self.move_stack: list[str] = []
        self._end: GameEnd | None = None
        for uci in uci_moves or []:
            if self.try_move(uci) is None:
                raise ValueError(f"Nước caro không hợp lệ khi dựng lại: {uci}")

    @property
    def ply(self) -> int:
        return len(self.move_stack)

    @property
    def turn_color(self) -> str:
        return "white" if self.ply % 2 == 0 else "black"

    def fen(self) -> str:
        return f"{self.ply} {'x' if self.ply % 2 == 0 else 'o'}"

    def try_move(self, uci: str) -> AppliedMove | None:
        if self._end is not None:
            return None
        m = _UCI_RE.match(uci)
        if not m:
            return None
        x, y = int(m.group(1)), int(m.group(2))
        if not (0 <= x < CARO_SIZE and 0 <= y < CARO_SIZE):
            return None
        idx = y * CARO_SIZE + x
        if self.grid[idx] != 0:
            return None
        mover = 1 if self.ply % 2 == 0 else 2
        self.grid[idx] = mover
        norm = f"{x}.{y}"
        self.move_stack.append(norm)
        if self._win_at(x, y):
            self._end = GameEnd(
                result="white" if mover == 1 else "black",
                termination="five_in_row",
            )
        elif len(self.move_stack) == CARO_SIZE * CARO_SIZE:
            self._end = GameEnd(result="draw", termination="board_full")
        return AppliedMove(
            san=f"{'X' if mover == 1 else 'O'}{norm}",
            uci=norm,
            fen_after=norm,
            is_check=False,
        )

    def _win_at(self, x: int, y: int) -> bool:
        v = self.grid[y * CARO_SIZE + x]
        for dx, dy in DIRS:
            count = 1
            for sign in (1, -1):
                cx, cy = x + dx * sign, y + dy * sign
                while (
                    0 <= cx < CARO_SIZE
                    and 0 <= cy < CARO_SIZE
                    and self.grid[cy * CARO_SIZE + cx] == v
                ):
                    count += 1
                    cx += dx * sign
                    cy += dy * sign
            if count >= 5:
                return True
        return False

    def detect_end(self) -> GameEnd | None:
        return self._end

    def has_mating_material(self, color: str) -> bool:
        # caro không có khái niệm thiếu lực — hết giờ luôn là thua
        return True

    def build_pgn(
        self,
        white_name: str,
        black_name: str,
        result: str,
        time_control: str,
        started_at: datetime | None = None,
    ) -> str:
        date = (started_at or datetime.now(timezone.utc)).strftime("%Y.%m.%d")
        score = "1-0" if result == "white" else "0-1" if result == "black" else "1/2-1/2"
        headers = [
            '[Event "Kỳ Đài — ván caro xếp hạng"]',
            '[Site "Kỳ Đài"]',
            f'[Date "{date}"]',
            f'[X "{white_name}"]',
            f'[O "{black_name}"]',
            f'[TimeControl "{time_control}"]',
            '[Variant "Caro 200x200"]',
            f'[Result "{score}"]',
        ]
        body = []
        for i in range(0, len(self.move_stack), 2):
            num = i // 2 + 1
            pair = f"{num}. {self.move_stack[i]}"
            if i + 1 < len(self.move_stack):
                pair += f" {self.move_stack[i + 1]}"
            body.append(pair)
        return "\n".join(headers) + "\n\n" + " ".join(body) + f" {score}\n"
