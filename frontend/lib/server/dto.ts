/**
 * Serializer DTO - giữ đúng hình dạng JSON của backend FastAPI cũ
 * (snake_case, timestamp ISO) để toàn bộ code client hiện có chạy nguyên vẹn.
 */

import type { GameRow, MoveRow, UserRow } from "./db";
import type { Variant } from "./variants";

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

export function playerBriefDto(u: UserRow) {
  return {
    id: u.id,
    username: u.username,
  };
}

export function gameSummaryDto(g: GameRow, white: UserRow, black: UserRow) {
  const variant = g.variant as Variant;
  return {
    id: g.id,
    white: playerBriefDto(white),
    black: playerBriefDto(black),
    variant,
    time_control: g.timeControl,
    result: g.result,
    termination: g.termination,
    started_at: iso(g.startedAt),
    ended_at: g.endedAt === null ? null : iso(g.endedAt),
  };
}

export function moveDto(m: MoveRow) {
  return {
    ply: m.ply,
    san: m.san,
    uci: m.uci,
    fen_after: m.fenAfter,
    time_left_ms: m.timeLeftMs,
    evaluation: m.evaluation,
  };
}

export function gameDetailDto(
  g: GameRow,
  white: UserRow,
  black: UserRow,
  moveRows: MoveRow[],
) {
  return {
    ...gameSummaryDto(g, white, black),
    pgn: g.pgn,
    final_fen: g.finalFen,
    moves: moveRows.map(moveDto),
  };
}
