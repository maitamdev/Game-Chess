import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requirePlayer } from "@/lib/server/session";
import { createCardRoom } from "@/lib/server/cardRooms";
import { ApiError, handle } from "@/lib/server/errors";

const Input = z.object({
  max_players: z.number().int().min(2).max(4),
  title: z.string().trim().max(48).optional(),
  is_public: z.boolean().optional(),
});

export const POST = handle(async (request: NextRequest) => {
  const user = await requirePlayer(request);
  const parsed = Input.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) throw new ApiError(422, "VALIDATION", "Dữ liệu không hợp lệ");
  return NextResponse.json(
    await createCardRoom(user, parsed.data.max_players, {
      title: parsed.data.title,
      isPublic: parsed.data.is_public,
    }),
  );
});
