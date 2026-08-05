import { NextResponse, type NextRequest } from "next/server";

import { requirePlayer } from "@/lib/server/session";
import { handle } from "@/lib/server/errors";
import { getLiveState } from "@/lib/server/live";

export const GET = handle(
  async (req: NextRequest, ctx: { params: Promise<{ gameId: string }> }) => {
    const user = await requirePlayer(req);
    const { gameId } = await ctx.params;
    return NextResponse.json(await getLiveState(gameId, user.id));
  },
);
