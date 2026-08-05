"use client";

import type { CSSProperties } from "react";
import type { JgColor, JgRank } from "@/lib/jungle/rules";

const SPRITE_POSITIONS: Record<JgRank, string> = {
  1: "0% 0%",
  2: "33.333% 0%",
  3: "66.667% 0%",
  4: "100% 0%",
  5: "0% 100%",
  6: "33.333% 100%",
  7: "66.667% 100%",
  8: "100% 100%",
};

interface JunglePieceProps {
  rank: JgRank;
  color: JgColor;
  showRank?: boolean;
  className?: string;
  style?: CSSProperties;
}

export default function JunglePiece({
  rank,
  color,
  showRank = true,
  className = "",
  style,
}: JunglePieceProps) {
  const accent = color === "r" ? "#C9664F" : "#5B88A8";

  return (
    <span
      aria-hidden
      className={`jg-piece relative block aspect-square select-none rounded-full ${className}`}
      style={
        {
          "--jg-piece-accent": accent,
          ...style,
        } as CSSProperties
      }
    >
      <span
        className="jg-piece-art absolute inset-[7%] rounded-full"
        style={{
          backgroundImage: "url('/images/jungle-animals-sprite.webp')",
          backgroundPosition: SPRITE_POSITIONS[rank],
          backgroundSize: "400% 200%",
          backgroundRepeat: "no-repeat",
        }}
      />
      {showRank && (
        <span className="jg-piece-rank absolute bottom-[-1%] right-[-1%] flex items-center justify-center rounded-full font-[family-name:var(--font-mono)] font-bold">
          {rank}
        </span>
      )}
    </span>
  );
}
