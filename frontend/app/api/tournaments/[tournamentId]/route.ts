import { NextResponse, type NextRequest } from "next/server";

import { tournamentDetail } from "@/lib/server/competition";
import { handle } from "@/lib/server/errors";
import { playerFromRequest } from "@/lib/server/session";

export const GET = handle(async (request: NextRequest, context: { params: Promise<{ tournamentId: string }> }) => {
  const { tournamentId } = await context.params;
  const player = await playerFromRequest(request);
  return NextResponse.json(await tournamentDetail(tournamentId, player?.id ?? null));
});
