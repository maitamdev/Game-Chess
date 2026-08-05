import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError, handle } from "@/lib/server/errors";
import { joinGameRoom } from "@/lib/server/rooms";
import { requirePlayer } from "@/lib/server/session";

const JoinRoomInput = z.object({
  code: z.string().trim().length(6),
});

export const POST = handle(async (request: NextRequest) => {
  const player = await requirePlayer(request);
  const parsed = JoinRoomInput.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) {
    throw new ApiError(422, "VALIDATION", "Mã phòng không hợp lệ");
  }
  return NextResponse.json(
    await joinGameRoom(player, parsed.data.code),
  );
});
