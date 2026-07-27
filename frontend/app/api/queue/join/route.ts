import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/server/auth";
import { ApiError, handle } from "@/lib/server/errors";
import { joinQueue } from "@/lib/server/live";

const JoinIn = z.object({ variant: z.string(), time_control: z.string() });

export const POST = handle(async (req: NextRequest) => {
  const user = await requireUser(req);
  const parsed = JoinIn.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    throw new ApiError(422, "VALIDATION", "Dữ liệu không hợp lệ");
  }
  return NextResponse.json(
    await joinQueue(user, parsed.data.variant, parsed.data.time_control),
  );
});
