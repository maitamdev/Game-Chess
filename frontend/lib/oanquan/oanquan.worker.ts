/// <reference lib="webworker" />

import { searchOq, type OqRanked, type OqSearchParams } from "./engine";
import { OAnQuan } from "./rules";

export type OqEngineLevel = 1 | 2 | 3 | 4 | 5;

type InMessage =
  | { type: "search"; level: OqEngineLevel; history: string[]; fen?: string }
  | { type: "stop" };

const LEVEL_PARAMS: Record<OqEngineLevel, OqSearchParams> = {
  1: { maxDepth: 1, fullWindowRoot: true },
  2: { maxDepth: 2, fullWindowRoot: true },
  3: { maxDepth: 4 },
  4: { timeLimitMs: 1000 },
  5: { timeLimitMs: 2500 },
};

function pickMove(ranked: OqRanked[], level: OqEngineLevel): OqRanked {
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

  // dựng lại ván để lấy đúng lượt (không suy từ history.length) - "a" dương
  const moverSign = new OAnQuan(msg.history).turn() === "a" ? 1 : -1;
  const result = searchOq(msg.history, {
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
