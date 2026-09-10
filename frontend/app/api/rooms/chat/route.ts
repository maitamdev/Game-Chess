import { NextResponse, type NextRequest } from "next/server";

import { listRoomMessages, postRoomMessage } from "@/lib/server/chat";
import { handle } from "@/lib/server/errors";
import { requirePlayer } from "@/lib/server/session";

export const GET = handle(async (request: NextRequest) => {
  const player = await requirePlayer(request);
  const code = request.nextUrl.searchParams.get("code") ?? "";
  const after = request.nextUrl.searchParams.get("after");
  return NextResponse.json(await listRoomMessages(player, code, after));
});

export const POST = handle(async (request: NextRequest) => {
  const player = await requirePlayer(request);
  const body = (await request.json().catch(() => ({}))) as {
    code?: unknown;
    message?: unknown;
  };
  const code = typeof body.code === "string" ? body.code : "";
  const message = typeof body.message === "string" ? body.message : "";
  return NextResponse.json(await postRoomMessage(player, code, message));
});
