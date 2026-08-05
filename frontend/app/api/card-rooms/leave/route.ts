import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requirePlayer } from "@/lib/server/session";
import { leaveCardRoom } from "@/lib/server/cardRooms";
import { ApiError, handle } from "@/lib/server/errors";

const Input = z.object({ code: z.string().length(6) });

export const POST = handle(async (request: NextRequest) => {
  const user = await requirePlayer(request);
  const parsed = Input.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) throw new ApiError(422, "VALIDATION", "Mã phòng không hợp lệ");
  await leaveCardRoom(user, parsed.data.code);
  return NextResponse.json({ ok: true });
});
