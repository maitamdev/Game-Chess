import { NextResponse, type NextRequest } from "next/server";

import { playerFromRequest } from "@/lib/server/session";
import { handle } from "@/lib/server/errors";
import { getLiveState } from "@/lib/server/live";

// State phụ thuộc cookie người xem và thay đổi sau từng nước đi/heartbeat.
// Luôn chạy động, không để Next hoặc Vercel CDN giữ snapshot của người khác.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = handle(
  async (req: NextRequest, ctx: { params: Promise<{ gameId: string }> }) => {
    const user = await playerFromRequest(req);
    const { gameId } = await ctx.params;
    return NextResponse.json(await getLiveState(gameId, user?.id ?? null), {
      headers: {
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      },
    });
  },
);
