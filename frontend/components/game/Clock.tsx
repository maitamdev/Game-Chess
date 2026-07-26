"use client";

import { useEffect, useRef } from "react";
import { playSound } from "@/lib/sounds";

interface ClockProps {
  ms: number;
  /** Đồng hồ của bên đang đi và đang đếm */
  active: boolean;
}

export function formatClock(ms: number): string {
  const total = Math.max(0, ms);
  const h = Math.floor(total / 3_600_000);
  const m = Math.floor((total % 3_600_000) / 60_000);
  const s = Math.floor((total % 60_000) / 1000);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  if (total < 10_000) {
    const tenth = Math.floor((total % 1000) / 100);
    return `${m}:${String(s).padStart(2, "0")}.${tenth}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function Clock({ ms, active }: ClockProps) {
  const low = ms < 10_000;
  const lastSecondRef = useRef<number | null>(null);

  // tick.mp3 mỗi giây khi đồng hồ đang chạy còn dưới 10 giây
  useEffect(() => {
    if (!active || !low || ms <= 0) {
      lastSecondRef.current = null;
      return;
    }
    const second = Math.ceil(ms / 1000);
    if (lastSecondRef.current !== null && second !== lastSecondRef.current) {
      playSound("tick");
    }
    lastSecondRef.current = second;
  }, [ms, active, low]);

  return (
    <span
      className={`rounded-[6px] border px-3 py-1 font-[family-name:var(--font-mono)] text-lg tabular-nums transition-colors ${
        active
          ? low
            ? "border-rust bg-rust/10 text-rust"
            : "border-brass bg-brass/10 text-brass"
          : "border-line text-muted"
      }`}
    >
      {formatClock(ms)}
    </span>
  );
}
