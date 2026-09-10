import { NextResponse, type NextRequest } from "next/server";

import { handle } from "@/lib/server/errors";
import { queueStatus } from "@/lib/server/queue";
import { requirePlayer } from "@/lib/server/session";

export const GET = handle(async (request: NextRequest) => {
  return NextResponse.json({
    queue: await queueStatus(await requirePlayer(request)),
  });
});

