/**
 * Serializer DTO — giữ đúng hình dạng JSON của backend FastAPI cũ
 * (snake_case, timestamp ISO) để toàn bộ code client hiện có chạy nguyên vẹn.
 */

import type { GameRow, MoveRow, UserRow } from "./db";
import { userVariantStats, type Variant } from "./variants";

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

export function userPublicDto(u: UserRow) {
  return {
    id: u.id,
    username: u.username,
    elo: u.elo,
    games_played: u.gamesPlayed,
    wins: u.wins,
    losses: u.losses,
    draws: u.draws,
    xq_elo: u.xqElo,
    xq_games_played: u.xqGamesPlayed,
    xq_wins: u.xqWins,
    xq_losses: u.xqLosses,
    xq_draws: u.xqDraws,
    caro_elo: u.caroElo,
    caro_games_played: u.caroGamesPlayed,
    caro_wins: u.caroWins,
    caro_losses: u.caroLosses,
    caro_draws: u.caroDraws,
    jg_elo: u.jgElo,
    jg_games_played: u.jgGamesPlayed,
    jg_wins: u.jgWins,
    jg_losses: u.jgLosses,
    jg_draws: u.jgDraws,
    oq_elo: u.oqElo,
    oq_games_played: u.oqGamesPlayed,
    oq_wins: u.oqWins,
    oq_losses: u.oqLosses,
    oq_draws: u.oqDraws,
    created_at: iso(u.createdAt),
  };
}

/** Elo hiển thị theo đúng variant của ván (backend cũ luôn lấy Elo cờ vua — đã sửa). */
export function playerBriefDto(u: UserRow, variant: Variant) {
  return {
    id: u.id,
    username: u.username,
    elo: userVariantStats(u, variant).elo,
  };
}

export function gameSummaryDto(g: GameRow, white: UserRow, black: UserRow) {
  const variant = g.variant as Variant;
  return {
    id: g.id,
    white: playerBriefDto(white, variant),
    black: playerBriefDto(black, variant),
    variant,
    time_control: g.timeControl,
    result: g.result,
    termination: g.termination,
    white_elo_before: g.whiteEloBefore,
    black_elo_before: g.blackEloBefore,
    elo_change: g.eloChange,
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
