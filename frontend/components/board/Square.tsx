"use client";

import { memo } from "react";
import type { Square as SquareName } from "chess.js";

export interface SquareProps {
  square: SquareName;
  isLight: boolean;
  isSelected: boolean;
  isLastMove: boolean;
  isCheck: boolean;
  isLegalEmpty: boolean;
  isLegalCapture: boolean;
  isDragHover: boolean;
  isHint: boolean;
  isPremove: boolean;
  fileLabel: string | null;
  rankLabel: string | null;
  counterRotated: boolean;
  checkKey: string;
  ariaLabel: string;
  onKeyActivate: (square: SquareName) => void;
  onEscape: () => void;
}

/**
 * Một ô bàn cờ — mục 11. Ô là <button> để Tab/Enter hoạt động;
 * mọi tương tác chuột/chạm do ChessBoard xử lý qua pointer events.
 */
function Square({
  square,
  isLight,
  isSelected,
  isLastMove,
  isCheck,
  isLegalEmpty,
  isLegalCapture,
  isDragHover,
  isHint,
  isPremove,
  fileLabel,
  rankLabel,
  counterRotated,
  checkKey,
  ariaLabel,
  onKeyActivate,
  onEscape,
}: SquareProps) {
  return (
    <button
      type="button"
      data-square={square}
      aria-label={ariaLabel}
      className="relative block h-full w-full focus-visible:z-20"
      style={{ background: isLight ? "var(--boxwood)" : "var(--walnut)" }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onKeyActivate(square);
        } else if (e.key === "Escape") {
          onEscape();
        }
      }}
    >
      {/* Nước vừa đi: phủ brass 25% */}
      {isLastMove && (
        <span
          aria-hidden
          className="absolute inset-0"
          style={{ background: "var(--brass)", opacity: 0.25 }}
        />
      )}
      {/* Nước đi trước lượt (premove): phủ brass nhạt + viền trong đứt quãng */}
      {isPremove && (
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background: "color-mix(in srgb, var(--brass) 15%, transparent)",
            boxShadow:
              "inset 0 0 0 2px color-mix(in srgb, var(--brass) 70%, transparent)",
          }}
        />
      )}
      {/* Gợi ý từ engine: phủ sage 30% */}
      {isHint && (
        <span
          aria-hidden
          className="absolute inset-0"
          style={{ background: "var(--sage)", opacity: 0.3 }}
        />
      )}
      {/* Quân đang được chọn: phủ brass 35% */}
      {isSelected && (
        <span
          aria-hidden
          className="absolute inset-0"
          style={{ background: "var(--brass)", opacity: 0.35 }}
        />
      )}
      {/* Vua bị chiếu: phủ rust 45%, nhấp nháy 2 lần */}
      {isCheck && (
        <span aria-hidden key={checkKey} className="check-overlay absolute inset-0" />
      )}
      {/* Ô đích hợp lệ, ô trống: chấm sage đường kính 30% */}
      {isLegalEmpty && (
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: "var(--sage)" }}
        />
      )}
      {/* Ô đích hợp lệ, có quân địch: vòng viền sage 4px ôm sát mép ô */}
      {isLegalCapture && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{ border: "4px solid var(--sage)" }}
        />
      )}
      {/* Ô đang di chuột tới khi kéo: viền trong 3px parchment 60% */}
      {isDragHover && (
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            boxShadow:
              "inset 0 0 0 3px color-mix(in srgb, var(--parchment) 60%, transparent)",
          }}
        />
      )}
      {/* Toạ độ — khung counter-rotate để chữ luôn xuôi chiều người nhìn */}
      {(fileLabel || rankLabel) && (
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            transform: counterRotated ? "rotate(180deg)" : undefined,
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: isLight ? "var(--walnut)" : "var(--boxwood)",
            opacity: 0.8,
          }}
        >
          {rankLabel && (
            <span className="absolute left-[3px] top-[2px] leading-none">
              {rankLabel}
            </span>
          )}
          {fileLabel && (
            <span className="absolute bottom-[2px] right-[3px] leading-none">
              {fileLabel}
            </span>
          )}
        </span>
      )}
    </button>
  );
}

export default memo(Square);
