"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { TrackedPiece } from "@/lib/types";
import { PIECE_NAMES } from "@/lib/types";

/** Bezier cho chuyển động quân: 180ms, cubic-bezier(0.2, 0.8, 0.3, 1) */
export const MOVE_EASE: [number, number, number, number] = [0.2, 0.8, 0.3, 1];
/** Bezier cho xoay bàn: 400ms, cubic-bezier(0.4, 0, 0.2, 1) */
export const FLIP_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

export function pieceSrc(piece: Pick<TrackedPiece, "color" | "type">): string {
  return `/pieces/${piece.color}${piece.type.toUpperCase()}.svg`;
}

export function fileOf(square: string): number {
  return square.charCodeAt(0) - 97;
}

export function rankOf(square: string): number {
  return Number(square[1]) - 1;
}

interface PieceProps {
  piece: TrackedPiece;
  /** Bàn đang xoay 180° (hướng nhìn quân đen) — quân phải xoay ngược lại */
  counterRotated: boolean;
  /** Đặt ngay lập tức, không hoạt ảnh trượt (dùng khi thả quân sau kéo) */
  instant?: boolean;
  /** Quân đang bị kéo — hiện bóng mờ 30% ở ô gốc */
  ghost?: boolean;
  /** Quân vừa bị ăn — thu nhỏ về 0.6 và mờ dần trong 140ms */
  dying?: boolean;
  /** Góc counter-rotate tại thời điểm bị ăn (khi nước ăn quân kèm tự xoay bàn) */
  bornRotate?: number;
}

export default function Piece({
  piece,
  counterRotated,
  instant,
  ghost,
  dying,
  bornRotate,
}: PieceProps) {
  const reduced = useReducedMotion();
  const x = `${fileOf(piece.square) * 100}%`;
  const y = `${(7 - rankOf(piece.square)) * 100}%`;
  const moveDuration = reduced || instant ? 0 : 0.18;

  return (
    <motion.div
      className="pointer-events-none absolute left-0 top-0 h-[12.5%] w-[12.5%]"
      initial={
        dying
          ? {
              x,
              y,
              rotate: bornRotate ?? (counterRotated ? 180 : 0),
              scale: 1,
              opacity: 1,
            }
          : false
      }
      animate={{
        x,
        y,
        rotate: counterRotated ? 180 : 0,
        scale: dying ? 0.6 : 1,
        opacity: dying ? 0 : ghost ? 0.3 : 1,
      }}
      transition={{
        x: { duration: moveDuration, ease: MOVE_EASE },
        y: { duration: moveDuration, ease: MOVE_EASE },
        rotate: { duration: reduced ? 0 : 0.4, ease: FLIP_EASE },
        scale: { duration: reduced ? 0 : 0.14 },
        opacity: { duration: reduced ? 0 : dying ? 0.14 : 0 },
      }}
      style={{ zIndex: dying ? 5 : 10 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={pieceSrc(piece)}
        alt={`${PIECE_NAMES[piece.type]} ${piece.color === "w" ? "trắng" : "đen"}`}
        draggable={false}
        className="h-full w-full select-none"
      />
    </motion.div>
  );
}
