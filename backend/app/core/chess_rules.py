"""Bọc python-chess — server là trọng tài duy nhất (mục 2 spec).

Client chỉ gửi ý định đi nước (uci); mọi kiểm tra hợp lệ, phát hiện
kết thúc ván đều thực hiện tại đây.
"""

from dataclasses import dataclass
from datetime import datetime, timezone

import chess
import chess.pgn


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


class ChessGame:
    """Trạng thái luật của một ván, dựng lại được từ danh sách uci."""

    def __init__(self, uci_moves: list[str] | None = None):
        self.board = chess.Board()
        for uci in uci_moves or []:
            self.board.push(chess.Move.from_uci(uci))

    @property
    def ply(self) -> int:
        """Số nước đã đi (nước tiếp theo có ply = ply + 1)."""
        return len(self.board.move_stack)

    @property
    def turn_color(self) -> str:
        return "white" if self.board.turn == chess.WHITE else "black"

    def fen(self) -> str:
        return self.board.fen()

    def try_move(self, uci: str) -> AppliedMove | None:
        """Áp nước đi nếu hợp lệ, ngược lại trả None."""
        try:
            move = chess.Move.from_uci(uci)
        except ValueError:
            return None
        if move not in self.board.legal_moves:
            return None
        san = self.board.san(move)
        self.board.push(move)
        return AppliedMove(
            san=san,
            uci=uci,
            fen_after=self.board.fen(),
            is_check=self.board.is_check(),
        )

    def detect_end(self) -> GameEnd | None:
        """Phát hiện kết thúc tự nhiên sau nước vừa đi."""
        board = self.board
        if board.is_checkmate():
            winner = "black" if board.turn == chess.WHITE else "white"
            return GameEnd(result=winner, termination="checkmate")
        if board.is_stalemate():
            return GameEnd(result="draw", termination="stalemate")
        if board.is_insufficient_material():
            return GameEnd(result="draw", termination="insufficient")
        if board.is_repetition(3):
            return GameEnd(result="draw", termination="repetition")
        if board.halfmove_clock >= 100:
            return GameEnd(result="draw", termination="fifty_move")
        return None

    def has_mating_material(self, color: str) -> bool:
        """Bên `color` còn đủ lực chiếu bí không — dùng khi đối thủ hết giờ
        (mục 12: hết giờ mà bên kia không đủ lực chiếu bí → hoà)."""
        c = chess.WHITE if color == "white" else chess.BLACK
        board = self.board
        if (
            board.pieces(chess.PAWN, c)
            or board.pieces(chess.ROOK, c)
            or board.pieces(chess.QUEEN, c)
        ):
            return True
        minors = len(board.pieces(chess.KNIGHT, c)) + len(board.pieces(chess.BISHOP, c))
        return minors >= 2

    def build_pgn(
        self,
        white_name: str,
        black_name: str,
        result: str,
        time_control: str,
        started_at: datetime | None = None,
    ) -> str:
        game = chess.pgn.Game()
        game.headers["Event"] = "Kỳ Đài — ván xếp hạng"
        game.headers["Site"] = "Kỳ Đài"
        date = started_at or datetime.now(timezone.utc)
        game.headers["Date"] = date.strftime("%Y.%m.%d")
        game.headers["White"] = white_name
        game.headers["Black"] = black_name
        game.headers["TimeControl"] = time_control
        game.headers["Result"] = (
            "1-0" if result == "white" else "0-1" if result == "black" else "1/2-1/2"
        )
        node: chess.pgn.GameNode = game
        replay = chess.Board()
        for move in self.board.move_stack:
            node = node.add_variation(move)
            replay.push(move)
        return str(game)
