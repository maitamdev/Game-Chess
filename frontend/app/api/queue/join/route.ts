import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { enqueuePlayer } from "@/lib/server/queue";
import { ApiError, handle } from "@/lib/server/errors";
import { requirePlayer } from "@/lib/server/session";

const Input = z.object({
  game_type: z.string(),
  time_control: z.string().default("10+0"),
});

export const POST = handle(async (request: NextRequest) => {
  const player = await requirePlayer(request);
  const parsed = Input.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) throw new ApiError(422, "VALIDATION", "Dữ liệu hàng chờ không hợp lệ");
  return NextResponse.json(
    await enqueuePlayer(player, parsed.data.game_type, parsed.data.time_control),
  );
});

