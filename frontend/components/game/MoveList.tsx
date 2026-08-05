"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import {
  CaretLeft,
  CaretRight,
  FastForward,
  ListBullets,
  Rewind,
  Scroll,
} from "@phosphor-icons/react";

/** Chỉ cần ký hiệu nước đi - dùng chung cho cờ vua lẫn cờ tướng. */
interface MoveEntry {
  san: string;
}

interface MoveListProps {
  moves: MoveEntry[];
  /** 0 = thế cờ ban đầu, i = sau nước thứ i */
  viewIndex: number;
  onSelect: (index: number) => void;
  variant?: "default" | "jungle";
}

/**
 * Bảng ký hiệu nước đi kiểu tờ biên bản giải đấu (mục 10):
 * kẻ dòng mảnh màu --line, số nước căn trái trong cột hẹp,
 * nước đang xem đánh dấu bằng vạch đứng màu đồng bên trái.
 */
export default function MoveList({
  moves,
  viewIndex,
  onSelect,
  variant = "default",
}: MoveListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest" });
  }, [viewIndex, moves.length]);

  const rows: { no: number; white: MoveEntry | null; black: MoveEntry | null }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({
      no: i / 2 + 1,
      white: moves[i] ?? null,
      black: moves[i + 1] ?? null,
    });
  }

  const cell = (move: MoveEntry | null, index: number) => {
    if (!move) return <span className="flex-1" />;
    const isCurrent = viewIndex === index + 1;
    return (
      <button
        ref={isCurrent ? currentRef : undefined}
        type="button"
        onClick={() => onSelect(index + 1)}
        className={`relative flex-1 px-2 py-1 text-left font-[family-name:var(--font-mono)] text-sm transition-colors hover:text-brass ${
          isCurrent ? "text-parchment" : "text-muted"
        }`}
      >
        {isCurrent && (
          <span
            aria-hidden
            className="absolute bottom-1 left-0 top-1 w-[2px]"
            style={{ background: "var(--brass)" }}
          />
        )}
        {move.san}
      </button>
    );
  };

  const navigation: Array<{
    icon: ReactNode;
    target: number;
    label: string;
  }> = [
    {
      icon: <Rewind aria-hidden size={15} />,
      target: 0,
      label: "Về đầu",
    },
    {
      icon: <CaretLeft aria-hidden size={15} />,
      target: Math.max(0, viewIndex - 1),
      label: "Lùi một nước",
    },
    {
      icon: <CaretRight aria-hidden size={15} />,
      target: Math.min(moves.length, viewIndex + 1),
      label: "Tiến một nước",
    },
    {
      icon: <FastForward aria-hidden size={15} />,
      target: moves.length,
      label: "Về hiện tại",
    },
  ];

  return (
    <div
      className={
        variant === "jungle"
          ? "jg-move-list flex h-full min-h-0 flex-col overflow-hidden"
          : "flex min-h-0 flex-col rounded-[10px] border border-line bg-slate"
      }
    >
      <div
        className={
          variant === "jungle"
            ? "flex items-center justify-between border-b border-white/[0.07] px-3.5 py-3 text-sm font-semibold text-[#EEE8DA]"
            : "border-b border-line px-3 py-2 text-xs text-muted"
        }
      >
        <span>{variant === "jungle" ? "Ván cờ" : "Biên bản"}</span>
        {variant === "jungle" && (
          <ListBullets aria-hidden size={17} weight="duotone" className="text-[#8D978F]" />
        )}
      </div>
      <div ref={containerRef} className="min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          variant === "jungle" ? (
            <div className="flex h-full min-h-40 flex-col items-center justify-center gap-3 px-5 py-8 text-center">
              <Scroll
                aria-hidden
                size={34}
                weight="duotone"
                className="text-[#66716A]"
              />
              <p className="text-xs text-[#8D978F]">Chưa có nước đi nào</p>
            </div>
          ) : (
            <p className="px-3 py-3 text-xs text-muted">Chưa có nước đi nào.</p>
          )
        ) : (
          rows.map((row, r) => (
            <div
              key={row.no}
              className={
                variant === "jungle"
                  ? "flex items-stretch border-b border-white/[0.055] last:border-b-0"
                  : "flex items-stretch border-b border-line last:border-b-0"
              }
            >
              <span className="w-9 shrink-0 px-2 py-1 text-left font-[family-name:var(--font-mono)] text-sm text-muted/70">
                {row.no}.
              </span>
              {cell(row.white, r * 2)}
              {cell(row.black, r * 2 + 1)}
            </div>
          ))
        )}
      </div>
      {moves.length > 0 && (
        <div
          className={
            variant === "jungle"
              ? "flex items-center justify-center gap-1 border-t border-white/[0.07] p-2"
              : "flex items-center justify-center gap-1 border-t border-line p-1.5"
          }
        >
          {navigation.map(({ icon, target, label }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              title={label}
              onClick={() => onSelect(target)}
              className="flex h-7 w-9 items-center justify-center rounded-[6px] text-xs text-muted transition-colors hover:bg-line hover:text-parchment"
            >
              {icon}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
