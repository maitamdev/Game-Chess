import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  createAccessToken,
  createRefreshToken,
  hashPassword,
} from "@/lib/server/auth";
import { db, users } from "@/lib/server/db";
import { userPublicDto } from "@/lib/server/dto";
import { ApiError, handle } from "@/lib/server/errors";

const RegisterIn = z.object({
  username: z
    .string()
    .regex(
      /^[a-zA-Z0-9_]{3,20}$/,
      "Tên đăng nhập 3–20 ký tự, chỉ gồm chữ cái, số và dấu gạch dưới",
    ),
  email: z.email("Email không hợp lệ").transform((v) => v.toLowerCase()),
  password: z
    .string()
    .min(8, "Mật khẩu tối thiểu 8 ký tự")
    .refine((v) => new TextEncoder().encode(v).length <= 72, {
      message: "Mật khẩu tối đa 72 byte",
    }),
});

export const POST = handle(async (req: NextRequest) => {
  const parsed = RegisterIn.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    throw new ApiError(
      422,
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
    );
  }
  const body = parsed.data;

  const byName = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, body.username))
    .limit(1);
  if (byName.length > 0) {
    throw new ApiError(409, "USERNAME_TAKEN", "Tên đăng nhập đã được sử dụng");
  }
  const byEmail = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, body.email))
    .limit(1);
  if (byEmail.length > 0) {
    throw new ApiError(409, "EMAIL_TAKEN", "Email đã được sử dụng");
  }

  const id = crypto.randomUUID();
  try {
    await db.insert(users).values({
      id,
      username: body.username,
      email: body.email,
      passwordHash: await hashPassword(body.password),
      createdAt: Date.now(),
    });
  } catch {
    // race hai request đăng ký cùng lúc vượt qua bước kiểm tra SELECT
    throw new ApiError(
      409,
      "USERNAME_TAKEN",
      "Tên đăng nhập hoặc email đã được sử dụng",
    );
  }

  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  const user = rows[0];
  return NextResponse.json({
    access_token: await createAccessToken(user.id),
    refresh_token: await createRefreshToken(user.id),
    user: userPublicDto(user),
  });
});
