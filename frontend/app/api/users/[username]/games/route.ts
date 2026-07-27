import { desc, eq, inArray, or, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { db, games, users } from "@/lib/server/db";
import { gameSummaryDto } from "@/lib/server/dto";
import { ApiError, handle } from "@/lib/server/errors";

export const GET = handle(
  async (req: NextRequest, ctx: { params: Promise<{ username: string }> }) => {
    const { username } = await ctx.params;
    const userRows = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    if (userRows.length === 0) {
      throw new ApiError(404, "USER_NOT_FOUND", "Không tìm thấy người chơi");
    }
    const user = userRows[0];

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("limit") ?? 20) || 20),
    );

    const condition = or(eq(games.whiteId, user.id), eq(games.blackId, user.id));
    const [countRow] = await db
      .select({ total: sql<number>`count(*)` })
      .from(games)
      .where(condition);
    const rows = await db
      .select()
      .from(games)
      .where(condition)
      .orderBy(desc(games.startedAt))
      .offset((page - 1) * limit)
      .limit(limit);

    const ids = [...new Set(rows.flatMap((g) => [g.whiteId, g.blackId]))];
    const players =
      ids.length > 0
        ? await db.select().from(users).where(inArray(users.id, ids))
        : [];
    const byId = new Map(players.map((p) => [p.id, p]));

    return NextResponse.json({
      items: rows.map((g) =>
        gameSummaryDto(g, byId.get(g.whiteId)!, byId.get(g.blackId)!),
      ),
      page,
      limit,
      total: countRow?.total ?? 0,
    });
  },
);
