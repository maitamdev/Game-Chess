"use client";

import Clock from "@/components/game/Clock";
import type { JgColor } from "@/lib/jungle/rules";

interface JunglePlayerCardProps {
  name: string;
  subtitle?: string;
  color: JgColor;
  clockMs: number | null;
  clockActive: boolean;
  thinking?: boolean;
  /** emoji các thú đã bắt được của đối phương */
  capturedEmoji?: string;
}

export default function JunglePlayerCard({
  name,
  subtitle,
  color,
  clockMs,
  clockActive,
  thinking,
  capturedEmoji,
}: JunglePlayerCardProps) {
  const accent = color === "r" ? "#B4553C" : "#3F6C8C";
  return (
    <div className="flex items-center gap-3 rounded-[10px] border border-line bg-slate px-4 py-3">
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
        style={{ background: "#F2E8CF", border: `2px solid ${accent}` }}
      >
        {color === "r" ? "🦁" : "🐯"}
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
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
          {subtitle && <span>{subtitle}</span>}
          {capturedEmoji && <span className="tracking-tight">{capturedEmoji}</span>}
        </div>
      </div>
      {clockMs !== null && <Clock ms={clockMs} active={clockActive} />}
    </div>
  );
}
