import type { Color, PieceSymbol, Square } from "chess.js";

export type Winner = "white" | "black" | null;

export type Termination =
  | "checkmate"
  | "stalemate"
  | "repetition"
  | "fifty_move"
  | "insufficient"
  | "timeout"
  | "resignation"
  | "agreement"
  | "aborted";

export interface GameResult {
  winner: Winner;
  termination: Termination;
}

export interface TimeControl {
  label: string;
  initialMs: number;
  incrementMs: number;
}

/** Các thể thức đồng hồ dùng cho chế độ local và đấu máy. null = không giới hạn. */
export const TIME_CONTROLS: { label: string; value: TimeControl | null }[] = [
  { label: "Tắt", value: null },
  { label: "5+0", value: { label: "5+0", initialMs: 5 * 60_000, incrementMs: 0 } },
  { label: "10+0", value: { label: "10+0", initialMs: 10 * 60_000, incrementMs: 0 } },
  {
    label: "15+10",
    value: { label: "15+10", initialMs: 15 * 60_000, incrementMs: 10_000 },
  },
];

export interface TrackedPiece {
  id: string;
  type: PieceSymbol;
  color: Color;
  square: Square;
}

export const TERMINATION_LABELS: Record<Termination, string> = {
  checkmate: "Chiếu bí",
  stalemate: "Hết nước đi — hoà",
  repetition: "Hoà do lặp thế 3 lần",
  fifty_move: "Hoà theo luật 50 nước",
  insufficient: "Hoà do thiếu lực chiếu bí",
  timeout: "Hết giờ",
  resignation: "Đầu hàng",
  agreement: "Hoà theo thoả thuận",
  aborted: "Không có nước đi nào — không tính Elo",
};

export function resultTitle(result: GameResult): string {
  if (result.termination === "aborted") return "Ván bị huỷ";
  if (result.winner === "white") return "Trắng thắng";
  if (result.winner === "black") return "Đen thắng";
  return "Ván hoà";
}

export const PIECE_NAMES: Record<PieceSymbol, string> = {
  p: "Tốt",
  n: "Mã",
  b: "Tượng",
  r: "Xe",
  q: "Hậu",
  k: "Vua",
};
