import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { registerAccount, publicAccount } from "@/lib/server/auth";
import { ApiError, handle } from "@/lib/server/errors";
import {
  createGuestCookie,
  GUEST_COOKIE,
  GUEST_COOKIE_MAX_AGE,
  publicGuest,
} from "@/lib/server/session";

const Input = z.object({
  login: z.string(),
  password: z.string(),
  display_name: z.string().trim().min(2).max(24).optional(),
});

export const POST = handle(async (request: NextRequest) => {
  const parsed = Input.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    throw new ApiError(422, "VALIDATION", "Thông tin đăng ký không hợp lệ");
  }
  const { player, account } = await registerAccount(request, {
    login: parsed.data.login,
    password: parsed.data.password,
    displayName: parsed.data.display_name,
  });
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

