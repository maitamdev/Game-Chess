/**
 * Engine cờ thú: negamax + alpha-beta. Lượng giá: giá trị thú + độ tiến
 * về hang địch (điểm dương = Đỏ lợi). Vào hang / hết quân = thắng tuyệt đối.
 */

import { Jungle, jgCoords, type JgMove, type JgRank } from "./rules";

export const JG_MATE = 1_000_000;

const VALUES: Record<JgRank, number> = {
  8: 1000,
  7: 900,
  6: 800,
  5: 600,
  4: 400,
  3: 300,
  2: 200,
  1: 550, // chuột: vừa doạ voi vừa lội sông
};

const DEN_R = { rank: 0, file: 3 };
const DEN_B = { rank: 8, file: 3 };

export function evaluateJg(game: Jungle): number {
  const board = game.boardArray();
  let score = 0;
  for (let i = 0; i < 63; i++) {
    const p = board[i];
    if (!p) continue;
    const r = Math.floor(i / 7);
    const f = i % 7;
    const den = p.color === "r" ? DEN_B : DEN_R;
    const dist = Math.abs(den.rank - r) + Math.abs(den.file - f);
    const v = VALUES[p.rank] + (12 - dist) * 7;
    score += p.color === "r" ? v : -v;
  }
  return score;
}

export interface JgRanked {
  uci: string;
  san: string;
  score: number;
}

export interface JgSearchResult {
  ranked: JgRanked[];
  depth: number;
  nodes: number;
}

export interface JgSearchParams {
  maxDepth?: number;
  timeLimitMs?: number;
  fullWindowRoot?: boolean;
  onIteration?: (depth: number, scoreForMover: number, bestUci: string) => void;
}

class TimeUp extends Error {}

function orderScore(m: JgMove): number {
  let s = 0;
  if (m.captured) s += 10_000 + VALUES[m.captured];
  // tiến về hang địch
  const den = m.color === "r" ? DEN_B : DEN_R;
  const from = jgCoords(m.from);
  const to = jgCoords(m.to);
  const dBefore = Math.abs(den.rank - from.rank) + Math.abs(den.file - from.file);
  const dAfter = Math.abs(den.rank - to.rank) + Math.abs(den.file - to.file);
  s += (dBefore - dAfter) * 50;
  if (dAfter === 0) s += 100_000; // vào hang
  return s;
}

function orderMoves(moves: JgMove[]): JgMove[] {
  return moves
    .map((m) => [m, orderScore(m)] as const)
    .sort((a, b) => b[1] - a[1])
    .map(([m]) => m);
}

interface Ctx {
  game: Jungle;
  deadline: number;
  nodes: number;
}

function checkTime(ctx: Ctx) {
  if ((ctx.nodes & 511) === 0 && Date.now() > ctx.deadline) throw new TimeUp();
}

/** thắng tức thời sau nước vừa đi? (vào hang địch hoặc địch hết quân) */
function justWon(game: Jungle, mover: "r" | "b"): boolean {
  const board = game.boardArray();
  const denIdx = mover === "r" ? 8 * 7 + 3 : 3;
  const onDen = board[denIdx];
  if (onDen && onDen.color === mover) return true;
  const other = mover === "r" ? "b" : "r";
  return !game.hasPieces(other);
}

function negamax(
  ctx: Ctx,
  depth: number,
  ply: number,
  alpha: number,
  beta: number,
): number {
  ctx.nodes++;
  checkTime(ctx);
  const moves = orderMoves(ctx.game.moves());
  if (moves.length === 0) return -(JG_MATE - ply); // hết nước = thua
  if (depth === 0) {
    const mover = ctx.game.turn();
    return evaluateJg(ctx.game) * (mover === "r" ? 1 : -1);
  }
  let best = -Infinity;
  for (const m of moves) {
    ctx.game.pushMove(m);
    let score: number;
    if (justWon(ctx.game, m.color)) {
      score = JG_MATE - ply;
    } else {
      score = -negamax(ctx, depth - 1, ply + 1, -beta, -alpha);
    }
    ctx.game.popMove();
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

export function searchJg(uciHistory: string[], params: JgSearchParams): JgSearchResult {
  const game = new Jungle(uciHistory);
  const rootMoves = game.moves();
  if (rootMoves.length === 0) return { ranked: [], depth: 0, nodes: 0 };

  const maxDepth = params.maxDepth ?? 32;
  const deadline = params.timeLimitMs ? Date.now() + params.timeLimitMs : Infinity;
  const ctx: Ctx = { game, deadline, nodes: 0 };

  let ranked: JgRanked[] = orderMoves(rootMoves).map((m) => ({
    uci: m.uci,
    san: m.san,
    score: 0,
  }));
  const byUci = new Map(rootMoves.map((m) => [m.uci, m] as const));
  let completedDepth = 0;

  for (let depth = 1; depth <= maxDepth; depth++) {
    const iteration: JgRanked[] = [];
    let alpha = -Infinity;
    try {
      for (const prev of ranked) {
        const m = byUci.get(prev.uci)!;
        game.pushMove(m);
        let score: number;
        if (justWon(game, m.color)) {
          score = JG_MATE;
        } else {
          score = -negamax(
            ctx,
            depth - 1,
            1,
            -Infinity,
            params.fullWindowRoot ? Infinity : -alpha,
          );
        }
        game.popMove();
        iteration.push({ uci: prev.uci, san: m.san, score });
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
    if (Math.abs(ranked[0].score) >= JG_MATE - 100) break;
  }
  return { ranked, depth: completedDepth, nodes: ctx.nodes };
}
