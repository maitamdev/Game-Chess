import { NextResponse, type NextRequest } from "next/server";

import { handle } from "@/lib/server/errors";
import { listPublicRooms } from "@/lib/server/rooms";

export const GET = handle(async (request: NextRequest) => {
  const gameType = request.nextUrl.searchParams.get("game");
  return NextResponse.json({ rooms: await listPublicRooms(gameType) });
});
