"use client";

import type { Color, PieceSymbol } from "chess.js";
import { pieceSrc } from "@/components/board/Piece";

const ORDER: PieceSymbol[] = ["q", "r", "b", "n", "p"];

interface CapturedPiecesProps {
  /** Loại các quân đã bị bắt (đều thuộc màu `color`) */
  types: PieceSymbol[];
  color: Color;
  /** Chênh lệch chất quân của bên bắt, chỉ hiện khi dương */
  materialDiff: number;
}

export default function CapturedPieces({
  types,
  color,
  materialDiff,
}: CapturedPiecesProps) {
  const sorted = [...types].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  return (
    <span className="flex h-5 items-center">
      {sorted.map((t, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${t}-${i}`}
          src={pieceSrc({ color, type: t })}
          alt=""
          className="-ml-1.5 h-5 w-5 first:ml-0"
          draggable={false}
        />
      ))}
      {materialDiff > 0 && (
        <span className="ml-1 text-xs text-muted">+{materialDiff}</span>
      )}
    </span>
  );
}
