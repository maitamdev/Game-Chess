/**
 * Lỗi API thống nhất - thân JSON {"error": {"code", "message"}} y hệt
 * backend FastAPI cũ để client (lib/api.ts) không phải đổi gì.
 */

import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function jsonError(
  status: number,
  code: string,
  message: string,
): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Bọc route handler: ApiError → JSON đúng mã, lỗi lạ → 500. */
export function handle<Args extends unknown[]>(
  fn: (...args: Args) => Promise<NextResponse | Response>,
): (...args: Args) => Promise<NextResponse | Response> {
  return async (...args: Args) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof ApiError) {
        return jsonError(err.status, err.code, err.message);
      }
      console.error("API error:", err);
      return jsonError(500, "INTERNAL", "Lỗi máy chủ");
    }
  };
}
