/**
 * Engine caro: chấm điểm chuỗi đe doạ (đôi mở, ba mở, bốn…) + negamax
 * trên tập nước ứng viên quanh các quân đã đặt. Điểm dương = X lợi.
 */

import { CARO_SIZE, caroUci, parseCaroUci } from "./rules";

export const CARO_MATE = 1_000_000;

const DIRS: [number, number][] = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

export interface CaroRanked {
  uci: string;
  score: number;
}

export interface CaroSearchResult {
  ranked: CaroRanked[];
  depth: number;
  nodes: number;
}

export interface CaroSearchParams {
  maxDepth?: number;
  timeLimitMs?: number;
  onIteration?: (depth: number, scoreForMover: number, bestUci: string) => void;
}

class TimeUp extends Error {}

/** điểm một chuỗi dài `len` với `open` đầu thoáng (0-2) */
function lineScore(len: number, open: number): number {
  if (len >= 5) return 200_000;
  if (open === 0) return 0;
  if (len === 4) return open === 2 ? 60_000 : 5_000;
  if (len === 3) return open === 2 ? 4_000 : 400;
  if (len === 2) return open === 2 ? 250 : 30;
  return 5;
}

class Engine {
  grid = new Uint8Array(CARO_SIZE * CARO_SIZE);
  stones: number[] = []; // idx các quân đã đặt (theo thứ tự)
  side = 1; // 1 = x, 2 = o
  deadline = Infinity;
  nodes = 0;

  constructor(history: string[]) {
    for (const uci of history) {
      const pt = parseCaroUci(uci);
      if (!pt) continue;
      const idx = pt.y * CARO_SIZE + pt.x;
      this.grid[idx] = this.side;
      this.stones.push(idx);
      this.side = this.side === 1 ? 2 : 1;
    }
  }

  push(idx: number) {
    this.grid[idx] = this.side;
    this.stones.push(idx);
    this.side = this.side === 1 ? 2 : 1;
  }

  pop() {
    const idx = this.stones.pop()!;
    this.grid[idx] = 0;
    this.side = this.side === 1 ? 2 : 1;
  }

  /** điểm nếu `color` đặt quân tại idx (tổng 4 hướng, chuỗi + đầu thoáng) */
  moveScore(idx: number, color: number): number {
    const x = idx % CARO_SIZE;
    const y = Math.floor(idx / CARO_SIZE);
    let total = 0;
    for (const [dx, dy] of DIRS) {
      let len = 1;
      let open = 0;
      for (const sign of [1, -1]) {
        let cx = x + dx * sign;
        let cy = y + dy * sign;
        while (
          cx >= 0 &&
          cx < CARO_SIZE &&
          cy >= 0 &&
          cy < CARO_SIZE &&
          this.grid[cy * CARO_SIZE + cx] === color
        ) {
          len++;
          cx += dx * sign;
          cy += dy * sign;
        }
        if (
          cx >= 0 &&
          cx < CARO_SIZE &&
          cy >= 0 &&
          cy < CARO_SIZE &&
          this.grid[cy * CARO_SIZE + cx] === 0
        ) {
          open++;
        }
      }
      total += lineScore(len, open);
    }
    return total;
  }

  /** ứng viên: ô trống trong bán kính 2 quanh quân đã đặt */
  candidates(): number[] {
    if (this.stones.length === 0) {
      return [100 * CARO_SIZE + 100]; // nước đầu: giữa bàn
    }
    const seen = new Set<number>();
    for (const idx of this.stones) {
      const x = idx % CARO_SIZE;
      const y = Math.floor(idx / CARO_SIZE);
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const cx = x + dx;
          const cy = y + dy;
          if (cx < 0 || cx >= CARO_SIZE || cy < 0 || cy >= CARO_SIZE) continue;
          const ci = cy * CARO_SIZE + cx;
          if (this.grid[ci] === 0) seen.add(ci);
        }
      }
    }
    return [...seen];
  }

  /** top-K ứng viên theo điểm công + thủ cho bên đang đi */
  topCandidates(k: number): { idx: number; score: number; win: boolean }[] {
    const me = this.side;
    const opp = me === 1 ? 2 : 1;
    const scored = this.candidates().map((idx) => {
      const own = this.moveScore(idx, me);
      const theirs = this.moveScore(idx, opp);
      return {
        idx,
        score: own + theirs * 0.9,
        win: own >= 200_000,
      };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k);
  }

  checkTime() {
    if ((this.nodes & 255) === 0 && Date.now() > this.deadline) throw new TimeUp();
  }

  negamax(depth: number, ply: number, alpha: number, beta: number, k: number): number {
    this.nodes++;
    this.checkTime();
    const cands = this.topCandidates(k);
    if (cands.length === 0) return 0;
    // thắng ngay
    if (cands.some((c) => c.win)) return CARO_MATE - ply;
    if (depth === 0) {
      const opp = this.side === 1 ? 2 : 1;
      let bestOwn = 0;
      let bestOpp = 0;
      for (const c of cands) {
        const own = this.moveScore(c.idx, this.side);
        const theirs = this.moveScore(c.idx, opp);
        if (own > bestOwn) bestOwn = own;
        if (theirs > bestOpp) bestOpp = theirs;
      }
      return bestOwn - bestOpp * 0.95;
    }
    let best = -Infinity;
    for (const c of cands) {
      this.push(c.idx);
      const score = -this.negamax(depth - 1, ply + 1, -beta, -alpha, k);
      this.pop();
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }
}

export function searchCaro(
  history: string[],
  params: CaroSearchParams & { k?: number },
): CaroSearchResult {
  const engine = new Engine(history);
  engine.deadline = params.timeLimitMs ? Date.now() + params.timeLimitMs : Infinity;
  const k = params.k ?? 10;
  const maxDepth = params.maxDepth ?? 16;

  const roots = engine.topCandidates(Math.max(k, 8));
  if (roots.length === 0) return { ranked: [], depth: 0, nodes: 0 };

  const toUci = (idx: number) => caroUci(idx % CARO_SIZE, Math.floor(idx / CARO_SIZE));

  let ranked: CaroRanked[] = roots.map((r) => ({ uci: toUci(r.idx), score: r.score }));
  const idxByUci = new Map(roots.map((r) => [toUci(r.idx), r.idx] as const));
  let completedDepth = 0;

  for (let depth = 1; depth <= maxDepth; depth++) {
    const iteration: CaroRanked[] = [];
    let alpha = -Infinity;
    try {
      for (const prev of ranked) {
        const idx = idxByUci.get(prev.uci)!;
        // thắng ngay tại gốc
        if (engine.moveScore(idx, engine.side) >= 200_000) {
          iteration.push({ uci: prev.uci, score: CARO_MATE });
          alpha = CARO_MATE;
          continue;
        }
        engine.push(idx);
        const score = -engine.negamax(depth - 1, 1, -Infinity, -alpha, k);
        engine.pop();
        iteration.push({ uci: prev.uci, score });
        if (score > alpha) alpha = score;
      }
    } catch (err) {
      if (err instanceof TimeUp) break;
      throw err;
    }
    iteration.sort((a, b) => b.score - a.score);
    ranked = iteration;
    completedDepth = depth;
    params.onIteration?.(depth, ranked[0].score, ranked[0].uci);
    if (ranked[0].score >= CARO_MATE - 100) break;
  }
  return { ranked, depth: completedDepth, nodes: engine.nodes };
}
