"use client";

import Clock from "@/components/game/Clock";
import type { XqColor } from "@/lib/xiangqi/rules";

interface XqPlayerCardProps {
  name: string;
  subtitle?: string;
  color: XqColor;
  clockMs: number | null;
  clockActive: boolean;
  thinking?: boolean;
  /** chuỗi chữ Hán các quân đã bắt được, ví dụ "馬卒卒" */
  capturedChars?: string;
}

export default function XqPlayerCard({
  name,
  subtitle,
  color,
  clockMs,
  clockActive,
  thinking,
  capturedChars,
}: XqPlayerCardProps) {
  const accent = color === "r" ? "#B4553C" : "#22262C";
  return (
    <div className="flex items-center gap-3 rounded-[10px] border border-line bg-slate px-4 py-3">
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-bold"
        style={{
          background: "#F2E8CF",
          border: `2px solid ${accent}`,
          color: accent,
          fontFamily: '"Noto Serif SC", "SimSun", serif',
        }}
      >
        {color === "r" ? "帥" : "將"}
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
          {capturedChars && (
            <span
              style={{ fontFamily: '"Noto Serif SC", "SimSun", serif' }}
              className="tracking-wide"
            >
              {capturedChars}
            </span>
          )}
        </div>
      </div>
      {clockMs !== null && <Clock ms={clockMs} active={clockActive} />}
    </div>
  );
}
