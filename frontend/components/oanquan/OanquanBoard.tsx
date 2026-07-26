"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  OQ_OWN_CELLS,
  OQ_QUAN_VALUE,
  oqOwner,
  oqUci,
  type OqColor,
  type OqDir,
  type OqMove,
} from "@/lib/oanquan/rules";

/**
 * Bàn ô ăn quan — 2 ô quan bán nguyệt hai đầu + 2 hàng × 5 ô dân,
 * chất giấy dó cùng tông với các bàn khác. Tương tác 2 bước:
 * nhấp ô dân của mình → hiện 2 mũi tên chiều rải → nhấp mũi tên để đi.
 * Hoạt ảnh: nhịp rải lan theo sowPath, ô bị ăn nháy đỏ gạch.
 *
 * Bố cục ô trong vòng (chỉ số của rules):
 *   hàng trên  trái→phải: 11 10 9 8 7   (bên B — Xanh)
 *   hàng dưới trái→phải:  1  2 3 4 5   (bên A — Đỏ)
 *   ô 0 = quan trái (bán nguyệt), ô 6 = quan phải.
 */

export interface OanquanBoardProps {
  /** Số dân 12 ô tại thế đang xem. */
  dan: readonly number[];
  quanLeft: boolean;
  quanRight: boolean;
  turn: OqColor;
  interactive: boolean;
  movableColor: OqColor | "both" | null;
  onMove: (uci: string) => void;
  /** Nước vừa đi tại thế đang xem (để hoạt ảnh rải + đánh dấu). */
  lastMove: OqMove | null;
  hint?: { cell: number; dir: OqDir } | null;
}

const RED = "#B4553C";
const BLUE = "#3F6C8C";

/** 15 vị trí sỏi cố định trong ô (%), rải kiểu vốc sỏi thật. */
const PEBBLE_SPOTS: [number, number][] = [
  [50, 46], [34, 34], [66, 36], [38, 62], [64, 60],
  [50, 24], [24, 50], [76, 50], [50, 70], [30, 76],
  [70, 76], [20, 26], [80, 26], [42, 44], [58, 52],
];

/** Toạ độ lưới CSS cho từng ô trong vòng. */
function gridArea(cell: number): React.CSSProperties {
  if (cell === 0) return { gridColumn: "1", gridRow: "1 / span 2" };
  if (cell === 6) return { gridColumn: "7", gridRow: "1 / span 2" };
  if (cell >= 1 && cell <= 5) return { gridColumn: `${cell + 1}`, gridRow: "2" };
  // 7..11 hàng trên, 7 nằm sát ô quan phải
  return { gridColumn: `${13 - cell}`, gridRow: "1" };
}

/** Chiều rải "r"/"l" ứng với mũi tên trái/phải THEO MẮT NHÌN của ô này. */
function visualDirs(cell: number): { left: OqDir; right: OqDir } {
  // hàng dưới: +1 đi sang phải; hàng trên: +1 đi sang trái
  return cell <= 5 ? { left: "l", right: "r" } : { left: "r", right: "l" };
}

function Pebbles({ count, tone }: { count: number; tone: string }) {
  const shown = Math.min(count, 15);
  return (
    <>
      {Array.from({ length: shown }, (_, i) => {
        const [x, y] = PEBBLE_SPOTS[i];
        return (
          <span
            key={i}
            aria-hidden
            className="absolute rounded-full"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: "13%",
              aspectRatio: "1",
              transform: "translate(-50%, -50%)",
              background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${tone} 55%, #fff) 0%, ${tone} 65%)`,
              boxShadow: "0 1px 1px rgba(16,20,28,0.35)",
            }}
          />
        );
      })}
    </>
  );
}

