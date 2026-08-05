import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  createGuestCookie,
  createOrUpdateGuest,
  GUEST_COOKIE,
  GUEST_COOKIE_MAX_AGE,
  playerFromRequest,
  publicGuest,
} from "@/lib/server/session";
import { ApiError, handle } from "@/lib/server/errors";

const SessionInput = z.object({
  display_name: z
    .string()
    .trim()
    .min(2, "Tên phải có ít nhất 2 ký tự")
    .max(24, "Tên tối đa 24 ký tự")
    .regex(
      /^[\p{L}\p{N} _.-]+$/u,
      "Tên chỉ được chứa chữ, số, dấu cách, gạch ngang hoặc dấu chấm",
    ),
});

export const GET = handle(async (request: NextRequest) => {
  const player = await playerFromRequest(request);
  if (!player) {
    throw new ApiError(401, "GUEST_SESSION_REQUIRED", "Chưa có phiên chơi");
  }
  return NextResponse.json({ player: publicGuest(player) });
});

export const POST = handle(async (request: NextRequest) => {
  const parsed = SessionInput.safeParse(await request.json());
  if (!parsed.success) {
    throw new ApiError(
      422,
      "INVALID_DISPLAY_NAME",
      parsed.error.issues[0]?.message ?? "Tên hiển thị không hợp lệ",
    );
  }

  const { player } = await createOrUpdateGuest(
    request,
    parsed.data.display_name,
  );
  const response = NextResponse.json({ player: publicGuest(player) });
  response.cookies.set(GUEST_COOKIE, createGuestCookie(player.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_COOKIE_MAX_AGE,
  });
  return response;
});
