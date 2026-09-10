import { NextResponse } from "next/server";

import { GUEST_COOKIE } from "@/lib/server/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(GUEST_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

