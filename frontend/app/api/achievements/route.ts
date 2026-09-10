import { NextResponse, type NextRequest } from "next/server";

import { getPlayerAchievements, syncPlayerAchievements } from "@/lib/server/competition";
import { handle } from "@/lib/server/errors";
import { requirePlayer } from "@/lib/server/session";

export const GET = handle(async (request: NextRequest) => {
  const player = await requirePlayer(request);
  await syncPlayerAchievements(player.id);
  return NextResponse.json({ achievements: await getPlayerAchievements(player.id) });
});
