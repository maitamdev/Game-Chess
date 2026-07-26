/**
 * Engine cờ tướng: minimax + cắt tỉa alpha-beta + quiescence,
 * đào sâu dần kèm giới hạn thời gian — cùng kiến trúc engine cờ vua.
 * Điểm centipawn, dương = Đỏ lợi.
 */

import { Xiangqi, xqCoords, type XqMove, type XqPieceType } from "./rules";

export const XQ_MATE = 100_000;

export const XQ_VALUES: Record<XqPieceType, number> = {
  r: 1000, // Xe
  c: 450, // Pháo
  h: 400, // Mã
  a: 200, // Sĩ
  e: 200, // Tượng
  s: 100, // Tốt
  k: 0,
};

export function evaluateXq(game: Xiangqi): number {
  const board = game.boardArray();
  let score = 0;
  for (let i = 0; i < 90; i++) {
    const p = board[i];
    if (!p) continue;
    const rank = Math.floor(i / 9);
    const file = i % 9;
    let v = XQ_VALUES[p.type];
    const advance = p.color === "r" ? rank : 9 - rank; // mức tiến quân 0–9
    switch (p.type) {
      case "s": {
        const crossed = p.color === "r" ? rank >= 5 : rank <= 4;
        if (crossed) v += 100 + (advance - 5) * 20; // tốt qua sông mạnh dần
        if (file >= 2 && file <= 6) v += 10;
        break;
      }
      case "h":
        if (file >= 2 && file <= 6) v += 25;
        if (advance >= 3 && advance <= 7) v += 15;
        break;
      case "c":
        if (file === 4) v += 30; // pháo lộ giữa
        if (advance >= 3) v += 10;
        break;
      case "r":
        if (advance >= 3) v += 15;
        break;
      default:
        break;
    }
    score += p.color === "r" ? v : -v;
  }
  return score;
}

export interface XqRankedMove {
  uci: string;
  san: string;
  score: number;
}

export interface XqSearchResult {
  ranked: XqRankedMove[];
  depth: number;
  nodes: number;
}

export interface XqSearchParams {
  maxDepth?: number;
  timeLimitMs?: number;
  fullWindowRoot?: boolean;
  /** key các thế cờ đã qua trong ván — engine tránh/tận dụng hoà lặp thế */
  historyKeys?: string[];
  onIteration?: (depth: number, scoreForMover: number, bestUci: string) => void;
}

class TimeUp extends Error {}

function orderScore(m: XqMove): number {
  if (m.captured) return 100_000 + 10 * XQ_VALUES[m.captured] - XQ_VALUES[m.piece];
  return 0;
}

function orderMoves(moves: XqMove[]): XqMove[] {
  return moves
    .map((m) => [m, orderScore(m)] as const)
    .sort((a, b) => b[1] - a[1])
    .map(([m]) => m);
}

interface Ctx {
  game: Xiangqi;
  deadline: number;
  nodes: number;
  /** số lần mỗi thế đã xuất hiện trong VÁN (trước khi tìm kiếm) */
  historyCounts: Map<string, number>;
  /** số lần mỗi thế xuất hiện trên ĐƯỜNG tìm kiếm hiện tại */
  pathCounts: Map<string, number>;
}

function checkTime(ctx: Ctx) {
  if ((ctx.nodes & 1023) === 0 && Date.now() > ctx.deadline) throw new TimeUp();
}

function quiescence(ctx: Ctx, alpha: number, beta: number, ply: number): number {
  ctx.nodes++;
  checkTime(ctx);
  const mover = ctx.game.turn();
  const stand = evaluateXq(ctx.game) * (mover === "r" ? 1 : -1);
  if (stand >= beta) return stand;
  if (stand > alpha) alpha = stand;
  if (ply > 24) return stand;
  const captures = orderMoves(ctx.game.moves().filter((m) => m.captured));
  for (const m of captures) {
    ctx.game.pushMove(m);
    const score = -quiescence(ctx, -beta, -alpha, ply + 1);
    ctx.game.popMove();
    if (score >= beta) return score;
    if (score > alpha) alpha = score;
  }
  return alpha;
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

  // Lặp thế: thế này đã xuất hiện ≥2 lần (ván + đường tìm kiếm) →
  // lần này là lần 3 → tầng ván sẽ xử hoà. Chấm 0 để engine đang thắng
  // né lặp, đang thua biết tìm lặp.
  const key = ctx.game.positionKey();
  const seen =
    (ctx.historyCounts.get(key) ?? 0) + (ctx.pathCounts.get(key) ?? 0);
  if (ply > 0 && seen >= 2) return 0;

  if (depth === 0) return quiescence(ctx, alpha, beta, ply);

  const moves = orderMoves(ctx.game.moves());
  if (moves.length === 0) {
    // hết nước đi trong cờ tướng là thua (chiếu bí hoặc bị vây)
    return -(XQ_MATE - ply);
  }
  ctx.pathCounts.set(key, (ctx.pathCounts.get(key) ?? 0) + 1);
  let best = -Infinity;
  for (const m of moves) {
    ctx.game.pushMove(m);
    const score = -negamax(ctx, depth - 1, ply + 1, -beta, -alpha);
    ctx.game.popMove();
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  const after = (ctx.pathCounts.get(key) ?? 1) - 1;
  if (after <= 0) ctx.pathCounts.delete(key);
  else ctx.pathCounts.set(key, after);
  return best;
}

export function searchXq(fen: string, params: XqSearchParams): XqSearchResult {
  const game = new Xiangqi(fen);
  const rootMoves = game.moves();
  if (rootMoves.length === 0) return { ranked: [], depth: 0, nodes: 0 };

  const maxDepth = params.maxDepth ?? 64;
  const deadline = params.timeLimitMs ? Date.now() + params.timeLimitMs : Infinity;
  const historyCounts = new Map<string, number>();
  for (const k of params.historyKeys ?? []) {
    historyCounts.set(k, (historyCounts.get(k) ?? 0) + 1);
  }
  const ctx: Ctx = {
    game,
    deadline,
    nodes: 0,
    historyCounts,
    pathCounts: new Map(),
  };

  let ranked: XqRankedMove[] = orderMoves(rootMoves).map((m) => ({
    uci: m.uci,
    san: m.san,
    score: 0,
  }));
  const byUci = new Map(rootMoves.map((m) => [m.uci, m] as const));
  let completedDepth = 0;

  for (let depth = 1; depth <= maxDepth; depth++) {
    const iteration: XqRankedMove[] = [];
    let alpha = -Infinity;
    try {
      for (const prev of ranked) {
        const m = byUci.get(prev.uci)!;
        game.pushMove(m);
        const score = -negamax(
          ctx,
          depth - 1,
          1,
          -Infinity,
          params.fullWindowRoot ? Infinity : -alpha,
        );
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
    if (Math.abs(ranked[0].score) >= XQ_MATE - 100) break;
  }
  return { ranked, depth: completedDepth, nodes: ctx.nodes };
}
