import { Xiangqi, type XqColor, type XqMove, type XqPieceType } from "./rules";

export interface TrackedXqPiece {
  id: string;
  type: XqPieceType;
  color: XqColor;
  square: string;
}

/** Danh tính quân qua lịch sử để hoạt ảnh gắn đúng quân (như pieceTracker cờ vua). */
export function trackXqPieces(
  moves: readonly XqMove[],
  upTo: number,
): TrackedXqPiece[] {
  const start = new Xiangqi();
  const at = new Map<string, TrackedXqPiece>();
  for (const p of start.pieces()) {
    at.set(p.square, { id: `${p.color}_${p.type}_${p.square}`, ...p });
  }
  for (let i = 0; i < upTo && i < moves.length; i++) {
    const m = moves[i];
    if (m.captured) at.delete(m.to);
    const piece = at.get(m.from);
    if (piece) {
      at.delete(m.from);
      piece.square = m.to;
      at.set(m.to, piece);
    }
  }
  return [...at.values()];
}
