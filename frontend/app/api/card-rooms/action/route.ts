import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requirePlayer } from "@/lib/server/session";
import { actInCardRoom } from "@/lib/server/cardRooms";
import { ApiError, handle } from "@/lib/server/errors";

const Input = z.object({
  code: z.string().length(6),
  action: z.discriminatedUnion("type", [
    z.object({ type: z.literal("draw") }),
    z.object({
      type: z.literal("play"),
      cardId: z.number().int(),
      color: z.enum(["red", "yellow", "green", "blue"]).optional(),
    }),
    z.object({
      type: z.literal("play_cards"),
      cardIds: z.array(z.string().min(1).max(32)).min(1).max(13),
    }),
    z.object({ type: z.literal("pass") }),
    z.object({ type: z.literal("roll") }),
    z.object({
      type: z.literal("move_piece"),
      pieceId: z.string().min(1).max(32),
    }),
    z.object({ type: z.literal("hit") }),
    z.object({ type: z.literal("stand") }),
    z.object({ type: z.literal("reveal") }),
  ]),
});

export const POST = handle(async (request: NextRequest) => {
  const user = await requirePlayer(request);
  const parsed = Input.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) throw new ApiError(422, "VALIDATION", "Nước đi không hợp lệ");
  return NextResponse.json(
    await actInCardRoom(user, parsed.data.code, parsed.data.action),
  );
});
