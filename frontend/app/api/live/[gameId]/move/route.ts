import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/server/auth";
import { ApiError, handle } from "@/lib/server/errors";
import { playMove } from "@/lib/server/live";

const MoveIn = z.object({ uci: z.string().min(2).max(10), ply: z.number().int() });

export const POST = handle(
  async (req: NextRequest, ctx: { params: Promise<{ gameId: string }> }) => {
    const user = await requireUser(req);
    const { gameId } = await ctx.params;
    const parsed = MoveIn.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      throw new ApiError(422, "VALIDATION", "Dữ liệu không hợp lệ");
    }
    return NextResponse.json(
      await playMove(gameId, user, parsed.data.uci, parsed.data.ply),
    );
  },
);
