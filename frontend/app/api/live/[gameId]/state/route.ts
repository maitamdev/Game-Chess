import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/server/auth";
import { handle } from "@/lib/server/errors";
import { getLiveState } from "@/lib/server/live";

export const GET = handle(
  async (req: NextRequest, ctx: { params: Promise<{ gameId: string }> }) => {
    const user = await requireUser(req);
    const { gameId } = await ctx.params;
    return NextResponse.json(await getLiveState(gameId, user.id));
  },
);
