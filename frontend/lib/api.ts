"use client";

import { useAuthStore } from "@/stores/authStore";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ??
  API_URL.replace(/^http/, "ws").replace(/\/$/, "") + "/ws";

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
  auth?: boolean;
}

async function rawFetch(path: string, opts: FetchOptions): Promise<Response> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.auth) {
    const token = useAuthStore.getState().accessToken;
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(`${API_URL}${path}`, {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

/** Làm mới access token bằng refresh token; trả về token mới hoặc null. */
export async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) {
      useAuthStore.getState().logout();
      return null;
    }
    const data = (await res.json()) as { access_token: string };
    useAuthStore.getState().setAuth(data);
    return data.access_token;
  } catch {
    return null;
  }
}

export async function api<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  let res = await rawFetch(path, opts);
  // access token hết hạn (15 phút) → thử refresh một lần rồi gọi lại
  if (res.status === 401 && opts.auth) {
    const newToken = await refreshAccessToken();
    if (newToken) res = await rawFetch(path, opts);
  }
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
  elo: number;
}

export type Variant = "chess" | "xiangqi" | "caro" | "jungle";

export interface GameSummary {
  id: string;
  white: PlayerBrief;
  black: PlayerBrief;
  variant: Variant;
  time_control: string;
  result: string | null;
  termination: string | null;
  white_elo_before: number | null;
  black_elo_before: number | null;
  elo_change: number | null;
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

export interface PublicUser {
  id: string;
  username: string;
  elo: number;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  xq_elo: number;
  xq_games_played: number;
  xq_wins: number;
  xq_losses: number;
  xq_draws: number;
  caro_elo: number;
  caro_games_played: number;
  caro_wins: number;
  caro_losses: number;
  caro_draws: number;
  jg_elo: number;
  jg_games_played: number;
  jg_wins: number;
  jg_losses: number;
  jg_draws: number;
  created_at: string;
}

export interface RatingPoint {
  elo: number;
  variant: Variant;
  game_id: string | null;
  created_at: string;
}
