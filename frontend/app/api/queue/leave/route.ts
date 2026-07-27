import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/server/auth";
import { handle } from "@/lib/server/errors";
import { leaveQueue } from "@/lib/server/live";

export const POST = handle(async (req: NextRequest) => {
  const user = await requireUser(req);
  await leaveQueue(user);
  return NextResponse.json({ status: "left" });
});
