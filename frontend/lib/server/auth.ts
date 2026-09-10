import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";

import { accounts, db, players, type AccountRow, type PlayerRow } from "./db";
import { ApiError } from "./errors";
import { playerFromRequest } from "./session";
import type { NextRequest } from "next/server";

const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;

function normalizeLogin(value: string): string {
  return value.trim().toLowerCase();
}

export function validateLogin(value: string): string {
  const login = normalizeLogin(value);
  if (!/^[a-z0-9_]{3,24}$/.test(login)) {
    throw new ApiError(
      422,
      "INVALID_LOGIN",
      "Tên tài khoản cần 3-24 ký tự thường, số hoặc gạch dưới",
    );
  }
  return login;
}

export function validatePassword(value: string): string {
  if (value.length < 8 || value.length > 72) {
    throw new ApiError(422, "INVALID_PASSWORD", "Mật khẩu cần từ 8 đến 72 ký tự");
  }
  return value;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
    maxmem: 32 * 1024 * 1024,
  });
  return [
    "scrypt",
    String(SCRYPT_COST),
    String(SCRYPT_BLOCK_SIZE),
    String(SCRYPT_PARALLELIZATION),
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join("$");
}

export function verifyPassword(password: string, encoded: string): boolean {
  const [algorithm, costRaw, blockRaw, parallelRaw, saltRaw, hashRaw] =
    encoded.split("$");
  if (algorithm !== "scrypt" || !saltRaw || !hashRaw) return false;
  const cost = Number(costRaw);
  const block = Number(blockRaw);
  const parallel = Number(parallelRaw);
  if (
    !Number.isInteger(cost) ||
    !Number.isInteger(block) ||
    !Number.isInteger(parallel) ||
    cost < 1_024 ||
    block < 1 ||
    parallel < 1
  ) {
    return false;
  }
  try {
    const expected = Buffer.from(hashRaw, "base64url");
    const actual = scryptSync(
      password,
      Buffer.from(saltRaw, "base64url"),
      expected.length,
      { N: cost, r: block, p: parallel, maxmem: 32 * 1024 * 1024 },
    );
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export async function accountForPlayer(
  playerId: string,
): Promise<AccountRow | null> {
  const rows = await db
    .select()
    .from(accounts)
    .where(eq(accounts.playerId, playerId))
    .limit(1);
  return rows[0] ?? null;
}

export async function registerAccount(
  request: NextRequest,
  input: { login: string; password: string; displayName?: string },
): Promise<{ player: PlayerRow; account: AccountRow }> {
  const login = validateLogin(input.login);
  const password = validatePassword(input.password);
  const current = await playerFromRequest(request);
  const now = Date.now();
  const displayName =
    input.displayName?.trim() || current?.username || login;
  if (displayName.length < 2 || displayName.length > 24) {
    throw new ApiError(422, "INVALID_DISPLAY_NAME", "Tên hiển thị cần từ 2 đến 24 ký tự");
  }

  try {
    return await db.transaction(async (tx) => {
      let player = current;
      if (!player) {
        const inserted = await tx
          .insert(players)
          .values({
            id: crypto.randomUUID(),
            username: displayName,
            createdAt: now,
            lastSeen: now,
          })
          .returning();
        player = inserted[0];
      } else {
        const linked = await tx
          .select({ id: accounts.id })
          .from(accounts)
          .where(eq(accounts.playerId, player.id))
          .limit(1);
        if (linked.length > 0) {
          throw new ApiError(409, "ACCOUNT_EXISTS", "Guest này đã có tài khoản");
        }
        const updated = await tx
          .update(players)
          .set({ username: displayName, lastSeen: now })
          .where(eq(players.id, player.id))
          .returning();
        player = updated[0];
      }
      const insertedAccount = await tx
        .insert(accounts)
        .values({
          id: crypto.randomUUID(),
          playerId: player.id,
          login,
          passwordHash: hashPassword(password),
          createdAt: now,
          lastLoginAt: now,
        })
        .returning();
      return { player, account: insertedAccount[0] };
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (isUniqueViolation(error)) {
      throw new ApiError(409, "LOGIN_TAKEN", "Tên tài khoản đã được sử dụng");
    }
    throw error;
  }
}

export async function loginAccount(
  loginRaw: string,
  password: string,
): Promise<{ player: PlayerRow; account: AccountRow }> {
  const login = validateLogin(loginRaw);
  validatePassword(password);
  const rows = await db
    .select()
    .from(accounts)
    .where(eq(accounts.login, login))
    .limit(1);
  const account = rows[0];
  if (!account || !verifyPassword(password, account.passwordHash)) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Tài khoản hoặc mật khẩu không đúng");
  }
  const now = Date.now();
  const [playerRows] = await Promise.all([
    db
      .update(players)
      .set({ lastSeen: now })
      .where(eq(players.id, account.playerId))
      .returning(),
    db
      .update(accounts)
      .set({ lastLoginAt: now })
      .where(eq(accounts.id, account.id)),
  ]);
  if (!playerRows[0]) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Tài khoản không còn tồn tại");
  }
  return { player: playerRows[0], account: { ...account, lastLoginAt: now } };
}

export function publicAccount(account: AccountRow | null) {
  return account
    ? { login: account.login, created_at: new Date(account.createdAt).toISOString() }
    : null;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

