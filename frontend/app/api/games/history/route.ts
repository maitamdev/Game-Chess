import { NextResponse, type NextRequest } from "next/server";

import { handle } from "@/lib/server/errors";
import { recentBoardGames } from "@/lib/server/ratings";
import { requirePlayer } from "@/lib/server/session";

export const GET = handle(async (request: NextRequest) => {
  const player = await requirePlayer(request);
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 20);
  return NextResponse.json({
    games: await recentBoardGames(player.id, Number.isFinite(limit) ? limit : 20),
  });
});

