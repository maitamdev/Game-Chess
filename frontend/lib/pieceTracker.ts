import type { Move, Square } from "chess.js";
import type { TrackedPiece } from "./types";

/**
 * Theo dõi danh tính từng quân qua lịch sử nước đi, để hoạt ảnh
 * gắn với đúng quân (kể cả nhập thành, bắt tốt qua đường, phong cấp).
 * fen khởi đầu luôn là thế cờ chuẩn.
 */

const BACK_RANK: readonly ["r", "n", "b", "q", "k", "b", "n", "r"] = [
  "r",
  "n",
  "b",
  "q",
  "k",
  "b",
  "n",
  "r",
];

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

function startingPieces(): TrackedPiece[] {
  const pieces: TrackedPiece[] = [];
  for (let f = 0; f < 8; f++) {
    const file = FILES[f];
    pieces.push({
      id: `w_${BACK_RANK[f]}_${file}1`,
      type: BACK_RANK[f],
      color: "w",
      square: `${file}1` as Square,
    });
    pieces.push({
      id: `w_p_${file}2`,
      type: "p",
      color: "w",
      square: `${file}2` as Square,
    });
    pieces.push({
      id: `b_p_${file}7`,
      type: "p",
      color: "b",
      square: `${file}7` as Square,
    });
    pieces.push({
      id: `b_${BACK_RANK[f]}_${file}8`,
      type: BACK_RANK[f],
      color: "b",
      square: `${file}8` as Square,
    });
  }
  return pieces;
}

const ROOK_CASTLE: Record<string, { from: Square; to: Square }> = {
  wk: { from: "h1", to: "f1" },
  wq: { from: "a1", to: "d1" },
  bk: { from: "h8", to: "f8" },
  bq: { from: "a8", to: "d8" },
};

/** Trả về danh sách quân sau khi áp dụng moves[0..upTo). */
export function trackPieces(moves: readonly Move[], upTo: number): TrackedPiece[] {
  const pieces = startingPieces();
  const at = new Map<Square, TrackedPiece>();
  for (const p of pieces) at.set(p.square, p);

  const movePiece = (from: Square, to: Square) => {
    const p = at.get(from);
    if (!p) return;
    at.delete(from);
    at.set(to, p);
    p.square = to;
  };

  for (let i = 0; i < upTo && i < moves.length; i++) {
    const m = moves[i];

    if (m.flags.includes("e")) {
      // Bắt tốt qua đường: tốt bị bắt đứng ở cột đích, hàng xuất phát
      const capturedSquare = `${m.to[0]}${m.from[1]}` as Square;
      at.delete(capturedSquare);
    } else if (m.captured) {
      at.delete(m.to);
    }

    movePiece(m.from, m.to);

    if (m.promotion) {
      const p = at.get(m.to);
      if (p) p.type = m.promotion;
    }

    if (m.flags.includes("k") || m.flags.includes("q")) {
      const rook = ROOK_CASTLE[`${m.color}${m.flags.includes("k") ? "k" : "q"}`];
      movePiece(rook.from, rook.to);
    }
  }

  return [...at.values()];
}
