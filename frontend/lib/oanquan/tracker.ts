import { OAnQuan, OQ_CELLS, type OqColor, type OqMove, type OqStore } from "./rules";

/** Trạng thái bàn tại một thời điểm trong lịch sử (để tua lại). */
export interface OqBoardState {
  dan: number[];
  quanLeft: boolean;
  quanRight: boolean;
  storeA: OqStore;
  storeB: OqStore;
  turn: OqColor;
}

/**
 * Replay tới nước thứ `upTo` (0 = bàn khởi đầu). Ô ăn quan mỗi nước đổi
 * nhiều ô nên phải chơi lại từ đầu thay vì diff từng nước.
 */
export function oqBoardAt(moves: readonly OqMove[], upTo: number): OqBoardState {
  const game = new OAnQuan();
  const n = Math.max(0, Math.min(upTo, moves.length));
  for (let i = 0; i < n; i++) {
    if (!game.move(moves[i].uci)) break; // không xảy ra trong thực tế
  }
  return {
    dan: Array.from({ length: OQ_CELLS }, (_, i) => game.danAt(i)),
    quanLeft: game.quanAt(0),
    quanRight: game.quanAt(6),
    storeA: game.store("a"),
    storeB: game.store("b"),
    turn: game.turn(),
  };
}
