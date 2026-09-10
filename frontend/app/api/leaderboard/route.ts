import { NextResponse, type NextRequest } from "next/server";

import { handle } from "@/lib/server/errors";
import { leaderboard } from "@/lib/server/ratings";

export const GET = handle(async (request: NextRequest) => {
  const game = request.nextUrl.searchParams.get("game") ?? "chess";
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 50);
  const rows = await leaderboard(game, Number.isFinite(limit) ? limit : 50);
  return NextResponse.json({
    game_type: game,
    entries: rows.map((row, index) => ({
      rank: index + 1,
      player: row.player,
      rating: row.rating,
      games: row.games,
      wins: row.wins,
      draws: row.draws,
      losses: row.losses,
    })),
  });
});

