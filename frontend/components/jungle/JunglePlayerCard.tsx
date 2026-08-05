"use client";

import Clock from "@/components/game/Clock";
import JunglePiece from "@/components/jungle/JunglePiece";
import type { JgColor, JgRank } from "@/lib/jungle/rules";

interface JunglePlayerCardProps {
  name: string;
  subtitle?: string;
  color: JgColor;
  clockMs: number | null;
  clockActive: boolean;
  isTurn?: boolean;
  thinking?: boolean;
  capturedRanks?: JgRank[];
}

export default function JunglePlayerCard({
  name,
  subtitle,
  color,
  clockMs,
  clockActive,
  isTurn = clockActive,
  thinking,
  capturedRanks,
}: JunglePlayerCardProps) {
  return (
    <div
      className="jg-player-card flex min-h-14 items-center gap-3 px-3.5 py-2"
      data-active={isTurn ? "true" : "false"}
      data-color={color}
    >
      <JunglePiece
        rank={color === "r" ? 7 : 6}
        color={color}
        showRank={false}
        className="h-10 w-10 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-[#F0EBDD]">{name}</span>
          <span className="jg-player-side shrink-0">
            {color === "r" ? "Đỏ" : "Xanh"}
          </span>
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
        <div className="mt-0.5 flex min-h-4 items-center gap-2 text-xs text-[#9EA8A1]">
          {subtitle && <span>{subtitle}</span>}
          {!!capturedRanks?.length && (
            <>
              <span className="text-[#737F78]">Đã bắt {capturedRanks.length}</span>
              <span
                className="flex -space-x-1"
                aria-label={`${capturedRanks.length} quân đã bắt`}
              >
                {capturedRanks.map((rank, index) => (
                  <JunglePiece
                    key={`${rank}-${index}`}
                    rank={rank}
                    color={color}
                    showRank={false}
                    className="h-4 w-4 ring-1 ring-[#17231F]"
                  />
                ))}
              </span>
            </>
          )}
        </div>
      </div>
      {clockMs !== null && <Clock ms={clockMs} active={clockActive} />}
    </div>
  );
}
