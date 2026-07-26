"use client";

import Clock from "@/components/game/Clock";
import { OQ_QUAN_VALUE, type OqColor, type OqStore } from "@/lib/oanquan/rules";

interface OanquanPlayerCardProps {
  name: string;
  subtitle?: string;
  color: OqColor;
  clockMs: number | null;
  clockActive: boolean;
  thinking?: boolean;
  /** Kho đã ăn tại thế đang xem. */
  store?: OqStore;
}

export default function OanquanPlayerCard({
  name,
  subtitle,
  color,
  clockMs,
  clockActive,
  thinking,
  store,
}: OanquanPlayerCardProps) {
  const accent = color === "a" ? "#B4553C" : "#3F6C8C";
  const score = store ? store.dan + store.quan * OQ_QUAN_VALUE - store.debt : 0;
  return (
    <div className="flex items-center gap-3 rounded-[10px] border border-line bg-slate px-4 py-3">
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
        style={{ background: "#F2E8CF", border: `2px solid ${accent}` }}
      >
        🌾
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
          {store && (
            <span>
              Kho:{" "}
              <span className="font-[family-name:var(--font-mono)] text-parchment/90">
                {score}
              </span>{" "}
              điểm
              {store.quan > 0 && ` (${store.quan} quan)`}
              {store.debt > 0 && ` · nợ ${store.debt}`}
            </span>
          )}
        </div>
      </div>
      {clockMs !== null && <Clock ms={clockMs} active={clockActive} />}
    </div>
  );
}
