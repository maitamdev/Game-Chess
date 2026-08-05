import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { db, players, type PlayerRow } from "./db";
import { ApiError } from "./errors";

export const GUEST_COOKIE = "kd_guest";
export const GUEST_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

function sessionSecret(): string {
  const value = process.env.GUEST_SESSION_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("GUEST_SESSION_SECRET chưa được cấu hình");
  }
  return "kydai-local-guest-session-secret";
}

function signature(playerId: string): string {
  return createHmac("sha256", sessionSecret())
    .update(playerId)
    .digest("base64url");
}

export function createGuestCookie(playerId: string): string {
  return `${playerId}.${signature(playerId)}`;
}

function playerIdFromCookie(value: string | undefined): string | null {
  if (!value) return null;
  const separator = value.lastIndexOf(".");
  if (separator < 1) return null;
  const playerId = value.slice(0, separator);
  const supplied = Buffer.from(value.slice(separator + 1));
  const expected = Buffer.from(signature(playerId));
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    return null;
  }
  return /^[0-9a-f-]{36}$/i.test(playerId) ? playerId : null;
}

export async function playerFromRequest(
  request: NextRequest,
): Promise<PlayerRow | null> {
  const playerId = playerIdFromCookie(
    request.cookies.get(GUEST_COOKIE)?.value,
  );
  if (!playerId) return null;
  const rows = await db
    .select()
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);
  return rows[0] ?? null;
}

export async function requirePlayer(
  request: NextRequest,
): Promise<PlayerRow> {
  const player = await playerFromRequest(request);
  if (!player) {
    throw new ApiError(
      401,
      "GUEST_SESSION_REQUIRED",
      "Hãy nhập tên hiển thị trước khi vào phòng",
    );
  }
  return player;
}

export async function createOrUpdateGuest(
  request: NextRequest,
  displayName: string,
): Promise<{ player: PlayerRow; isNew: boolean }> {
  const current = await playerFromRequest(request);
  const now = Date.now();
  if (current) {
    const rows = await db
      .update(players)
      .set({ username: displayName, lastSeen: now })
      .where(eq(players.id, current.id))
      .returning();
    return { player: rows[0], isNew: false };
  }

  const rows = await db
    .insert(players)
    .values({
      id: crypto.randomUUID(),
      username: displayName,
      createdAt: now,
      lastSeen: now,
    })
    .returning();
  return { player: rows[0], isNew: true };
}

export function publicGuest(player: PlayerRow) {
  return {
    id: player.id,
    display_name: player.username,
  };
}
