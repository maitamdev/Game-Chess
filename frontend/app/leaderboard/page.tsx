"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, type PublicUser, type Variant } from "@/lib/api";

function LeaderboardContent() {
  const params = useSearchParams();
  const fromUrl = params.get("variant");
  const initial: Variant =
    fromUrl === "xiangqi" || fromUrl === "caro" || fromUrl === "jungle"
      ? fromUrl
      : "chess";
  const [variant, setVariant] = useState<Variant>(initial);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["leaderboard", variant, 100],
    queryFn: () => api<PublicUser[]>(`/api/leaderboard?limit=100&variant=${variant}`),
  });

  const elo = (u: PublicUser) =>
    variant === "chess"
      ? u.elo
      : variant === "xiangqi"
        ? u.xq_elo
        : variant === "caro"
          ? u.caro_elo
          : u.jg_elo;
  const stats = (u: PublicUser) =>
    variant === "chess"
      ? { games: u.games_played, w: u.wins, l: u.losses, d: u.draws }
      : variant === "xiangqi"
        ? { games: u.xq_games_played, w: u.xq_wins, l: u.xq_losses, d: u.xq_draws }
        : variant === "caro"
          ? {
              games: u.caro_games_played,
              w: u.caro_wins,
              l: u.caro_losses,
              d: u.caro_draws,
            }
          : { games: u.jg_games_played, w: u.jg_wins, l: u.jg_losses, d: u.jg_draws };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold">
            Bảng xếp hạng
          </h1>
          <p className="mt-1 text-sm text-muted">Top 100 kỳ thủ theo Elo.</p>
        </div>
        <div className="flex gap-1">
          {(["chess", "xiangqi", "caro", "jungle"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVariant(v)}
              className={`rounded-[6px] border px-3 py-1.5 text-sm transition-colors ${
                variant === v
                  ? "border-brass text-brass"
                  : "border-line text-muted hover:border-brass/50"
              }`}
            >
              {v === "chess"
                ? "♞ Cờ vua"
                : v === "xiangqi"
                  ? "將 Cờ tướng"
                  : v === "caro"
                    ? "✕ Caro"
                    : "🦁 Cờ thú"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-[10px] border border-line bg-slate">
        <div className="flex items-center gap-4 border-b border-line px-4 py-2 text-xs text-muted">
          <span className="w-8 text-right">#</span>
          <span className="flex-1">Kỳ thủ</span>
          <span className="w-14 text-right">Elo</span>
          <span className="w-12 text-right">Ván</span>
          <span className="w-20 text-right">T / B / H</span>
        </div>
        {isLoading && (
          <p className="px-4 py-6 text-center text-xs text-muted">Đang tải…</p>
        )}
        {isError && (
          <p className="px-4 py-6 text-center text-xs text-rust">
            Không kết nối được máy chủ.
          </p>
        )}
        {(data ?? []).map((u, i) => {
          const s = stats(u);
          return (
            <Link
              key={u.id}
              href={`/u/${u.username}`}
              className="flex items-center gap-4 border-b border-line px-4 py-2.5 text-sm transition-colors last:border-b-0 hover:bg-line/30"
            >
              <span
                className={`w-8 text-right font-[family-name:var(--font-mono)] ${
                  i < 3 ? "text-brass" : "text-muted"
                }`}
              >
                {i + 1}
              </span>
              <span className="flex-1 truncate">{u.username}</span>
              <span className="w-14 text-right font-[family-name:var(--font-mono)] text-brass">
                {elo(u)}
              </span>
              <span className="w-12 text-right font-[family-name:var(--font-mono)] text-muted">
                {s.games}
              </span>
              <span className="w-20 text-right font-[family-name:var(--font-mono)] text-xs text-muted">
                {s.w}/{s.l}/{s.d}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense>
      <LeaderboardContent />
    </Suspense>
  );
}
