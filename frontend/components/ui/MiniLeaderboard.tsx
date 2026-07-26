"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, type PublicUser, type Variant } from "@/lib/api";

interface MiniLeaderboardProps {
  variant: Variant;
  title: string;
}

/** Bảng xếp hạng rút gọn 5 người ở trang chủ, theo từng game. */
export default function MiniLeaderboard({ variant, title }: MiniLeaderboardProps) {
  const { data, isError } = useQuery({
    queryKey: ["leaderboard", variant, 5],
    queryFn: () => api<PublicUser[]>(`/api/leaderboard?limit=5&variant=${variant}`),
  });

  if (isError || !data || data.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="flex items-baseline justify-between">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-medium">
          {title}
        </h2>
        <Link
          href={`/leaderboard?variant=${variant}`}
          className="text-sm text-muted transition-colors hover:text-brass"
        >
          Top 100 →
        </Link>
      </div>
      <div className="mt-4 overflow-hidden rounded-[10px] border border-line bg-slate">
        {data.map((u, i) => (
          <Link
            key={u.id}
            href={`/u/${u.username}`}
            className="flex items-center gap-4 border-b border-line px-4 py-2.5 text-sm transition-colors last:border-b-0 hover:bg-line/30"
          >
            <span
              className={`w-6 text-right font-[family-name:var(--font-mono)] ${
                i === 0 ? "text-brass" : "text-muted"
              }`}
            >
              {i + 1}
            </span>
            <span className="flex-1 truncate">{u.username}</span>
            <span className="font-[family-name:var(--font-mono)] text-brass">
              {variant === "chess"
                ? u.elo
                : variant === "xiangqi"
                  ? u.xq_elo
                  : variant === "caro"
                    ? u.caro_elo
                    : u.jg_elo}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
