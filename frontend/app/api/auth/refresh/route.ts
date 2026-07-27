import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createAccessToken, decodeToken } from "@/lib/server/auth";
import { db, users } from "@/lib/server/db";
import { ApiError, handle } from "@/lib/server/errors";

const RefreshIn = z.object({ refresh_token: z.string() });

export const POST = handle(async (req: NextRequest) => {
  const parsed = RefreshIn.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    throw new ApiError(422, "VALIDATION", "Dữ liệu không hợp lệ");
  }
  const userId = await decodeToken(parsed.data.refresh_token, "refresh");
  if (userId === null) {
    throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Refresh token không hợp lệ");
  }
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (rows.length === 0) {
    throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Tài khoản không tồn tại");
  }
  return NextResponse.json({ access_token: await createAccessToken(userId) });
});
