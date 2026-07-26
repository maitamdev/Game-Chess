"""Luật cờ thú (Jungle) phía server — port 1:1 từ frontend/lib/jungle/rules.ts
(hai bản được fuzz-test đối chiếu). Đỏ đi trước, ánh xạ "white".
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

JG_FILES = 7
JG_RANKS = 9
FILES = "abcdefg"

NAMES = {8: "Voi", 7: "Sư tử", 6: "Hổ", 5: "Báo", 4: "Sói", 3: "Chó", 2: "Mèo", 1: "Chuột"}
LETTERS = {8: "E", 7: "L", 6: "T", 5: "P", 4: "W", 3: "D", 2: "C", 1: "R"}

def _idx(rank: int, file: int) -> int:
    return rank * JG_FILES + file


def _sq(rank: int, file: int) -> str:
    return f"{FILES[file]}{rank}"


def _coords(square: str) -> tuple[int, int]:
    return int(square[1]), ord(square[0]) - 97


WATER = {_idx(r, f) for r in (3, 4, 5) for f in (1, 2, 4, 5)}
DEN = {"r": _idx(0, 3), "b": _idx(8, 3)}
TRAPS = {
    "r": {_idx(0, 2), _idx(0, 4), _idx(1, 3)},
    "b": {_idx(8, 2), _idx(8, 4), _idx(7, 3)},
}

START = [
    ("r", 7, 0, 0), ("r", 6, 0, 6),
    ("r", 3, 1, 1), ("r", 2, 1, 5),
    ("r", 1, 2, 0), ("r", 5, 2, 2), ("r", 4, 2, 4), ("r", 8, 2, 6),
    ("b", 7, 8, 6), ("b", 6, 8, 0),
    ("b", 3, 7, 5), ("b", 2, 7, 1),
    ("b", 1, 6, 6), ("b", 5, 6, 4), ("b", 4, 6, 2), ("b", 8, 6, 0),
]

ORTHO = [(1, 0), (-1, 0), (0, 1), (0, -1)]


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


class JungleGame:
    def __init__(self, uci_moves: list[str] | None = None):
        self.squares: list[tuple[int, str] | None] = [None] * 63  # (rank, color)
        for color, rank, r, f in START:
            self.squares[_idx(r, f)] = (rank, color)
        self.side = "r"
        self.ply_count = 0
        self.position_counts: dict[str, int] = {}
        self.move_stack: list[str] = []
        self.position_counts[self._position_key()] = 1
        for uci in uci_moves or []:
            if self.try_move(uci) is None:
                raise ValueError(f"Nước cờ thú không hợp lệ khi dựng lại: {uci}")

    @property
    def ply(self) -> int:
        return self.ply_count

    @property
    def turn_color(self) -> str:
        return "white" if self.side == "r" else "black"

    def fen(self) -> str:
        rows = []
        for r in range(8, -1, -1):
            row = ""
            empty = 0
            for f in range(JG_FILES):
                p = self.squares[_idx(r, f)]
                if p is None:
                    empty += 1
                    continue
                if empty:
                    row += str(empty)
                    empty = 0
                ch = LETTERS[p[0]]
                row += ch if p[1] == "r" else ch.lower()
            if empty:
                row += str(empty)
            rows.append(row)
        return f"{'/'.join(rows)} {self.side} {self.ply_count}"

    def _position_key(self) -> str:
        return " ".join(self.fen().split(" ")[:2])

    def _can_capture(self, att, from_i, deff, to_i) -> bool:
        att_water = from_i in WATER
        def_water = to_i in WATER
        if att_water != def_water:
            return False
        if to_i in TRAPS[att[1]]:
            return True
        if att[0] == 1 and deff[0] == 8:
            return True
        if att[0] == 8 and deff[0] == 1:
            return False
        return att[0] >= deff[0]

    def _jump_target(self, from_i: int, dr: int, df: int) -> int | None:
        r = from_i // JG_FILES + dr
        f = from_i % JG_FILES + df
        if not (0 <= r < JG_RANKS and 0 <= f < JG_FILES):
            return None
        if _idx(r, f) not in WATER:
            return None
        while 0 <= r < JG_RANKS and 0 <= f < JG_FILES and _idx(r, f) in WATER:
            if self.squares[_idx(r, f)] is not None:
                return None
            r += dr
            f += df
        if not (0 <= r < JG_RANKS and 0 <= f < JG_FILES):
            return None
        return _idx(r, f)

    def _pseudo_targets(self, from_i: int) -> list[int]:
        p = self.squares[from_i]
        assert p is not None
        r0, f0 = from_i // JG_FILES, from_i % JG_FILES
        out: list[int] = []
        for dr, df in ORTHO:
            r, f = r0 + dr, f0 + df
            if not (0 <= r < JG_RANKS and 0 <= f < JG_FILES):
                continue
            to_i = _idx(r, f)
            if to_i == DEN[p[1]]:
                continue
            if to_i in WATER:
                if p[0] == 1:
                    out.append(to_i)
                elif p[0] in (7, 6):
                    jump = self._jump_target(from_i, dr, df)
                    if jump is not None and jump != DEN[p[1]]:
                        out.append(jump)
                continue
            out.append(to_i)
        return out

    def legal_moves(self) -> list[str]:
        out: list[str] = []
        for i, p in enumerate(self.squares):
            if not p or p[1] != self.side:
                continue
            for t in self._pseudo_targets(i):
                occ = self.squares[t]
                if occ:
                    if occ[1] == p[1]:
                        continue
                    if not self._can_capture(p, i, occ, t):
                        continue
                out.append(_sq(i // JG_FILES, i % JG_FILES) + _sq(t // JG_FILES, t % JG_FILES))
        return out

    def try_move(self, uci: str) -> AppliedMove | None:
        if len(uci) != 4 or uci not in self.legal_moves():
            return None
        fr, ff = _coords(uci[:2])
        tr, tf = _coords(uci[2:4])
        piece = self.squares[_idx(fr, ff)]
        assert piece is not None
        self.squares[_idx(tr, tf)] = piece
        self.squares[_idx(fr, ff)] = None
        self.side = "b" if self.side == "r" else "r"
        self.ply_count += 1
        self.move_stack.append(uci)
        key = self._position_key()
        self.position_counts[key] = self.position_counts.get(key, 0) + 1
        return AppliedMove(
            san=f"{NAMES[piece[0]]} {uci}",
            uci=uci,
            fen_after=self.fen(),
            is_check=False,
        )

    def detect_end(self) -> GameEnd | None:
        on_red_den = self.squares[DEN["r"]]
        if on_red_den and on_red_den[1] == "b":
            return GameEnd(result="black", termination="den")
        on_black_den = self.squares[DEN["b"]]
        if on_black_den and on_black_den[1] == "r":
            return GameEnd(result="white", termination="den")
        red = sum(1 for p in self.squares if p and p[1] == "r")
        black = sum(1 for p in self.squares if p and p[1] == "b")
        if red == 0:
            return GameEnd(result="black", termination="no_pieces")
        if black == 0:
            return GameEnd(result="white", termination="no_pieces")
        if not self.legal_moves():
            winner = "black" if self.side == "r" else "white"
            return GameEnd(result=winner, termination="stalemate")
        if self.position_counts.get(self._position_key(), 0) >= 3:
            return GameEnd(result="draw", termination="repetition")
        return None

    def has_mating_material(self, color: str) -> bool:
        c = "r" if color == "white" else "b"
        return any(p and p[1] == c for p in self.squares)

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
            '[Event "Kỳ Đài — ván cờ thú xếp hạng"]',
            '[Site "Kỳ Đài"]',
            f'[Date "{date}"]',
            f'[Red "{white_name}"]',
            f'[Black "{black_name}"]',
            f'[TimeControl "{time_control}"]',
            '[Variant "Jungle"]',
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
