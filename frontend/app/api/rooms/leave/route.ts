import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError, handle } from "@/lib/server/errors";
import { leaveRoom } from "@/lib/server/rooms";
import { requirePlayer } from "@/lib/server/session";

const LeaveRoomIn = z.object({ code: z.string() });

export const POST = handle(async (req: NextRequest) => {
  const user = await requirePlayer(req);
  const parsed = LeaveRoomIn.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    throw new ApiError(422, "VALIDATION", "Dữ liệu không hợp lệ");
  }
  await leaveRoom(user, parsed.data.code);
  return NextResponse.json({ status: "left" });
});
