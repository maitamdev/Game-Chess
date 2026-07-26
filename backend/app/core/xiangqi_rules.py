"""Luật cờ tướng phía server — port 1:1 từ frontend/lib/xiangqi/rules.ts
(hai bản được fuzz-test đối chiếu). Giao diện trùng ChessGame để
GameSession dùng chung: màu Đỏ ánh xạ thành "white" (đi trước), Đen "black".
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

XQ_START_FEN = "rheakaehr/9/1c5c1/s1s1s1s1s/9/9/S1S1S1S1S/1C5C1/9/RHEAKAEHR r 0 0"

FILES = "abcdefghi"
PIECE_TYPES = "kaehrcs"

HORSE_DELTAS = [
    (2, 1, 1, 0), (2, -1, 1, 0), (-2, 1, -1, 0), (-2, -1, -1, 0),
    (1, 2, 0, 1), (1, -2, 0, -1), (-1, 2, 0, 1), (-1, -2, 0, -1),
]
ORTHO = [(1, 0), (-1, 0), (0, 1), (0, -1)]

PIECE_CHARS = {
    "r": {"k": "帥", "a": "仕", "e": "相", "h": "傌", "r": "俥", "c": "炮", "s": "兵"},
    "b": {"k": "將", "a": "士", "e": "象", "h": "馬", "r": "車", "c": "砲", "s": "卒"},
}


def _sq(rank: int, file: int) -> str:
    return f"{FILES[file]}{rank}"


def _coords(square: str) -> tuple[int, int]:
    return int(square[1]), ord(square[0]) - 97


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


class XiangqiGame:
    """Trạng thái luật một ván cờ tướng, dựng lại được từ danh sách uci."""

    def __init__(self, uci_moves: list[str] | None = None):
        self.squares: list[tuple[str, str] | None] = [None] * 90  # (type, color)
        self.side = "r"
        self.halfmove = 0
        self.ply_count = 0
        self.position_counts: dict[str, int] = {}
        self.move_stack: list[str] = []
        # key thế cờ sau từng nước + nước đó có chiếu không (luật chiếu dai)
        self.key_history: list[str] = []
        self.check_history: list[bool] = []
        self.mover_history: list[str] = []  # 'r' | 'b' của từng nước
        self._load(XQ_START_FEN)
        for uci in uci_moves or []:
            if self.try_move(uci) is None:
                raise ValueError(f"Nước không hợp lệ khi dựng lại: {uci}")

    # ---------- FEN ----------

    def _load(self, fen: str) -> None:
        board_part, side, halfmove, ply = fen.split()
        self.squares = [None] * 90
        rows = board_part.split("/")
        for i, row in enumerate(rows):
            rank = 9 - i
            file = 0
            for ch in row:
                if ch.isdigit():
                    file += int(ch)
                else:
                    color = "r" if ch.isupper() else "b"
                    self.squares[rank * 9 + file] = (ch.lower(), color)
                    file += 1
        self.side = side
        self.halfmove = int(halfmove)
        self.ply_count = int(ply)
        self.position_counts = {self._position_key(): 1}
        self.key_history = []
        self.check_history = []
        self.mover_history = []

    def fen(self) -> str:
        rows = []
        for rank in range(9, -1, -1):
            row = ""
            empty = 0
            for file in range(9):
                p = self.squares[rank * 9 + file]
                if p is None:
                    empty += 1
                    continue
                if empty:
                    row += str(empty)
                    empty = 0
                row += p[0].upper() if p[1] == "r" else p[0]
            if empty:
                row += str(empty)
            rows.append(row)
        return f"{'/'.join(rows)} {self.side} {self.halfmove} {self.ply_count}"

    def _position_key(self) -> str:
        return " ".join(self.fen().split(" ")[:2])

    # ---------- giao diện chung với ChessGame ----------

    @property
    def ply(self) -> int:
        return self.ply_count

    @property
    def turn_color(self) -> str:
        return "white" if self.side == "r" else "black"

    # ---------- sinh nước ----------

    @staticmethod
    def _in_palace(color: str, rank: int, file: int) -> bool:
        if file < 3 or file > 5:
            return False
        return rank <= 2 if color == "r" else rank >= 7

    @staticmethod
    def _own_side(color: str, rank: int) -> bool:
        return rank <= 4 if color == "r" else rank >= 5

    def _king_index(self, color: str) -> int:
        for i, p in enumerate(self.squares):
            if p and p[0] == "k" and p[1] == color:
                return i
        return -1

    def _pseudo_from(self, rank: int, file: int) -> list[int]:
        p = self.squares[rank * 9 + file]
        if p is None:
            return []
        ptype, color = p
        out: list[int] = []

        def push(r: int, f: int) -> None:
            if r < 0 or r > 9 or f < 0 or f > 8:
                return
            occ = self.squares[r * 9 + f]
            if occ and occ[1] == color:
                return
            out.append(r * 9 + f)

        if ptype == "k":
            for dr, df in ORTHO:
                r, f = rank + dr, file + df
                if self._in_palace(color, r, f):
                    push(r, f)
        elif ptype == "a":
            for dr in (1, -1):
                for df in (1, -1):
                    r, f = rank + dr, file + df
                    if self._in_palace(color, r, f):
                        push(r, f)
        elif ptype == "e":
            for dr in (2, -2):
                for df in (2, -2):
                    r, f = rank + dr, file + df
                    if r < 0 or r > 9 or f < 0 or f > 8:
                        continue
                    if not self._own_side(color, r):
                        continue
                    if self.squares[(rank + dr // 2) * 9 + (file + df // 2)]:
                        continue
                    push(r, f)
        elif ptype == "h":
            for dr, df, leg_dr, leg_df in HORSE_DELTAS:
                r, f = rank + dr, file + df
                if r < 0 or r > 9 or f < 0 or f > 8:
                    continue
                if self.squares[(rank + leg_dr) * 9 + (file + leg_df)]:
                    continue
                push(r, f)
        elif ptype == "r":
            for dr, df in ORTHO:
                r, f = rank + dr, file + df
                while 0 <= r <= 9 and 0 <= f <= 8:
                    occ = self.squares[r * 9 + f]
                    if occ is None:
                        out.append(r * 9 + f)
                    else:
                        if occ[1] != color:
                            out.append(r * 9 + f)
                        break
                    r += dr
                    f += df
        elif ptype == "c":
            for dr, df in ORTHO:
                r, f = rank + dr, file + df
                screen = False
                while 0 <= r <= 9 and 0 <= f <= 8:
                    occ = self.squares[r * 9 + f]
                    if not screen:
                        if occ is None:
                            out.append(r * 9 + f)
                        else:
                            screen = True
                    elif occ is not None:
                        if occ[1] != color:
                            out.append(r * 9 + f)
                        break
                    r += dr
                    f += df
        elif ptype == "s":
            forward = 1 if color == "r" else -1
            push(rank + forward, file)
            crossed = rank >= 5 if color == "r" else rank <= 4
            if crossed:
                push(rank, file - 1)
                push(rank, file + 1)
        return out

    def _is_attacked(self, rank: int, file: int, by: str) -> bool:
        # Xe + lộ mặt tướng
        for dr, df in ORTHO:
            r, f = rank + dr, file + df
            while 0 <= r <= 9 and 0 <= f <= 8:
                occ = self.squares[r * 9 + f]
                if occ:
                    if occ[1] == by and occ[0] in ("r", "k"):
                        return True
                    break
                r += dr
                f += df
        # Pháo
        for dr, df in ORTHO:
            r, f = rank + dr, file + df
            screen = False
            while 0 <= r <= 9 and 0 <= f <= 8:
                occ = self.squares[r * 9 + f]
                if occ:
                    if not screen:
                        screen = True
                    else:
                        if occ[1] == by and occ[0] == "c":
                            return True
                        break
                r += dr
                f += df
        # Mã (chân mã cạnh chéo ô đích, hướng về con mã)
        for dr, df, _ldr, _ldf in HORSE_DELTAS:
            r, f = rank + dr, file + df
            if r < 0 or r > 9 or f < 0 or f > 8:
                continue
            occ = self.squares[r * 9 + f]
            if not occ or occ[1] != by or occ[0] != "h":
                continue
            sr = 1 if dr > 0 else -1 if dr < 0 else 0
            sf = 1 if df > 0 else -1 if df < 0 else 0
            if self.squares[(rank + sr) * 9 + (file + sf)] is None:
                return True
        # Tốt
        back = -1 if by == "r" else 1
        r = rank + back
        if 0 <= r <= 9:
            occ = self.squares[r * 9 + file]
            if occ and occ[1] == by and occ[0] == "s":
                return True
        for df in (-1, 1):
            f = file + df
            if f < 0 or f > 8:
                continue
            occ = self.squares[rank * 9 + f]
            if occ and occ[1] == by and occ[0] == "s":
                crossed = rank >= 5 if by == "r" else rank <= 4
                if crossed:
                    return True
        return False

    def _in_check(self, color: str) -> bool:
        k = self._king_index(color)
        if k < 0:
            return False
        return self._is_attacked(k // 9, k % 9, "b" if color == "r" else "r")

    def legal_moves(self) -> list[str]:
        out: list[str] = []
        color = self.side
        for i, p in enumerate(self.squares):
            if not p or p[1] != color:
                continue
            rank, file = i // 9, i % 9
            for t in self._pseudo_from(rank, file):
                captured = self.squares[t]
                self.squares[t] = self.squares[i]
                self.squares[i] = None
                legal = not self._in_check(color)
                self.squares[i] = self.squares[t]
                self.squares[t] = captured
                if legal:
                    out.append(_sq(rank, file) + _sq(t // 9, t % 9))
        return out

    def try_move(self, uci: str) -> AppliedMove | None:
        if len(uci) != 4 or uci not in self.legal_moves():
            return None
        fr, ff = _coords(uci[:2])
        tr, tf = _coords(uci[2:4])
        piece = self.squares[fr * 9 + ff]
        captured = self.squares[tr * 9 + tf]
        assert piece is not None
        self.squares[tr * 9 + tf] = piece
        self.squares[fr * 9 + ff] = None
        self.side = "b" if self.side == "r" else "r"
        self.halfmove = 0 if captured else self.halfmove + 1
        self.ply_count += 1
        self.move_stack.append(uci)
        key = self._position_key()
        self.position_counts[key] = self.position_counts.get(key, 0) + 1
        is_check = self._in_check(self.side)
        self.key_history.append(key)
        self.check_history.append(is_check)
        self.mover_history.append(piece[1])
        san = f"{PIECE_CHARS[piece[1]][piece[0]]}{uci[:2]}{uci[2:4]}"
        return AppliedMove(
            san=san,
            uci=uci,
            fen_after=self.fen(),
            is_check=is_check,
        )

    def detect_end(self) -> GameEnd | None:
        if not self.legal_moves():
            # hết nước đi trong cờ tướng là thua, kể cả không bị chiếu
            winner = "black" if self.side == "r" else "white"
            term = "checkmate" if self._in_check(self.side) else "stalemate"
            return GameEnd(result=winner, termination=term)
        if self.position_counts.get(self._position_key(), 0) >= 3:
            # Luật chiếu dai: trong chu kỳ lặp, bên nào MỌI nước đều chiếu
            # (một chiều) thì bên đó THUA; ngược lại hoà lặp thế.
            key = self._position_key()
            last = len(self.key_history) - 1
            prev = -1
            for i in range(last - 1, -1, -1):
                if self.key_history[i] == key:
                    prev = i
                    break
            if prev >= 0:
                all_checks = {"r": True, "b": True}
                seen = {"r": False, "b": False}
                for i in range(prev + 1, last + 1):
                    color = self.mover_history[i]
                    seen[color] = True
                    if not self.check_history[i]:
                        all_checks[color] = False
                red_perp = seen["r"] and all_checks["r"]
                black_perp = seen["b"] and all_checks["b"]
                if red_perp and not black_perp:
                    return GameEnd(result="black", termination="perpetual_check")
                if black_perp and not red_perp:
                    return GameEnd(result="white", termination="perpetual_check")
            return GameEnd(result="draw", termination="repetition")
        if self.halfmove >= 120:
            return GameEnd(result="draw", termination="fifty_move")
        if not any(
            p and p[0] in ("r", "c", "h", "s") for p in self.squares
        ):
            return GameEnd(result="draw", termination="insufficient")
        return None

    def has_mating_material(self, color: str) -> bool:
        c = "r" if color == "white" else "b"
        return any(
            p and p[1] == c and p[0] in ("r", "c", "h", "s") for p in self.squares
        )

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
            '[Event "Kỳ Đài — ván cờ tướng xếp hạng"]',
            '[Site "Kỳ Đài"]',
            f'[Date "{date}"]',
            f'[Red "{white_name}"]',
            f'[Black "{black_name}"]',
            f'[TimeControl "{time_control}"]',
            '[Variant "Xiangqi"]',
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
