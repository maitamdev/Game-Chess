/**
 * JWT HS256 (jose) + bcrypt (bcryptjs) — cùng cấu trúc claims với backend
 * Python cũ ({sub, type, iat, exp}) nên token cũ vẫn dùng được nếu giữ
 * nguyên JWT_SECRET.
 */

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { db, users, type UserRow } from "./db";
import { ApiError } from "./errors";

// Production BẮT BUỘC đặt JWT_SECRET — fallback dev trên server công khai
// đồng nghĩa ai cũng tự ký được token của mọi tài khoản. Kiểm tra lười tại
// lần dùng đầu (không phải lúc import) để `next build` local không cần env.
let cachedSecret: Uint8Array | null = null;
function SECRET(): Uint8Array {
  if (cachedSecret !== null) return cachedSecret;
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET chưa được đặt — bắt buộc cấu hình biến môi trường này khi deploy",
    );
  }
  cachedSecret = new TextEncoder().encode(
    process.env.JWT_SECRET ?? "dev-secret-doi-khi-trien-khai",
  );
  return cachedSecret;
}
const ACCESS_MINUTES = Number(process.env.ACCESS_TOKEN_MINUTES ?? 15);
const REFRESH_DAYS = Number(process.env.REFRESH_TOKEN_DAYS ?? 7);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, passwordHash);
  } catch {
    return false;
  }
}

async function createToken(
  userId: string,
  type: "access" | "refresh",
  lifetimeSeconds: number,
): Promise<string> {
  return new SignJWT({ type })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + lifetimeSeconds)
    .sign(SECRET());
}

export function createAccessToken(userId: string): Promise<string> {
  return createToken(userId, "access", ACCESS_MINUTES * 60);
}

export function createRefreshToken(userId: string): Promise<string> {
  return createToken(userId, "refresh", REFRESH_DAYS * 24 * 3600);
}

/** user_id nếu token hợp lệ và đúng loại, ngược lại null. */
export async function decodeToken(
  token: string,
  expectedType: "access" | "refresh",
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET(), {
      algorithms: ["HS256"],
    });
    if (payload.type !== expectedType || typeof payload.sub !== "string") {
      return null;
    }
    return payload.sub;
  } catch {
    return null;
  }
}

export async function userFromRequest(
  req: NextRequest,
): Promise<UserRow | null> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const userId = await decodeToken(header.slice(7), "access");
  if (userId === null) return null;
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return rows[0] ?? null;
}

/** Như userFromRequest nhưng 401 nếu thiếu/sai token. */
export async function requireUser(req: NextRequest): Promise<UserRow> {
  const user = await userFromRequest(req);
  if (user === null) {
    throw new ApiError(401, "UNAUTHORIZED", "Cần đăng nhập");
  }
  return user;
}
