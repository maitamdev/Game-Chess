import { NextResponse, type NextRequest } from "next/server";

import { handle } from "@/lib/server/errors";
import { leaveQueue } from "@/lib/server/queue";
import { requirePlayer } from "@/lib/server/session";

export const POST = handle(async (request: NextRequest) => {
  await leaveQueue(await requirePlayer(request));
  return NextResponse.json({ ok: true });
});

