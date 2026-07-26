/// <reference lib="webworker" />

import { Chess } from "chess.js";
import { evaluate } from "./evaluate";
import { probeBook } from "./book";
import { search, type RankedMove, type SearchParams } from "./search";

export type EngineLevel = 1 | 2 | 3 | 4 | 5;

type InMessage =
  | { type: "search"; fen: string; level: EngineLevel }
  | { type: "stop" };

type OutMessage =
  | { type: "bestmove"; move: string; evaluation: number; depth: number }
  | { type: "progress"; depth: number; evaluation: number };

/** Năm mức độ — mục 6 */
const LEVEL_PARAMS: Record<EngineLevel, SearchParams> = {
  1: { maxDepth: 1, fullWindowRoot: true },
  2: { maxDepth: 2, fullWindowRoot: true },
  3: { maxDepth: 3 },
  4: { timeLimitMs: 1000 },
  5: { timeLimitMs: 2500 },
};

function pickMove(ranked: RankedMove[], level: EngineLevel): RankedMove {
  if (level === 1) {
    // Chọn ngẫu nhiên trong 5 nước tốt nhất
    const top = ranked.slice(0, 5);
    return top[Math.floor(Math.random() * top.length)];
  }
  if (level === 2 && ranked.length > 1 && Math.random() < 0.2) {
    // 20% khả năng chọn nước tốt thứ hai
    return ranked[1];
  }
  return ranked[0];
}

self.onmessage = (e: MessageEvent<InMessage>) => {
  const msg = e.data;
  if (msg.type === "stop") {
    // search chạy đồng bộ nên 'stop' chỉ được xử lý giữa hai lần tìm kiếm;
    // hủy giữa chừng do phía client thực hiện bằng cách terminate worker
    return;
  }

  const { fen, level } = msg;
  const post = (out: OutMessage) => self.postMessage(out);

  const whiteSign = new Chess(fen).turn() === "w" ? 1 : -1;

  // Mức 5: tra bộ khai cuộc trước
  if (level === 5) {
    const bookMove = probeBook(fen);
    if (bookMove) {
      post({
        type: "bestmove",
        move: bookMove.uci,
        evaluation: evaluate(new Chess(fen)),
        depth: 0,
      });
      return;
    }
  }

  const result = search(fen, {
    ...LEVEL_PARAMS[level],
    onIteration: (depth, scoreForMover) => {
      post({ type: "progress", depth, evaluation: scoreForMover * whiteSign });
    },
  });

  if (result.ranked.length === 0) return; // không còn nước đi

  const chosen = pickMove(result.ranked, level);
  post({
    type: "bestmove",
    move: chosen.uci,
    evaluation: chosen.score * whiteSign,
    depth: result.depth,
  });
};
