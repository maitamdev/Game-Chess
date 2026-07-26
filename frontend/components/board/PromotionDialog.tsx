"use client";

import { useEffect } from "react";
import type { Color, PieceSymbol, Square } from "chess.js";
import { fileOf, rankOf, pieceSrc } from "./Piece";
import { PIECE_NAMES } from "@/lib/types";

const CHOICES: PieceSymbol[] = ["q", "n", "r", "b"];

interface PromotionDialogProps {
  color: Color;
  square: Square;
  orientation: "white" | "black";
  onPick: (piece: PieceSymbol) => void;
  onCancel: () => void;
}

/**
 * Bảng chọn quân phong cấp hiện ngay tại ô phong cấp (mục 11),
 * không dùng modal giữa màn hình. Toạ độ tính theo hướng nhìn hiện tại.
 */
export default function PromotionDialog({
  color,
  square,
  orientation,
  onPick,
  onCancel,
}: PromotionDialogProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const f = fileOf(square);
  const r = rankOf(square);
  const vCol = orientation === "white" ? f : 7 - f;
  const vRow = orientation === "white" ? 7 - r : r;
  // Ô phong cấp ở mép trên thì trải xuống, ở mép dưới thì trải lên
  const downward = vRow <= 3;

  return (
    <div
      className="absolute inset-0 z-30"
      onPointerDown={(e) => {
        e.stopPropagation();
        onCancel();
      }}
    >
      <div
        className="absolute flex w-[12.5%] flex-col overflow-hidden rounded-[6px] border border-line bg-slate"
        style={{
          left: `${vCol * 12.5}%`,
          top: downward ? `${vRow * 12.5}%` : undefined,
          bottom: downward ? undefined : `${(7 - vRow) * 12.5}%`,
          flexDirection: downward ? "column" : "column-reverse",
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {CHOICES.map((p) => (
          <button
            key={p}
            type="button"
            aria-label={`Phong cấp thành ${PIECE_NAMES[p]}`}
            className="aspect-square w-full p-1 transition-colors hover:bg-line"
            onClick={() => onPick(p)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pieceSrc({ color, type: p })}
              alt={PIECE_NAMES[p]}
              draggable={false}
              className="h-full w-full"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
