import { NextResponse, type NextRequest } from "next/server";

import { accountForPlayer, publicAccount } from "@/lib/server/auth";
import { handle } from "@/lib/server/errors";
import { recentBoardGames, playerRatings } from "@/lib/server/ratings";
import { publicGuest, requirePlayer } from "@/lib/server/session";
import { getPlayerAchievements, syncPlayerAchievements } from "@/lib/server/competition";

export const GET = handle(async (request: NextRequest) => {
  const player = await requirePlayer(request);
  await syncPlayerAchievements(player.id);
  const [account, ratings, recentGames, achievements] = await Promise.all([
    accountForPlayer(player.id),
    playerRatings(player.id),
    recentBoardGames(player.id),
    getPlayerAchievements(player.id),
  ]);
  return NextResponse.json({
    player: publicGuest(player),
    account: publicAccount(account),
    ratings: ratings.map((rating) => ({
      game_type: rating.gameType,
      rating: rating.rating,
      games: rating.games,
      wins: rating.wins,
      draws: rating.draws,
      losses: rating.losses,
      updated_at: new Date(rating.updatedAt).toISOString(),
    })),
    recent_games: recentGames,
    achievements,
  });
});
