import { NextResponse, type NextRequest } from "next/server";
import { requirePlayer } from "@/lib/server/session";
import { getCardRoom } from "@/lib/server/cardRooms";
import { handle } from "@/lib/server/errors";

export const GET = handle(async (request: NextRequest) => {
  const user = await requirePlayer(request);
  const code = request.nextUrl.searchParams.get("code") ?? "";
  return NextResponse.json(await getCardRoom(user, code));
});
