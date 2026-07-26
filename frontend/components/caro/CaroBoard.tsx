"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CARO_SIZE, caroUci, type CaroColor, type CaroMove } from "@/lib/caro/rules";

/**
 * Bàn caro 200×200 giao điểm — virtualized:
 * - lưới vẽ bằng CSS repeating-gradient (không render 40 000 ô)
 * - chỉ render quân đã đặt + các lớp phủ
 * - kéo để di chuyển, lăn chuột / nút để phóng to-thu nhỏ
 * - nút ⌖ nhảy về nước mới nhất; tự bám theo nước mới ngoài khung nhìn
 */

const CELL = 28; // px một ô ở zoom 1
const WORLD = CARO_SIZE * CELL;
const MIN_Z = 0.12;
const MAX_Z = 3;

export interface CaroBoardProps {
  stones: CaroMove[]; // các quân tới viewIndex
  turn: CaroColor;
  interactive: boolean;
  movableColor: CaroColor | "both" | null;
  onMove: (uci: string) => void;
  lastMove: { x: number; y: number } | null;
  winLine: { x: number; y: number }[] | null;
  hint: { x: number; y: number } | null;
}

interface View {
  tx: number;
  ty: number;
  z: number;
}

export default function CaroBoard({
  stones,
  turn,
  interactive,
  movableColor,
  onMove,
  lastMove,
  winLine,
  hint,
}: CaroBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ tx: 0, ty: 0, z: 1 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

  const panRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    baseTx: number;
    baseTy: number;
    panning: boolean;
  } | null>(null);

  const occupied = useRef(new Set<string>());
  occupied.current = new Set(stones.map((s) => `${s.x}.${s.y}`));

  const clampView = useCallback((v: View): View => {
    const el = containerRef.current;
    if (!el) return v;
    const { clientWidth: cw, clientHeight: ch } = el;
    const w = WORLD * v.z;
    // cho phép kéo quá mép nửa màn hình để thao tác thoải mái ở rìa bàn
    const minTx = Math.min(cw / 2, cw - w - cw / 2);
    const maxTx = Math.max(cw / 2, cw - w + cw / 2);
    const minTy = Math.min(ch / 2, ch - w - ch / 2);
    const maxTy = Math.max(ch / 2, ch - w + ch / 2);
    return {
      z: v.z,
      tx: Math.min(maxTx, Math.max(minTx, v.tx)),
      ty: Math.min(maxTy, Math.max(minTy, v.ty)),
    };
  }, []);

  const centerOn = useCallback(
    (x: number, y: number, z?: number) => {
      const el = containerRef.current;
      if (!el) return;
      const zoom = z ?? viewRef.current.z;
      const px = (x + 0.5) * CELL * zoom;
      const py = (y + 0.5) * CELL * zoom;
      setView(
        clampView({
          z: zoom,
          tx: el.clientWidth / 2 - px,
          ty: el.clientHeight / 2 - py,
        }),
      );
    },
    [clampView],
  );

  // khởi tạo: căn giữa bàn (hoặc nước cuối nếu đã có ván)
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const target = lastMove ?? { x: 100, y: 100 };
    centerOn(target.x, target.y, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // tự bám theo nước mới khi nó nằm ngoài khung nhìn
  useEffect(() => {
    if (!lastMove) return;
    const el = containerRef.current;
    if (!el) return;
    const { tx, ty, z } = viewRef.current;
    const sx = tx + (lastMove.x + 0.5) * CELL * z;
    const sy = ty + (lastMove.y + 0.5) * CELL * z;
    const margin = 24;
    if (
      sx < margin ||
      sx > el.clientWidth - margin ||
      sy < margin ||
      sy > el.clientHeight - margin
    ) {
      centerOn(lastMove.x, lastMove.y);
    }
  }, [lastMove, centerOn]);

  const cellAt = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const { tx, ty, z } = viewRef.current;
    const x = Math.floor((clientX - rect.left - tx) / (CELL * z));
    const y = Math.floor((clientY - rect.top - ty) / (CELL * z));
    if (x < 0 || x >= CARO_SIZE || y < 0 || y >= CARO_SIZE) return null;
    return { x, y };
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    panRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseTx: viewRef.current.tx,
      baseTy: viewRef.current.ty,
      panning: false,
    };
    try {
      containerRef.current?.setPointerCapture(e.pointerId);
    } catch {
      // bỏ qua
    }
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const pan = panRef.current;
      if (pan && pan.pointerId === e.pointerId) {
        const dx = e.clientX - pan.startX;
        const dy = e.clientY - pan.startY;
        if (!pan.panning && Math.hypot(dx, dy) > 6) pan.panning = true;
        if (pan.panning) {
          setView((v) =>
            clampView({ z: v.z, tx: pan.baseTx + dx, ty: pan.baseTy + dy }),
          );
          setHover(null);
          return;
        }
      }
      setHover(cellAt(e.clientX, e.clientY));
    },
    [cellAt, clampView],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const pan = panRef.current;
      if (!pan || pan.pointerId !== e.pointerId) return;
      const wasPanning = pan.panning;
      panRef.current = null;
      if (wasPanning || !interactive) return;
      const cell = cellAt(e.clientX, e.clientY);
      if (!cell) return;
      if (movableColor !== "both" && movableColor !== turn) return;
      if (occupied.current.has(`${cell.x}.${cell.y}`)) return;
      onMove(caroUci(cell.x, cell.y));
    },
    [cellAt, interactive, movableColor, turn, onMove],
  );

  const zoomAt = useCallback(
    (factor: number, cx?: number, cy?: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = cx !== undefined ? cx - rect.left : el.clientWidth / 2;
      const py = cy !== undefined ? cy - rect.top : el.clientHeight / 2;
      setView((v) => {
        const z = Math.min(MAX_Z, Math.max(MIN_Z, v.z * factor));
        const scale = z / v.z;
        return clampView({
          z,
          tx: px - (px - v.tx) * scale,
          ty: py - (py - v.ty) * scale,
        });
      });
    },
    [clampView],
  );

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      zoomAt(e.deltaY < 0 ? 1.18 : 1 / 1.18, e.clientX, e.clientY);
    },
    [zoomAt],
  );

  const winSet = new Set((winLine ?? []).map((c) => `${c.x}.${c.y}`));
  const canPlace =
    interactive &&
    (movableColor === "both" || movableColor === turn) &&
    hover !== null &&
    !occupied.current.has(`${hover.x}.${hover.y}`);

  const stoneGlyph = (color: CaroColor) => (color === "x" ? "✕" : "○");
  const stoneColor = (color: CaroColor) => (color === "x" ? "#B4553C" : "#22262C");

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none overflow-hidden rounded-[8px] border border-line"
      style={{
        height: "min(66vh, 560px)",
        background: "var(--boxwood)",
        touchAction: "none",
        cursor: panRef.current?.panning ? "grabbing" : "crosshair",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        panRef.current = null;
      }}
      onPointerLeave={() => setHover(null)}
      onWheel={onWheel}
    >
      {/* thế giới 200×200 — lưới bằng gradient, chỉ quân được render */}
      <div
        className="absolute left-0 top-0"
        style={{
          width: WORLD,
          height: WORLD,
          transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.z})`,
          transformOrigin: "0 0",
          backgroundImage:
            "repeating-linear-gradient(to right, rgba(110,79,53,0.35) 0 1px, transparent 1px 28px)," +
            "repeating-linear-gradient(to bottom, rgba(110,79,53,0.35) 0 1px, transparent 1px 28px)",
          boxShadow: "inset 0 0 0 2px #6E4F35",
        }}
      >
        {/* chấm mốc giữa bàn */}
        <span
          className="absolute rounded-full"
          style={{
            left: 100 * CELL - 3,
            top: 100 * CELL - 3,
            width: 6,
            height: 6,
            background: "#6E4F35",
            opacity: 0.6,
          }}
        />
        {/* ô thắng */}
        {(winLine ?? []).map((c) => (
          <span
            key={`w-${c.x}.${c.y}`}
            className="absolute"
            style={{
              left: c.x * CELL,
              top: c.y * CELL,
              width: CELL,
              height: CELL,
              background: "color-mix(in srgb, var(--brass) 35%, transparent)",
            }}
          />
        ))}
        {/* nước vừa đi */}
        {lastMove && !winSet.has(`${lastMove.x}.${lastMove.y}`) && (
          <span
            className="absolute"
            style={{
              left: lastMove.x * CELL,
              top: lastMove.y * CELL,
              width: CELL,
              height: CELL,
              boxShadow: "inset 0 0 0 2px var(--brass)",
            }}
          />
        )}
        {/* gợi ý */}
        {hint && (
          <span
            className="absolute"
            style={{
              left: hint.x * CELL,
              top: hint.y * CELL,
              width: CELL,
              height: CELL,
              background: "color-mix(in srgb, var(--sage) 35%, transparent)",
            }}
          />
        )}
        {/* quân */}
        {stones.map((s) => (
          <span
            key={s.uci}
            className="absolute flex items-center justify-center font-bold"
            style={{
              left: s.x * CELL,
              top: s.y * CELL,
              width: CELL,
              height: CELL,
              color: stoneColor(s.color),
              fontSize: CELL * 0.68,
              lineHeight: 1,
            }}
          >
            {stoneGlyph(s.color)}
          </span>
        ))}
        {/* quân mờ tại ô đang trỏ */}
        {canPlace && hover && (
          <span
            className="absolute flex items-center justify-center font-bold"
            style={{
              left: hover.x * CELL,
              top: hover.y * CELL,
              width: CELL,
              height: CELL,
              color: stoneColor(turn),
              opacity: 0.35,
              fontSize: CELL * 0.68,
              lineHeight: 1,
            }}
          >
            {stoneGlyph(turn)}
          </span>
        )}
      </div>

      {/* điều khiển góc */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
        {(
          [
            ["+", () => zoomAt(1.25)],
            ["−", () => zoomAt(1 / 1.25)],
            [
              "⌖",
              () => {
                const t = lastMove ?? { x: 100, y: 100 };
                centerOn(t.x, t.y);
              },
            ],
          ] as const
        ).map(([label, fn]) => (
          <button
            key={label}
            type="button"
            aria-label={
              label === "+" ? "Phóng to" : label === "−" ? "Thu nhỏ" : "Về nước mới nhất"
            }
            className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-line bg-slate text-sm text-parchment transition-colors hover:border-brass"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={fn}
          >
            {label}
          </button>
        ))}
      </div>

      {/* toạ độ ô đang trỏ */}
      {hover && (
        <span className="absolute bottom-3 left-3 rounded-[6px] border border-line bg-slate px-2 py-0.5 font-[family-name:var(--font-mono)] text-xs text-muted">
          {hover.x}.{hover.y}
        </span>
      )}
    </div>
  );
}
