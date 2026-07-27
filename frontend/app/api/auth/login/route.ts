import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  createAccessToken,
  createRefreshToken,
  verifyPassword,
} from "@/lib/server/auth";
import { db, users } from "@/lib/server/db";
import { userPublicDto } from "@/lib/server/dto";
import { ApiError, handle } from "@/lib/server/errors";

const LoginIn = z.object({ username: z.string(), password: z.string() });

export const POST = handle(async (req: NextRequest) => {
  const parsed = LoginIn.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    throw new ApiError(422, "VALIDATION", "Dữ liệu không hợp lệ");
  }
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.username, parsed.data.username))
    .limit(1);
  const user = rows[0];
  if (
    user === undefined ||
    !(await verifyPassword(parsed.data.password, user.passwordHash))
  ) {
    throw new ApiError(
      401,
      "INVALID_CREDENTIALS",
      "Tên đăng nhập hoặc mật khẩu không đúng",
    );
  }
  return NextResponse.json({
    access_token: await createAccessToken(user.id),
    refresh_token: await createRefreshToken(user.id),
    user: userPublicDto(user),
  });
});
