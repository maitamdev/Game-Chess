"use client";

import type { Color, PieceSymbol } from "chess.js";
import Clock from "./Clock";
import CapturedPieces from "./CapturedPieces";

interface PlayerCardProps {
  name: string;
  subtitle?: string;
  color: Color;
  clockMs: number | null;
  clockActive: boolean;
  thinking?: boolean;
  capturedTypes: PieceSymbol[];
  materialDiff: number;
}

/** Avatar + tên + phụ đề (elo/mức máy) + quân đã bắt + đồng hồ. */
export default function PlayerCard({
  name,
  subtitle,
  color,
  clockMs,
  clockActive,
  thinking,
  capturedTypes,
  materialDiff,
}: PlayerCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-[10px] border border-line bg-slate px-4 py-3">
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-lg"
        style={{
          background: color === "w" ? "#F5EFE3" : "#22262C",
          borderColor: color === "w" ? "#2B2B29" : "#0A0C10",
          color: color === "w" ? "#2B2B29" : "#F2EDE3",
        }}
      >
        {color === "w" ? "♔" : "♚"}
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
          <CapturedPieces
            types={capturedTypes}
            color={color === "w" ? "b" : "w"}
            materialDiff={materialDiff}
          />
        </div>
      </div>
      {clockMs !== null && <Clock ms={clockMs} active={clockActive} />}
    </div>
  );
}
