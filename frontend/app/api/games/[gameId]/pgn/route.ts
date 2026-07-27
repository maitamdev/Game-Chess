import { eq } from "drizzle-orm";
import { type NextRequest } from "next/server";

import { db, games, users } from "@/lib/server/db";
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
    if (!game.pgn) {
      throw new ApiError(404, "PGN_NOT_READY", "Ván chưa kết thúc, chưa có PGN");
    }
    const [white] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, game.whiteId))
      .limit(1);
    const [black] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, game.blackId))
      .limit(1);
    const filename = `kydai-${white.username}-vs-${black.username}.pgn`;
    return new Response(game.pgn, {
      headers: {
        "Content-Type": "application/x-chess-pgn",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  },
);
