import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { db, users } from "@/lib/server/db";
import { userPublicDto } from "@/lib/server/dto";
import { ApiError, handle } from "@/lib/server/errors";

export const GET = handle(
  async (
    _req: NextRequest,
    ctx: { params: Promise<{ username: string }> },
  ) => {
    const { username } = await ctx.params;
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    if (rows.length === 0) {
      throw new ApiError(404, "USER_NOT_FOUND", "Không tìm thấy người chơi");
    }
    return NextResponse.json(userPublicDto(rows[0]));
  },
);
