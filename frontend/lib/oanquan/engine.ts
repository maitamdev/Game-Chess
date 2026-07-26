/**
 * Engine ô ăn quan: negamax + alpha-beta. Lượng giá: điểm kho + dân còn trên
 * hàng mình (điểm dương = bên "a" lợi). Thế kết thúc lấy theo winner tính sổ.
 */

import { OAnQuan, OQ_OWN_CELLS, type OqEnd, type OqMove } from "./rules";

export const OQ_MATE = 1_000_000;

export function evaluateOq(game: OAnQuan): number {
  const board = game.boardArray();
  let onA = 0;
  let onB = 0;
  for (const i of OQ_OWN_CELLS.a) onA += board[i];
  for (const i of OQ_OWN_CELLS.b) onB += board[i];
  // dân trên hàng mình sẽ được thu về kho khi tính sổ
  return (game.score("a") - game.score("b")) * 100 + (onA - onB) * 30;
}

export interface OqRanked {
  uci: string;
  score: number;
}

export interface OqSearchResult {
  ranked: OqRanked[];
  depth: number;
  nodes: number;
}

export interface OqSearchParams {
  maxDepth?: number;
  timeLimitMs?: number;
  fullWindowRoot?: boolean;
  onIteration?: (depth: number, scoreForMover: number, bestUci: string) => void;
}

class TimeUp extends Error {}

function orderMoves(moves: OqMove[]): OqMove[] {
  return moves.slice().sort((a, b) => b.gained - a.gained);
}

/** Điểm thế kết thúc theo góc nhìn bên "a". */
function terminalScore(end: OqEnd, ply: number): number {
  if (end.winner === null) return 0;
  const s = OQ_MATE - ply;
  return end.winner === "a" ? s : -s;
}

interface Ctx {
  game: OAnQuan;
  deadline: number;
  nodes: number;
}

function checkTime(ctx: Ctx) {
  if ((ctx.nodes & 255) === 0 && Date.now() > ctx.deadline) throw new TimeUp();
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
  if (depth === 0) {
    return evaluateOq(ctx.game) * (ctx.game.turn() === "a" ? 1 : -1);
  }
  const moves = orderMoves(ctx.game.moves());
  let best = -Infinity;
  for (const m of moves) {
    ctx.game.pushMove(m);
    const end = ctx.game.gameEnd();
    let score: number;
    if (end) {
      // ván khép lại ngay sau nước này → điểm theo winner, đổi về góc bên đi
      score = terminalScore(end, ply) * (m.color === "a" ? 1 : -1);
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

export function searchOq(history: string[], params: OqSearchParams): OqSearchResult {
  const game = new OAnQuan(history);
  const rootMoves = game.moves();
  if (rootMoves.length === 0) return { ranked: [], depth: 0, nodes: 0 };

  const maxDepth = params.maxDepth ?? 32;
  const deadline = params.timeLimitMs ? Date.now() + params.timeLimitMs : Infinity;
  const ctx: Ctx = { game, deadline, nodes: 0 };

  let ranked: OqRanked[] = orderMoves(rootMoves).map((m) => ({
    uci: m.uci,
    score: 0,
  }));
  const byUci = new Map(rootMoves.map((m) => [m.uci, m] as const));
  let completedDepth = 0;

  for (let depth = 1; depth <= maxDepth; depth++) {
    const iteration: OqRanked[] = [];
    let alpha = -Infinity;
    try {
      for (const prev of ranked) {
        const m = byUci.get(prev.uci)!;
        game.pushMove(m);
        const end = game.gameEnd();
        let score: number;
        if (end) {
          score = terminalScore(end, 0) * (m.color === "a" ? 1 : -1);
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
    if (Math.abs(ranked[0].score) >= OQ_MATE - 100) break;
  }
  return { ranked, depth: completedDepth, nodes: ctx.nodes };
}
