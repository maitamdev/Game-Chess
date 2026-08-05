import { NextResponse, type NextRequest } from "next/server";

import { handle } from "@/lib/server/errors";
import { getRoomStatus } from "@/lib/server/rooms";
import { requirePlayer } from "@/lib/server/session";

export const GET = handle(async (req: NextRequest) => {
  const user = await requirePlayer(req);
  const code = req.nextUrl.searchParams.get("code") ?? "";
  return NextResponse.json(await getRoomStatus(user, code));
});
