"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  api,
  type GameSummary,
  type PublicUser,
  type RatingPoint,
} from "@/lib/api";

function EloChart({ points }: { points: RatingPoint[] }) {
  if (points.length < 2) {
    return (
      <p className="rounded-[6px] border border-line bg-slate px-4 py-6 text-center text-xs text-muted">
        Chưa đủ dữ liệu để vẽ biểu đồ Elo.
      </p>
    );
  }
  const W = 560;
  const H = 120;
  const elos = points.map((p) => p.elo);
  const min = Math.min(...elos) - 20;
  const max = Math.max(...elos) + 20;
  const x = (i: number) => (i / (points.length - 1)) * (W - 16) + 8;
  const y = (elo: number) => H - 12 - ((elo - min) / (max - min)) * (H - 24);
  const path = points.map((p, i) => `${x(i)},${y(p.elo)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full rounded-[6px] border border-line bg-slate"
      role="img"
      aria-label="Biểu đồ Elo theo thời gian"
    >
      <polyline points={path} fill="none" stroke="var(--brass)" strokeWidth={1.5} />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.elo)} r={2} fill="var(--brass)" />
      ))}
      <text x={8} y={12} fontSize={11} fill="var(--muted)" fontFamily="var(--font-mono)">
        {max - 20}
      </text>
      <text x={8} y={H - 2} fontSize={11} fill="var(--muted)" fontFamily="var(--font-mono)">
        {min + 20}
      </text>
    </svg>
  );
}

function resultLabel(game: GameSummary, username: string): { text: string; tone: string } {
  if (!game.result) return { text: "Đang diễn ra", tone: "text-muted" };
  if (game.result === "draw") return { text: "Hoà", tone: "text-muted" };
  if (game.result === "aborted") return { text: "Huỷ", tone: "text-muted" };
  const isWhite = game.white.username === username;
  const won = (game.result === "white") === isWhite;
  return won
    ? { text: "Thắng", tone: "text-sage" }
    : { text: "Thua", tone: "text-rust" };
}

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = decodeURIComponent(params.username);
  const [chartVariant, setChartVariant] = useState<
    "chess" | "xiangqi" | "caro" | "jungle"
  >("chess");

  const { data: profile, isError } = useQuery({
    queryKey: ["user", username],
    queryFn: () => api<PublicUser>(`/api/users/${encodeURIComponent(username)}`),
  });
  const { data: history } = useQuery({
    queryKey: ["rating", username, chartVariant],
    queryFn: () =>
      api<RatingPoint[]>(
        `/api/users/${encodeURIComponent(username)}/rating-history?variant=${chartVariant}`,
      ),
    enabled: !!profile,
  });
  const { data: games } = useQuery({
    queryKey: ["games", username],
    queryFn: () =>
      api<{ items: GameSummary[] }>(
        `/api/users/${encodeURIComponent(username)}/games?page=1&limit=20`,
      ),
    enabled: !!profile,
  });

  if (isError) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 text-sm text-muted">
        Không tìm thấy người chơi «{username}».
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 text-sm text-muted">Đang tải…</div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold">
            {profile.username}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Tham gia{" "}
            {new Date(profile.created_at).toLocaleDateString("vi-VN", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-6 text-center">
          <div>
            <p className="font-[family-name:var(--font-mono)] text-xl text-brass">
              ♞ {profile.elo}
            </p>
            <p className="text-xs text-muted">
              Elo cờ vua ·{" "}
              <span className="text-sage">{profile.wins}</span>/
              <span className="text-rust">{profile.losses}</span>/{profile.draws}
            </p>
          </div>
          <div>
            <p className="font-[family-name:var(--font-mono)] text-xl text-brass">
              <span style={{ fontFamily: '"Noto Serif SC", serif' }}>將</span>{" "}
              {profile.xq_elo}
            </p>
            <p className="text-xs text-muted">
              Elo cờ tướng ·{" "}
              <span className="text-sage">{profile.xq_wins}</span>/
              <span className="text-rust">{profile.xq_losses}</span>/{profile.xq_draws}
            </p>
          </div>
          <div>
            <p className="font-[family-name:var(--font-mono)] text-xl text-brass">
              ✕ {profile.caro_elo}
            </p>
            <p className="text-xs text-muted">
              Elo caro ·{" "}
              <span className="text-sage">{profile.caro_wins}</span>/
              <span className="text-rust">{profile.caro_losses}</span>/
              {profile.caro_draws}
            </p>
          </div>
          <div>
            <p className="font-[family-name:var(--font-mono)] text-xl text-brass">
              🦁 {profile.jg_elo}
            </p>
            <p className="text-xs text-muted">
              Elo cờ thú ·{" "}
              <span className="text-sage">{profile.jg_wins}</span>/
              <span className="text-rust">{profile.jg_losses}</span>/{profile.jg_draws}
            </p>
          </div>
          <div>
            <p className="font-[family-name:var(--font-mono)] text-xl">
              {profile.games_played +
                profile.xq_games_played +
                profile.caro_games_played +
                profile.jg_games_played}
            </p>
            <p className="text-xs text-muted">Tổng số ván</p>
          </div>
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted">Elo theo thời gian</h2>
        <div className="flex gap-1">
          {(["chess", "xiangqi", "caro", "jungle"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setChartVariant(v)}
              className={`rounded-[6px] border px-3 py-1 text-xs transition-colors ${
                chartVariant === v
                  ? "border-brass text-brass"
                  : "border-line text-muted hover:border-brass/50"
              }`}
            >
              {v === "chess"
                ? "Cờ vua"
                : v === "xiangqi"
                  ? "Cờ tướng"
                  : v === "caro"
                    ? "Caro"
                    : "Cờ thú"}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3">
        <EloChart points={history ?? []} />
      </div>

      <h2 className="mt-10 text-sm font-medium text-muted">20 ván gần nhất</h2>
      <div className="mt-3 overflow-hidden rounded-[10px] border border-line bg-slate">
        {(games?.items ?? []).length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-muted">
            Chưa có ván đấu nào.
          </p>
        ) : (
          games!.items.map((g) => {
            const r = resultLabel(g, profile.username);
            return (
              <Link
                key={g.id}
                href={`/game/${g.id}`}
                className="flex items-center gap-4 border-b border-line px-4 py-3 text-sm transition-colors last:border-b-0 hover:bg-line/30"
              >
                <span className={`w-14 shrink-0 font-medium ${r.tone}`}>{r.text}</span>
                <span
                  className="w-6 shrink-0 text-center text-brass"
                  title={
                    g.variant === "xiangqi"
                      ? "Cờ tướng"
                      : g.variant === "caro"
                        ? "Caro"
                        : g.variant === "jungle"
                          ? "Cờ thú"
                          : "Cờ vua"
                  }
                  style={
                    g.variant === "xiangqi"
                      ? { fontFamily: '"Noto Serif SC", serif' }
                      : undefined
                  }
                >
                  {g.variant === "xiangqi"
                    ? "將"
                    : g.variant === "caro"
                      ? "✕"
                      : g.variant === "jungle"
                        ? "🦁"
                        : "♞"}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {g.white.username}{" "}
                  <span className="text-muted">({g.white_elo_before ?? g.white.elo})</span>
                  {" — "}
                  {g.black.username}{" "}
                  <span className="text-muted">({g.black_elo_before ?? g.black.elo})</span>
                </span>
                <span className="shrink-0 font-[family-name:var(--font-mono)] text-xs text-muted">
                  {g.time_control}
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {new Date(g.started_at).toLocaleDateString("vi-VN")}
                </span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
