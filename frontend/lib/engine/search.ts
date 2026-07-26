import { Chess, type Move } from "chess.js";
import { evaluate } from "./evaluate";
import { PIECE_VALUES } from "./tables";

export const MATE_SCORE = 100_000;

export interface RankedMove {
  uci: string;
  san: string;
  /** Điểm theo góc nhìn bên đang đi */
  score: number;
}

export interface SearchResult {
  ranked: RankedMove[]; // sắp xếp giảm dần theo điểm
  depth: number; // độ sâu đã hoàn thành
  nodes: number;
}

export interface SearchParams {
  maxDepth?: number;
  timeLimitMs?: number;
  /**
   * Tìm điểm chính xác cho MỌI nước ở gốc (cửa sổ đầy đủ) — cần cho
   * mức 1–2 khi phải chọn ngẫu nhiên trong các nước tốt nhất.
   */
  fullWindowRoot?: boolean;
  onIteration?: (depth: number, scoreForMover: number, bestUci: string) => void;
}

class TimeUp extends Error {}

export function uciOf(m: Move): string {
  return `${m.from}${m.to}${m.promotion ?? ""}`;
}

/**
 * Sắp xếp nước đi (mục 6): ăn quân theo MVV-LVA trước,
 * rồi tới phong cấp, rồi nước chiếu.
 */
function orderScore(m: Move): number {
  if (m.captured) {
    return 100_000 + 10 * PIECE_VALUES[m.captured] - PIECE_VALUES[m.piece];
  }
  if (m.promotion) return 90_000 + PIECE_VALUES[m.promotion];
  // chess.js đã tính sẵn dấu chiếu trong SAN
  if (m.san.includes("+") || m.san.includes("#")) return 80_000;
  return 0;
}

function orderMoves(moves: Move[]): Move[] {
  return moves
    .map((m) => [m, orderScore(m)] as const)
    .sort((a, b) => b[1] - a[1])
    .map(([m]) => m);
}

interface Ctx {
  chess: Chess;
  deadline: number;
  nodes: number;
}

function checkTime(ctx: Ctx) {
  if ((ctx.nodes & 1023) === 0 && Date.now() > ctx.deadline) throw new TimeUp();
}

/** Tìm kiếm tĩnh: chỉ duyệt tiếp các nước ăn quân ở nút lá. */
function quiescence(ctx: Ctx, alpha: number, beta: number, ply: number): number {
  ctx.nodes++;
  checkTime(ctx);
  const mover = ctx.chess.turn();
  const stand = evaluate(ctx.chess) * (mover === "w" ? 1 : -1);
  if (stand >= beta) return stand;
  if (stand > alpha) alpha = stand;
  if (ply > 32) return stand;

  const captures = orderMoves(
    ctx.chess.moves({ verbose: true }).filter((m) => m.captured),
  );
  for (const m of captures) {
    ctx.chess.move(m);
    const score = -quiescence(ctx, -beta, -alpha, ply + 1);
    ctx.chess.undo();
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

  if (ctx.chess.isDraw()) return 0; // lặp thế, 50 nước, thiếu lực trong cây tìm kiếm

  if (depth === 0) return quiescence(ctx, alpha, beta, ply);

  const moves = orderMoves(ctx.chess.moves({ verbose: true }));
  if (moves.length === 0) {
    return ctx.chess.inCheck() ? -(MATE_SCORE - ply) : 0;
  }

  let best = -Infinity;
  for (const m of moves) {
    ctx.chess.move(m);
    const score = -negamax(ctx, depth - 1, ply + 1, -beta, -alpha);
    ctx.chess.undo();
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break; // cắt tỉa alpha-beta
  }
  return best;
}

/**
 * Đào sâu dần (iterative deepening) kèm giới hạn thời gian.
 * Trả về danh sách nước ở gốc đã chấm điểm của lần lặp sâu nhất hoàn thành.
 */
export function search(fen: string, params: SearchParams): SearchResult {
  const chess = new Chess(fen);
  const rootMoves = chess.moves({ verbose: true });
  if (rootMoves.length === 0) return { ranked: [], depth: 0, nodes: 0 };

  const maxDepth = params.maxDepth ?? 64;
  const deadline = params.timeLimitMs ? Date.now() + params.timeLimitMs : Infinity;
  const ctx: Ctx = { chess, deadline, nodes: 0 };

  let ranked: RankedMove[] = orderMoves(rootMoves).map((m) => ({
    uci: uciOf(m),
    san: m.san,
    score: 0,
  }));
  const byUci = new Map(rootMoves.map((m) => [uciOf(m), m] as const));
  let completedDepth = 0;

  for (let depth = 1; depth <= maxDepth; depth++) {
    const iteration: RankedMove[] = [];
    let alpha = -Infinity;
    try {
      // Duyệt theo thứ tự tốt nhất của lần lặp trước để cắt tỉa hiệu quả
      for (const prev of ranked) {
        const m = byUci.get(prev.uci)!;
        chess.move(m);
        const score = -negamax(
          ctx,
          depth - 1,
          1,
          -Infinity,
          params.fullWindowRoot ? Infinity : -alpha,
        );
        chess.undo();
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
    // Đã thấy chiếu bí chắc chắn thì không cần đào sâu thêm
    if (Math.abs(ranked[0].score) >= MATE_SCORE - 100) break;
  }

  return { ranked, depth: completedDepth, nodes: ctx.nodes };
}
