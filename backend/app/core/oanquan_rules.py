"""Luật Ô Ăn Quan phía server — port 1:1 từ frontend/lib/oanquan/rules.ts
(hai bản được fuzz-test đối chiếu). Bên A (hàng dưới) đi trước, ánh xạ "white".

Bàn 12 ô vòng tròn: 0/6 là ô quan, 1–5 dân bên A, 7–11 dân bên B.
uci = "<ô><chiều>" (r = +1, l = −1), san = "Ô<ô>▸/◂" kèm "×<điểm>" nếu ăn.
Kết thúc: cả hai quan bị ăn (quan_out) hoặc đạt 400 nửa nước (move_limit),
tính sổ thu dân hàng mình, điểm = dân + 10×quan − nợ vay khi rải lại.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timezone

OQ_CELLS = 12
OQ_QUAN_VALUE = 10
OQ_MAX_PLY = 400

OQ_OWN_CELLS = {"a": [1, 2, 3, 4, 5], "b": [7, 8, 9, 10, 11]}

_UCI_RE = re.compile(r"^(\d{1,2})([rl])$")


def _is_quan_cell(i: int) -> bool:
    return i == 0 or i == 6


def _owner(i: int) -> str | None:
    if 1 <= i <= 5:
        return "a"
    if 7 <= i <= 11:
        return "b"
    return None


@dataclass
class AppliedMove:
    san: str
    uci: str
    fen_after: str
    is_check: bool


@dataclass
class GameEnd:
    result: str  # 'white' | 'black' | 'draw'
    termination: str  # 'quan_out' | 'move_limit'
    score_a: int = 0
    score_b: int = 0


class OanQuanGame:
    def __init__(self, uci_moves: list[str] | None = None):
        # dan[i] = số dân trong ô i (ô quan cũng chứa dân được rải vào)
        self.dan: list[int] = [5] * OQ_CELLS
        self.dan[0] = 0
        self.dan[6] = 0
        self.quan: list[bool] = [True, True]  # quan còn trong ô 0 / ô 6
        self.stores: dict[str, dict[str, int]] = {
            "a": {"dan": 0, "quan": 0, "debt": 0},
            "b": {"dan": 0, "quan": 0, "debt": 0},
        }
        self.side = "a"
        self._end: GameEnd | None = None
        self.move_stack: list[str] = []  # uci chuẩn hoá
        self.san_stack: list[str] = []
        for uci in uci_moves or []:
            if self.try_move(uci) is None:
                raise ValueError(f"Nước ô ăn quan không hợp lệ khi dựng lại: {uci}")

    @property
    def ply(self) -> int:
        return len(self.move_stack)

    @property
    def turn_color(self) -> str:
        return "white" if self.side == "a" else "black"

    def fen(self) -> str:
        a, b = self.stores["a"], self.stores["b"]
        return " ".join(
            [
                ",".join(str(d) for d in self.dan),
                f"{1 if self.quan[0] else 0}{1 if self.quan[1] else 0}",
                f"{a['dan']}.{a['quan']}.{a['debt']}",
                f"{b['dan']}.{b['quan']}.{b['debt']}",
                self.side,
                str(self.ply),
            ]
        )

    def _score(self, color: str) -> int:
        s = self.stores[color]
        return s["dan"] + s["quan"] * OQ_QUAN_VALUE - s["debt"]

    def _sow(self, cell: int, step: int):
        """Lõi luật: rải từ ô cell theo step trên bản sao trạng thái bàn."""
        dan = self.dan[:]
        quan = [self.quan[0], self.quan[1]]
        sow_path: list[int] = []
        captures: list[tuple[int, int, bool]] = []  # (ô, dân, có quan)

        hand = dan[cell]
        dan[cell] = 0
        pos = cell
        while True:
            while hand > 0:
                pos = (pos + step) % OQ_CELLS
                dan[pos] += 1
                hand -= 1
                sow_path.append(pos)
            nxt = (pos + step) % OQ_CELLS
            if _is_quan_cell(nxt):
                break  # gặp ô quan → dừng lượt
            if dan[nxt] > 0:
                hand = dan[nxt]  # ô dân còn quân → bốc rải tiếp
                dan[nxt] = 0
                pos = nxt
                continue
            # ô dân trống → chuỗi ăn cách ô
            cur = nxt
            while True:
                target = (cur + step) % OQ_CELLS
                has_quan = (
                    quan[0] if target == 0 else quan[1] if target == 6 else False
                )
                if dan[target] == 0 and not has_quan:
                    break  # không có gì để ăn
                captures.append((target, dan[target], has_quan))
                dan[target] = 0
                if target == 0:
                    quan[0] = False
                if target == 6:
                    quan[1] = False
                link = (target + step) % OQ_CELLS
                if _is_quan_cell(link) or dan[link] > 0:
                    break  # link phải là ô dân trống
                cur = link
            break
        return dan, quan, captures

    def _commit(self, cell: int, dir_: str) -> str:
        """Áp sow + chuyển lượt/kho/rải lại/kết cục, trả về san."""
        step = 1 if dir_ == "r" else -1
        dan, quan, captures = self._sow(cell, step)
        gained = sum(d + (OQ_QUAN_VALUE if q else 0) for _, d, q in captures)
        arrow = "▸" if dir_ == "r" else "◂"
        san = f"Ô{cell}{arrow}" + (f"×{gained}" if gained > 0 else "")

        self.dan = dan
        self.quan = quan
        s = self.stores[self.side]
        for _, d, q in captures:
            s["dan"] += d
            if q:
                s["quan"] += 1

        if not self.quan[0] and not self.quan[1]:
            self._finish("quan_out")
            return san
        if len(self.move_stack) + 1 >= OQ_MAX_PLY:
            self._finish("move_limit")
            return san
        self.side = "b" if self.side == "a" else "a"
        # rải lại cho bên sắp đi nếu 5 ô của họ trống
        if all(self.dan[i] == 0 for i in OQ_OWN_CELLS[self.side]):
            ns = self.stores[self.side]
            from_store = min(5, ns["dan"])
            ns["dan"] -= from_store
            ns["debt"] += 5 - from_store
            for i in OQ_OWN_CELLS[self.side]:
                self.dan[i] = 1
        return san

    def _finish(self, termination: str) -> None:
        """Tính sổ: thu dân trên 5 ô mỗi bên về kho rồi chốt điểm."""
        for color in ("a", "b"):
            for i in OQ_OWN_CELLS[color]:
                self.stores[color]["dan"] += self.dan[i]
                self.dan[i] = 0
        score_a = self._score("a")
        score_b = self._score("b")
        if score_a == score_b:
            result = "draw"
        else:
            result = "white" if score_a > score_b else "black"
        self._end = GameEnd(
            result=result,
            termination=termination,
            score_a=score_a,
            score_b=score_b,
        )

    def try_move(self, uci: str) -> AppliedMove | None:
        if self._end is not None:
            return None
        m = _UCI_RE.match(uci)
        if not m:
            return None
        cell = int(m.group(1))
        if cell >= OQ_CELLS or _is_quan_cell(cell):
            return None
        if _owner(cell) != self.side or self.dan[cell] == 0:
            return None
        dir_ = m.group(2)
        san = self._commit(cell, dir_)
        norm = f"{cell}{dir_}"
        self.move_stack.append(norm)
        self.san_stack.append(san)
        return AppliedMove(san=san, uci=norm, fen_after=self.fen(), is_check=False)

    def detect_end(self) -> GameEnd | None:
        return self._end

    def has_mating_material(self, color: str) -> bool:
        # ô ăn quan không có khái niệm thiếu lực — hết giờ luôn là thua
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
            '[Event "Kỳ Đài — ván ô ăn quan xếp hạng"]',
            '[Site "Kỳ Đài"]',
            f'[Date "{date}"]',
            f'[A "{white_name}"]',
            f'[B "{black_name}"]',
            f'[TimeControl "{time_control}"]',
            '[Variant "Ô Ăn Quan"]',
            f'[Result "{score}"]',
        ]
        body = []
        for i in range(0, len(self.san_stack), 2):
            num = i // 2 + 1
            pair = f"{num}. {self.san_stack[i]}"
            if i + 1 < len(self.san_stack):
                pair += f" {self.san_stack[i + 1]}"
            body.append(pair)
        return "\n".join(headers) + "\n\n" + " ".join(body) + f" {score}\n"
