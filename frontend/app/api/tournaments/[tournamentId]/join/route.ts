import { NextResponse, type NextRequest } from "next/server";

import { registerForTournament } from "@/lib/server/competition";
import { handle } from "@/lib/server/errors";
import { requirePlayer } from "@/lib/server/session";

export const POST = handle(async (request: NextRequest, context: { params: Promise<{ tournamentId: string }> }) => {
  const player = await requirePlayer(request);
  const { tournamentId } = await context.params;
  return NextResponse.json(await registerForTournament(player, tournamentId));
});
