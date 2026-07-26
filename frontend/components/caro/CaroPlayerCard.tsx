"use client";

import Clock from "@/components/game/Clock";
import type { CaroColor } from "@/lib/caro/rules";

interface CaroPlayerCardProps {
  name: string;
  subtitle?: string;
  color: CaroColor;
  clockMs: number | null;
  clockActive: boolean;
  thinking?: boolean;
}

export default function CaroPlayerCard({
  name,
  subtitle,
  color,
  clockMs,
  clockActive,
  thinking,
}: CaroPlayerCardProps) {
  const accent = color === "x" ? "#B4553C" : "#22262C";
  return (
    <div className="flex items-center gap-3 rounded-[10px] border border-line bg-slate px-4 py-3">
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-bold"
        style={{ background: "#F2E8CF", border: `2px solid ${accent}`, color: accent }}
      >
        {color === "x" ? "✕" : "○"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{name}</span>
          {thinking && (
            <span
              className="flex items-center gap-1"
              role="status"
              aria-label="Máy đang suy nghĩ"
            >
              <span className="thinking-dot" />
              <span className="thinking-dot" />
              <span className="thinking-dot" />
            </span>
          )}
        </div>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {clockMs !== null && <Clock ms={clockMs} active={clockActive} />}
    </div>
  );
}
