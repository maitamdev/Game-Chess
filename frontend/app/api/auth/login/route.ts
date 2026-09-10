import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { loginAccount, publicAccount } from "@/lib/server/auth";
import { ApiError, handle } from "@/lib/server/errors";
import {
  createGuestCookie,
  GUEST_COOKIE,
  GUEST_COOKIE_MAX_AGE,
  publicGuest,
} from "@/lib/server/session";

const Input = z.object({ login: z.string(), password: z.string() });

export const POST = handle(async (request: NextRequest) => {
  const parsed = Input.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    throw new ApiError(422, "VALIDATION", "Thông tin đăng nhập không hợp lệ");
  }
  const { player, account } = await loginAccount(
    parsed.data.login,
    parsed.data.password,
  );
  const response = NextResponse.json({
    player: publicGuest(player),
    account: publicAccount(account),
  });
  response.cookies.set(GUEST_COOKIE, createGuestCookie(player.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_COOKIE_MAX_AGE,
  });
  return response;
});

