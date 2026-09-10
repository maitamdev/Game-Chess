/// <reference lib="webworker" />

import { searchCaro, type CaroRanked, type CaroSearchParams } from "./engine";

export type CaroEngineLevel = 1 | 2 | 3 | 4 | 5;

type InMessage =
  | { type: "search"; level: CaroEngineLevel; history: string[]; fen?: string }
  | { type: "stop" };

const LEVEL_PARAMS: Record<CaroEngineLevel, CaroSearchParams & { k?: number }> = {
  1: { maxDepth: 1, k: 6, useVcf: false, useVct: false },
  2: { maxDepth: 2, k: 8, useVcf: false, useVct: false },
  3: { maxDepth: 4, k: 10, timeLimitMs: 800, useVcf: true, useVct: false },
  4: { maxDepth: 14, k: 12, timeLimitMs: 1500, useVcf: true, useVct: true },
  5: { maxDepth: 20, k: 16, timeLimitMs: 3000, useVcf: true, useVct: true },
};

function pickMove(ranked: CaroRanked[], level: CaroEngineLevel): CaroRanked {
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

  const moverSign = msg.history.length % 2 === 0 ? 1 : -1; // X dương
  const result = searchCaro(msg.history, {
    ...LEVEL_PARAMS[msg.level],
    onIteration: (depth, scoreForMover) => {
      self.postMessage({ type: "progress", depth, evaluation: scoreForMover * moverSign });
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
