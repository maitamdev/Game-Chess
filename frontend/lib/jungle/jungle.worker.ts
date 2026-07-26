/// <reference lib="webworker" />

import { searchJg, type JgRanked, type JgSearchParams } from "./engine";

export type JgEngineLevel = 1 | 2 | 3 | 4 | 5;

type InMessage =
  | { type: "search"; level: JgEngineLevel; history: string[]; fen?: string }
  | { type: "stop" };

const LEVEL_PARAMS: Record<JgEngineLevel, JgSearchParams> = {
  1: { maxDepth: 1, fullWindowRoot: true },
  2: { maxDepth: 2, fullWindowRoot: true },
  3: { maxDepth: 4 },
  4: { timeLimitMs: 1000 },
  5: { timeLimitMs: 2500 },
};

function pickMove(ranked: JgRanked[], level: JgEngineLevel): JgRanked {
  if (level === 1) {
    const top = ranked.slice(0, 5);
    return top[Math.floor(Math.random() * top.length)];
  }
  if (level === 2 && ranked.length > 1 && Math.random() < 0.2) return ranked[1];
  return ranked[0];
}

self.onmessage = (e: MessageEvent<InMessage>) => {
  const msg = e.data;
  if (msg.type === "stop") return;

  const moverSign = msg.history.length % 2 === 0 ? 1 : -1; // Đỏ dương
  const result = searchJg(msg.history, {
    ...LEVEL_PARAMS[msg.level],
    onIteration: (depth, scoreForMover) => {
      self.postMessage({
        type: "progress",
        depth,
        evaluation: scoreForMover * moverSign,
      });
    },
  });
  if (result.ranked.length === 0) return;
  const chosen = pickMove(result.ranked, msg.level);
  self.postMessage({
    type: "bestmove",
    move: chosen.uci,
    evaluation: chosen.score * moverSign,
    depth: result.depth,
  });
};
