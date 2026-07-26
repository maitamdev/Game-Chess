/// <reference lib="webworker" />

import { Xiangqi } from "./rules";
import { evaluateXq, searchXq, type XqRankedMove, type XqSearchParams } from "./engine";

export type XqEngineLevel = 1 | 2 | 3 | 4 | 5;

type InMessage =
  | { type: "search"; fen: string; level: XqEngineLevel; history?: string[] }
  | { type: "stop" };

/** Năm mức độ — cùng cấu trúc engine cờ vua (mục 6). */
const LEVEL_PARAMS: Record<XqEngineLevel, XqSearchParams> = {
  1: { maxDepth: 1, fullWindowRoot: true },
  2: { maxDepth: 2, fullWindowRoot: true },
  3: { maxDepth: 3 },
  4: { timeLimitMs: 1000 },
  5: { timeLimitMs: 2500 },
};

function pickMove(ranked: XqRankedMove[], level: XqEngineLevel): XqRankedMove {
  if (level === 1) {
    const top = ranked.slice(0, 5);
    return top[Math.floor(Math.random() * top.length)];
  }
  if (level === 2 && ranked.length > 1 && Math.random() < 0.2) return ranked[1];
  return ranked[0];
}

self.onmessage = (e: MessageEvent<InMessage>) => {
  const msg = e.data;
  if (msg.type === "stop") return; // hủy thật sự bằng terminate phía client

  const { fen, level } = msg;
  const redSign = new Xiangqi(fen).turn() === "r" ? 1 : -1;

  const result = searchXq(fen, {
    ...LEVEL_PARAMS[level],
    historyKeys: msg.history,
    onIteration: (depth, scoreForMover) => {
      self.postMessage({ type: "progress", depth, evaluation: scoreForMover * redSign });
    },
  });
  if (result.ranked.length === 0) return;
  const chosen = pickMove(result.ranked, level);
  self.postMessage({
    type: "bestmove",
    move: chosen.uci,
    evaluation: chosen.score * redSign,
    depth: result.depth,
  });
};

// giữ import evaluateXq cho tương lai (tra cứu tĩnh) — tránh cảnh báo unused
void evaluateXq;
