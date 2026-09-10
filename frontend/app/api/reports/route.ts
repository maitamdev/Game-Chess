import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createPlayerReport } from "@/lib/server/competition";
import { ApiError, handle } from "@/lib/server/errors";
import { requirePlayer } from "@/lib/server/session";

const ReportInput = z.object({
  reported_id: z.string().uuid(),
  reason: z.string().trim().min(2).max(48),
  details: z.string().trim().max(1000).optional(),
  game_id: z.string().uuid().optional(),
  room_id: z.string().uuid().optional(),
});

export const POST = handle(async (request: NextRequest) => {
  const player = await requirePlayer(request);
  const parsed = ReportInput.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) throw new ApiError(422, "VALIDATION", "Nội dung báo cáo không hợp lệ");
  return NextResponse.json(await createPlayerReport(player, {
    reportedId: parsed.data.reported_id,
    reason: parsed.data.reason,
    details: parsed.data.details,
    gameId: parsed.data.game_id,
    roomId: parsed.data.room_id,
  }));
});
