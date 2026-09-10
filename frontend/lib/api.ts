"use client";

// API chạy cùng origin (Next.js route handlers) - có thể trỏ đi nơi khác
// qua NEXT_PUBLIC_API_URL khi cần.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

interface FetchOptions {
  method?: string;
  body?: unknown;
}

async function rawFetch(path: string, opts: FetchOptions): Promise<Response> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  return fetch(`${API_URL}${path}`, {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    headers,
    credentials: "same-origin",
    // Các endpoint cùng origin đều là dữ liệu động (phiên, phòng, nước đi).
    // Không cho browser tái sử dụng snapshot GET cũ giữa các nhịp đồng bộ.
    cache: "no-store",
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

export async function api<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const res = await rawFetch(path, opts);
  if (!res.ok) {
    let code = "UNKNOWN";
    let message = `Lỗi ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) {
        code = data.error.code;
        message = data.error.message;
      }
    } catch {
      // giữ thông báo mặc định
    }
    throw new ApiError(code, message, res.status);
  }
  return (await res.json()) as T;
}

// ---------- kiểu dữ liệu từ backend ----------

export interface PlayerBrief {
  id: string;
  username: string;
}

export type Variant =
  | "chess"
  | "xiangqi"
  | "caro"
  | "jungle"
  | "oanquan"
  | "reversi"
  | "connect4"
  | "draughts"
  | "dots";

export interface GameSummary {
  id: string;
  white: PlayerBrief;
  black: PlayerBrief;
  variant: Variant;
  time_control: string;
  result: string | null;
  termination: string | null;
  started_at: string;
  ended_at: string | null;
}

export interface MoveRecord {
  ply: number;
  san: string;
  uci: string;
  fen_after: string;
  time_left_ms: number;
  evaluation: number | null;
}

export interface GameDetail extends GameSummary {
  pgn: string | null;
  final_fen: string | null;
  moves: MoveRecord[];
}
