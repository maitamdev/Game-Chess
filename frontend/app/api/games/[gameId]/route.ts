import { asc, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { db, games, moves, users } from "@/lib/server/db";
import { gameDetailDto } from "@/lib/server/dto";
import { ApiError, handle } from "@/lib/server/errors";

export const GET = handle(
  async (_req: NextRequest, ctx: { params: Promise<{ gameId: string }> }) => {
    const { gameId } = await ctx.params;
    const gameRows = await db
      .select()
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1);
    const game = gameRows[0];
    if (game === undefined) {
      throw new ApiError(404, "GAME_NOT_FOUND", "Không tìm thấy ván đấu");
    }
    const [moveRows, whiteRows, blackRows] = await Promise.all([
      db
        .select()
        .from(moves)
        .where(eq(moves.gameId, game.id))
        .orderBy(asc(moves.ply)),
      db.select().from(users).where(eq(users.id, game.whiteId)).limit(1),
      db.select().from(users).where(eq(users.id, game.blackId)).limit(1),
    ]);
    return NextResponse.json(
      gameDetailDto(game, whiteRows[0], blackRows[0], moveRows),
    );
  },
);
