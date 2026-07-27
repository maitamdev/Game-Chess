import { and, asc, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { db, ratingHistory, users } from "@/lib/server/db";
import { ApiError, handle } from "@/lib/server/errors";
import { isVariant } from "@/lib/server/variants";

export const GET = handle(
  async (req: NextRequest, ctx: { params: Promise<{ username: string }> }) => {
    const { username } = await ctx.params;
    const userRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    if (userRows.length === 0) {
      throw new ApiError(404, "USER_NOT_FOUND", "Không tìm thấy người chơi");
    }

    const variant = new URL(req.url).searchParams.get("variant") ?? "chess";
    if (!isVariant(variant)) {
      throw new ApiError(422, "VALIDATION", "Loại cờ không hợp lệ");
    }

    const rows = await db
      .select()
      .from(ratingHistory)
      .where(
        and(
          eq(ratingHistory.userId, userRows[0].id),
          eq(ratingHistory.variant, variant),
        ),
      )
      .orderBy(asc(ratingHistory.createdAt));

    return NextResponse.json(
      rows.map((r) => ({
        elo: r.elo,
        variant: r.variant,
        game_id: r.gameId,
        created_at: new Date(r.createdAt).toISOString(),
      })),
    );
  },
);
