import { Jungle, type JgMove } from "./rules";
import type { JgTrackedPiece } from "@/components/jungle/JungleBoard";

/** Danh tính thú qua lịch sử để hoạt ảnh gắn đúng quân. */
export function trackJgPieces(
  moves: readonly JgMove[],
  upTo: number,
): JgTrackedPiece[] {
  const at = new Map<string, JgTrackedPiece>();
  for (const p of new Jungle().pieces()) {
    at.set(p.square, { id: `${p.color}_${p.rank}_${p.square}`, ...p });
  }
  for (let i = 0; i < upTo && i < moves.length; i++) {
    const m = moves[i];
    if (m.captured !== undefined) at.delete(m.to);
    const piece = at.get(m.from);
    if (piece) {
      at.delete(m.from);
      piece.square = m.to;
      at.set(m.to, piece);
    }
  }
  return [...at.values()];
}
