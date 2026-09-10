import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError, handle } from "@/lib/server/errors";
import { createGameRoom } from "@/lib/server/rooms";
import { requirePlayer } from "@/lib/server/session";

const CreateRoomInput = z.object({
  game_type: z.enum([
    "chess",
    "xiangqi",
    "caro",
    "jungle",
    "oanquan",
    "reversi",
    "connect4",
    "draughts",
    "dots",
    "uno",
    "tienlen",
    "ngua",
    "xidach",
    "baicao",
  ]),
  time_control: z.string().optional(),
  max_players: z.number().int().min(2).max(4).optional(),
  title: z.string().trim().max(48).optional(),
  is_public: z.boolean().optional(),
});

export const POST = handle(async (request: NextRequest) => {
  const player = await requirePlayer(request);
  const parsed = CreateRoomInput.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) {
    throw new ApiError(422, "VALIDATION", "Dữ liệu phòng không hợp lệ");
  }
  return NextResponse.json(
    await createGameRoom(player, {
      gameType: parsed.data.game_type,
      maxPlayers:
        ["uno", "xidach", "baicao"].includes(parsed.data.game_type)
          ? (parsed.data.max_players ?? 4)
          : ["tienlen", "ngua"].includes(parsed.data.game_type)
            ? 4
            : 2,
      timeControl: parsed.data.time_control,
      title: parsed.data.title,
      isPublic: parsed.data.is_public,
    }),
  );
});