export default function OanquanBoard({
  dan,
  quanLeft,
  quanRight,
  turn,
  interactive,
  movableColor,
  onMove,
  lastMove,
  hint,
}: OanquanBoardProps) {
  const reduced = useReducedMotion();
  const [selected, setSelected] = useState<number | null>(null);

  // hoạt ảnh rải: ghi nhận lastMove mới nhất để phát nhịp lan
  const [anim, setAnim] = useState<{ move: OqMove; key: number } | null>(null);
  const prevMoveRef = useRef<OqMove | null>(null);
  const animKeyRef = useRef(0);
  useEffect(() => {
    if (lastMove !== prevMoveRef.current) {
      prevMoveRef.current = lastMove;
      setSelected(null);
      if (lastMove && !reduced) {
        animKeyRef.current += 1;
        setAnim({ move: lastMove, key: animKeyRef.current });
      } else {
        setAnim(null);
      }
    }
  }, [lastMove, reduced]);

  useEffect(() => {
    if (!interactive) setSelected(null);
  }, [interactive]);

  const canPick = useCallback(
    (cell: number): boolean => {
      if (!interactive) return false;
      const owner = oqOwner(cell);
      if (owner !== turn) return false;
      if (dan[cell] === 0) return false;
      return movableColor === "both" || movableColor === owner;
    },
    [interactive, turn, dan, movableColor],
  );

  const play = useCallback(
    (cell: number, dir: OqDir) => {
      setSelected(null);
      onMove(oqUci(cell, dir));
    },
    [onMove],
  );

  // vị trí trong sowPath của từng ô (lần rải CUỐI vào ô đó) để tính delay nhịp lan
  const sowDelay = useMemo(() => {
    const map = new Map<number, number>();
    if (anim) {
      anim.move.sowPath.forEach((c, i) => map.set(c, i));
    }
    return map;
  }, [anim]);
  const capturedCells = useMemo(
    () => new Set(anim ? anim.move.captures.map((c) => c.cell) : []),
    [anim],
  );
  const sowStep = 0.07;

  const renderCell = (cell: number) => {
    const isQuan = cell === 0 || cell === 6;
    const owner = oqOwner(cell);
    const count = dan[cell];
    const hasQuan = cell === 0 ? quanLeft : cell === 6 ? quanRight : false;
    const pickable = !isQuan && canPick(cell);
    const isSelected = selected === cell;
    const isLastFrom = lastMove?.cell === cell;
    const isHint = hint?.cell === cell;
    const delayIdx = sowDelay.get(cell);
    const wasCaptured = capturedCells.has(cell);
    const tone = owner === "a" ? RED : owner === "b" ? BLUE : "var(--brass)";

    const base = isQuan
      ? "#E4D2AC"
      : (cell % 2 === 0 ? "#E9DCC0" : "#E0CFAC");

    return (
      <div
        key={cell}
        style={{
          ...gridArea(cell),
          position: "relative",
        }}
      >
        <button
          type="button"
          disabled={!pickable}
          aria-label={
            isQuan
              ? `Ô quan ${cell === 0 ? "trái" : "phải"}: ${hasQuan ? "còn quan" : "hết quan"}${count > 0 ? `, ${count} dân` : ""}`
              : `Ô ${cell} (${owner === "a" ? "Đỏ" : "Xanh"}): ${count} dân`
          }
          onClick={() => {
            if (!pickable) return;
            setSelected((s) => (s === cell ? null : cell));
          }}
          className="relative block h-full w-full select-none"
          style={{
            background: isQuan
              ? `radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--brass) 30%, ${base}) 0%, ${base} 80%)`
              : base,
            borderRadius: cell === 0 ? "999px 0 0 999px" : cell === 6 ? "0 999px 999px 0" : 0,
            border: "0.5px solid #c9b58c",
            cursor: pickable ? "pointer" : "default",
          }}
        >
          {/* dấu nước vừa đi: ô xuất phát */}
          {isLastFrom && (
            <span
              aria-hidden
              className="absolute inset-0"
              style={{ background: "var(--brass)", opacity: 0.28, borderRadius: "inherit" }}
            />
          )}
          {/* gợi ý */}
          {isHint && (
            <span
              aria-hidden
              className="absolute inset-0"
              style={{ background: "var(--sage)", opacity: 0.3, borderRadius: "inherit" }}
            />
          )}
          {/* nhịp rải lan theo sowPath */}
          {anim && delayIdx !== undefined && (
            <motion.span
              key={`sow-${anim.key}-${cell}`}
              aria-hidden
              className="absolute inset-0"
              style={{ background: "var(--brass)", borderRadius: "inherit" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.45, 0] }}
              transition={{ delay: delayIdx * sowStep, duration: 0.32 }}
            />
          )}
          {/* ô bị ăn nháy đỏ */}
          {anim && wasCaptured && (
            <motion.span
              key={`cap-${anim.key}-${cell}`}
              aria-hidden
              className="absolute inset-0"
              style={{ background: "var(--rust)", borderRadius: "inherit" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.5, 0] }}
              transition={{
                delay: anim.move.sowPath.length * sowStep + 0.1,
                duration: 0.5,
              }}
            />
          )}
          {/* viền chọn */}
          {isSelected && (
            <span
              aria-hidden
              className="absolute inset-[3%]"
              style={{ border: "3px solid var(--brass)", borderRadius: "inherit" }}
            />
          )}

          {/* quan */}
          {hasQuan && (
            <span
              aria-hidden
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: "42%",
                aspectRatio: "1",
                background:
                  "radial-gradient(circle at 35% 30%, #d8b96a 0%, #a8843a 70%)",
                border: "2.5px solid #6E4F35",
                boxShadow: "0 2px 3px rgba(16,20,28,0.4)",
              }}
            />
          )}
          {/* sỏi dân */}
          {count > 0 && (
            <span aria-hidden className="absolute inset-0" style={{ opacity: hasQuan ? 0.85 : 1 }}>
              <Pebbles count={count} tone="#6E4F35" />
            </span>
          )}
          {/* số đếm */}
          {(count > 0 || hasQuan) && (
            <span
              aria-hidden
              className="absolute bottom-[4%] right-[6%] rounded-[6px] px-1 font-[family-name:var(--font-mono)]"
              style={{
                fontSize: "clamp(10px, 1.6vh, 13px)",
                background: "rgba(16,20,28,0.55)",
                color: "#F2EDE3",
                lineHeight: 1.5,
              }}
            >
              {hasQuan ? `${OQ_QUAN_VALUE}+${count}` : count}
            </span>
          )}
          {/* nhãn phe của hàng (mờ, chỉ ở ô giữa) */}
          {(cell === 3 || cell === 9) && count === 0 && (
            <span
              aria-hidden
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] uppercase tracking-widest"
              style={{ color: tone, opacity: 0.4 }}
            >
              {owner === "a" ? "Đỏ" : "Xanh"}
            </span>
          )}
        </button>

        {/* 2 mũi tên chọn chiều rải */}
        {isSelected && (
          <div
            className="absolute left-1/2 z-20 flex -translate-x-1/2 gap-1"
            style={cell <= 5 ? { bottom: "102%" } : { top: "102%" }}
          >
            {(["left", "right"] as const).map((side) => {
              const dir = visualDirs(cell)[side];
              return (
                <button
                  key={side}
                  type="button"
                  aria-label={`Rải ${side === "left" ? "sang trái" : "sang phải"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    play(cell, dir);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-base font-bold transition-[filter] hover:brightness-110"
                  style={{
                    background: "var(--brass)",
                    color: "var(--ink)",
                    boxShadow: "0 2px 6px rgba(16,20,28,0.5)",
                  }}
                >
                  {side === "left" ? "◀" : "▶"}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="relative select-none"
      style={{ width: "min(860px, calc(100vw - 32px))" }}
    >
      <div
        className="grid gap-[3px] rounded-[8px] border border-line p-[6px]"
        style={{
          gridTemplateColumns: "1.15fr repeat(5, 1fr) 1.15fr",
          gridTemplateRows: "1fr 1fr",
          aspectRatio: "7.3 / 2.15",
          background: "#CBB68C",
        }}
      >
        {[0, 11, 10, 9, 8, 7, 6, 1, 2, 3, 4, 5].map(renderCell)}
      </div>
    </div>
  );
}
