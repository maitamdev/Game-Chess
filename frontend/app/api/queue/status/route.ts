import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/server/auth";
import { handle } from "@/lib/server/errors";
import { queueStatus } from "@/lib/server/live";

export const GET = handle(async (req: NextRequest) => {
  const user = await requireUser(req);
  return NextResponse.json(await queueStatus(user));
});
