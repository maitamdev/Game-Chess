import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/server/auth";
import { ApiError, handle } from "@/lib/server/errors";
import { drawAction } from "@/lib/server/live";

const DrawIn = z.object({ action: z.enum(["offer", "accept", "decline"]) });

export const POST = handle(
  async (req: NextRequest, ctx: { params: Promise<{ gameId: string }> }) => {
    const user = await requireUser(req);
    const { gameId } = await ctx.params;
    const parsed = DrawIn.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      throw new ApiError(422, "VALIDATION", "Dữ liệu không hợp lệ");
    }
    return NextResponse.json(await drawAction(gameId, user, parsed.data.action));
  },
);
