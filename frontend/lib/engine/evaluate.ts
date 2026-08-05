import type { Chess, Color, Square } from "chess.js";
import {
  KING_ENDGAME_TABLE,
  KING_MIDGAME_TABLE,
  PIECE_VALUES,
  TABLES,
} from "./tables";

const FILES = "abcdefgh";

/**
 * Hàm lượng giá (mục 6). Trả về centipawn, dương = trắng lợi.
 * - Chất quân + bảng vị trí quân (bảng Vua riêng cho tàn cuộc)
 * - Cặp Tượng +30
 * - Tốt chồng −20 mỗi tốt, tốt cô lập −15, tốt thông +20 × hàng đã tiến
 * - Xe ở cột mở +25
 * - An toàn Vua: mỗi ô quanh Vua bị quân địch kiểm soát −10
 */
export function evaluate(chess: Chess): number {
  const board = chess.board();

  let score = 0;
  let whiteBishops = 0;
  let blackBishops = 0;
  let whiteNonPawnMaterial = 0;
  let blackNonPawnMaterial = 0;
  let whiteKing: { f: number; r: number } | null = null;
  let blackKing: { f: number; r: number } | null = null;
  // pawnRanks[color][file] = danh sách hàng (0-7, hàng 1 = 0) có tốt
  const pawnFiles: Record<Color, number[][]> = {
    w: Array.from({ length: 8 }, () => []),
    b: Array.from({ length: 8 }, () => []),
  };
  const rooks: { color: Color; f: number }[] = [];

  for (let row = 0; row < 8; row++) {
    // board()[0] là hàng 8
    for (let f = 0; f < 8; f++) {
      const piece = board[row][f];
      if (!piece) continue;
      const white = piece.color === "w";
      const tableIndex = white ? row * 8 + f : (7 - row) * 8 + f;
      const sign = white ? 1 : -1;
      const r = 7 - row; // hàng 1 = 0

      if (piece.type === "k") {
        if (white) whiteKing = { f, r };
        else blackKing = { f, r };
        continue; // PST của Vua cộng sau khi biết giai đoạn ván cờ
      }

      score += sign * (PIECE_VALUES[piece.type] + TABLES[piece.type][tableIndex]);

      if (white) whiteNonPawnMaterial += piece.type === "p" ? 0 : PIECE_VALUES[piece.type];
      else blackNonPawnMaterial += piece.type === "p" ? 0 : PIECE_VALUES[piece.type];

      if (piece.type === "b") white ? whiteBishops++ : blackBishops++;
      if (piece.type === "p") pawnFiles[piece.color][f].push(r);
      if (piece.type === "r") rooks.push({ color: piece.color, f });
    }
  }

  // Cặp Tượng
  if (whiteBishops >= 2) score += 30;
  if (blackBishops >= 2) score -= 30;

  // Cấu trúc tốt
  for (const color of ["w", "b"] as const) {
    const own = pawnFiles[color];
    const enemy = pawnFiles[color === "w" ? "b" : "w"];
    const sign = color === "w" ? 1 : -1;
    for (let f = 0; f < 8; f++) {
      const ranks = own[f];
      if (ranks.length === 0) continue;
      // Tốt chồng: −20 mỗi tốt trên cột có nhiều hơn một tốt
      if (ranks.length > 1) score -= sign * 20 * ranks.length;
      // Tốt cô lập: không có tốt cùng màu ở cột kề
      const hasNeighbor =
        (f > 0 && own[f - 1].length > 0) || (f < 7 && own[f + 1].length > 0);
      if (!hasNeighbor) score -= sign * 15 * ranks.length;
      // Tốt thông: không có tốt địch chặn phía trước ở cột này và hai cột kề
      for (const r of ranks) {
        let passed = true;
        for (const ef of [f - 1, f, f + 1]) {
          if (ef < 0 || ef > 7) continue;
          for (const er of enemy[ef]) {
            if (color === "w" ? er > r : er < r) {
              passed = false;
              break;
            }
          }
          if (!passed) break;
        }
        if (passed) {
          const advanced = color === "w" ? r - 1 : 6 - r;
          score += sign * 20 * advanced;
        }
      }
    }
  }

  // Xe ở cột mở (không có tốt của cả hai bên)
  for (const rook of rooks) {
    if (pawnFiles.w[rook.f].length === 0 && pawnFiles.b[rook.f].length === 0) {
      score += rook.color === "w" ? 25 : -25;
    }
  }

  // Giai đoạn tàn cuộc: cả hai bên còn ít chất ngoài tốt
  const endgame = whiteNonPawnMaterial <= 1230 && blackNonPawnMaterial <= 1230;
  const kingTable = endgame ? KING_ENDGAME_TABLE : KING_MIDGAME_TABLE;

  if (whiteKing) {
    score += kingTable[(7 - whiteKing.r) * 8 + whiteKing.f];
    score -= 10 * attackedNeighbors(chess, whiteKing, "b");
  }
  if (blackKing) {
    score -= kingTable[blackKing.r * 8 + blackKing.f];
    score += 10 * attackedNeighbors(chess, blackKing, "w");
  }

  return score;
}

/** Đếm số ô quanh Vua bị quân màu `by` kiểm soát. */
function attackedNeighbors(
  chess: Chess,
  king: { f: number; r: number },
  by: Color,
): number {
  let count = 0;
  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (df === 0 && dr === 0) continue;
      const f = king.f + df;
      const r = king.r + dr;
      if (f < 0 || f > 7 || r < 0 || r > 7) continue;
      const sq = `${FILES[f]}${r + 1}` as Square;
      if (chess.isAttacked(sq, by)) count++;
    }
  }
  return count;
}
