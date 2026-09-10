import { NextResponse, type NextRequest } from "next/server";

import { listTournaments } from "@/lib/server/competition";
import { handle } from "@/lib/server/errors";

export const GET = handle(async (request: NextRequest) => {
  return NextResponse.json({
    tournaments: await listTournaments({
      gameType: request.nextUrl.searchParams.get("game"),
      status: request.nextUrl.searchParams.get("status"),
    }),
  });
});
