"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion } from "framer-motion";
import { CastleTurret } from "@phosphor-icons/react";
import JunglePiece from "@/components/jungle/JunglePiece";
import {
  JG_DEN,
  JG_NAMES,
  JG_TRAPS,
  JG_WATER,
  jgCoords,
  jgSquare,
  type JgColor,
  type JgMove,
  type JgRank,
} from "@/lib/jungle/rules";

/**
 * Bàn cờ thú 7×9 - rừng, sông gợn sóng, bẫy khắc chéo, hang phát sáng.
 * Tương tác nhấp-chọn + kéo-thả, xoay 180° cho bên Xanh, hoạt ảnh
 * trượt/ăn quân cùng ngôn ngữ với các bàn khác.
 */

export interface JgTrackedPiece {
  id: string;
  rank: JgRank;
  color: JgColor;
  square: string;
}

export interface JungleBoardProps {
  pieces: JgTrackedPiece[];
  turn: JgColor;
  orientation: "red" | "blue";
  interactive: boolean;
  movableColor: JgColor | "both" | null;
  legalMovesFrom: (square: string) => JgMove[];
  onMove: (from: string, to: string) => void;
  lastMove: { from: string; to: string } | null;
  hint?: { from: string; to: string } | null;
}

const MOVE_EASE: [number, number, number, number] = [0.2, 0.8, 0.3, 1];
const FLIP_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

const RED = "#B4553C";
const BLUE = "#3F6C8C";

function pos(square: string): { left: string; top: string } {
  const { rank, file } = jgCoords(square);
  return {
    left: `${((file + 0.5) / 7) * 100}%`,
    top: `${((8 - rank + 0.5) / 9) * 100}%`,
  };
}

interface DragState {
  from: string;
  over: string | null;
}

interface DyingPiece extends JgTrackedPiece {
  diedAt: number;
  bornRotate: number;
}

/** Nền ô: rừng / sông / bẫy / hang. */
function SquareBg({ index }: { index: number }) {
  const r = Math.floor(index / 7);
  const f = index % 7;
  const isWater = JG_WATER.has(index);
  const isDenR = index === JG_DEN.r;
  const isDenB = index === JG_DEN.b;
  const isTrap = JG_TRAPS.r.has(index) || JG_TRAPS.b.has(index);

  if (isWater) {
    return (
      <div className="jg-water-square h-full w-full">
        <span className="jg-water-ripple" />
      </div>
    );
  }

  const base = (r + f) % 2 === 0 ? "#806A4D" : "#755E43";

  if (isDenR || isDenB) {
    return (
      <div
        className="jg-den-square flex h-full w-full items-center justify-center"
        style={{
          "--jg-den-accent": isDenR ? RED : BLUE,
          background: `radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--brass) 25%, ${base}) 0%, ${base} 76%)`,
        } as React.CSSProperties}
      >
        <CastleTurret
          aria-hidden
          weight="duotone"
          className="h-[44%] w-[44%]"
          style={{
            color: isDenR ? "#D77B64" : "#74A0BF",
            filter: "drop-shadow(0 2px 3px rgba(16, 10, 5, .32))",
          }}
        />
      </div>
    );
  }

  if (isTrap) {
    const trapColor = JG_TRAPS.r.has(index) ? RED : BLUE;
    return (
      <div
        className="jg-trap-square h-full w-full"
        style={{
          "--jg-trap-accent": trapColor,
          backgroundColor: base,
        } as React.CSSProperties}
      >
        <span aria-hidden className="jg-trap-mark" />
      </div>
    );
  }

  return (
    <div
      className="jg-land-square h-full w-full"
      style={{ "--jg-land": base } as React.CSSProperties}
    />
  );
}

export default function JungleBoard({
  pieces,
  turn,
  orientation,
  interactive,
  movableColor,
  legalMovesFrom,
  onMove,
  lastMove,
  hint,
}: JungleBoardProps) {
  const reduced = useReducedMotion();
  const boardRef = useRef<HTMLDivElement>(null);
  const rotated = orientation === "blue";

  const [selected, setSelected] = useState<string | null>(null);
  const [targets, setTargets] = useState<Map<string, JgMove>>(new Map());
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dying, setDying] = useState<DyingPiece[]>([]);
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  const dragArmRef = useRef<{
    from: string;
    pointerId: number;
    startX: number;
    startY: number;
    wasSelected: boolean;
    dragging: boolean;
  } | null>(null);
  const instantIdRef = useRef<string | null>(null);

  const pieceAt = useMemo(() => {
    const map = new Map<string, JgTrackedPiece>();
    for (const p of pieces) map.set(p.square, p);
    return map;
  }, [pieces]);

  const clearSelection = useCallback(() => {
    setSelected(null);
    setTargets(new Map());
  }, []);

  const prevRotatedRef = useRef(rotated);
  const prevPiecesRef = useRef(pieces);
  const dyingTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  useEffect(() => {
    const timers = dyingTimersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);
  useEffect(() => {
    const prev = prevPiecesRef.current;
    prevPiecesRef.current = pieces;
    if (prev === pieces) return;
    setSelected(null);
    setTargets(new Map());
    dragArmRef.current = null;
    setDrag(null);
    const currentIds = new Set(pieces.map((p) => p.id));
    const removed = prev.filter((p) => !currentIds.has(p.id));
    if (removed.length === 0) return;
    const now = Date.now();
    const removedIds = new Set(removed.map((p) => p.id));
    const bornRotate = prevRotatedRef.current ? 180 : 0;
    setDying((d) => [
      ...d.filter((p) => !removedIds.has(p.id) && !currentIds.has(p.id)),
      ...removed.map((p) => ({ ...p, diedAt: now, bornRotate })),
    ]);
    const timer = setTimeout(() => {
      dyingTimersRef.current.delete(timer);
      setDying((d) => d.filter((p) => Date.now() - p.diedAt < 150));
    }, 160);
    dyingTimersRef.current.add(timer);
  }, [pieces]);
  useEffect(() => {
    prevRotatedRef.current = rotated;
  });

  useEffect(() => {
    if (!interactive) {
      dragArmRef.current = null;
      setDrag(null);
      clearSelection();
    }
  }, [interactive, clearSelection]);

  const canSelect = useCallback(
    (piece: JgTrackedPiece | undefined): piece is JgTrackedPiece => {
      if (!interactive || !piece) return false;
      if (piece.color !== turn) return false;
      return movableColor === "both" || movableColor === piece.color;
    },
    [interactive, turn, movableColor],
  );

  const select = useCallback(
    (square: string) => {
      setSelected(square);
      const map = new Map<string, JgMove>();
      for (const m of legalMovesFrom(square)) map.set(m.to, m);
      setTargets(map);
    },
    [legalMovesFrom],
  );

  const attemptMove = useCallback(
    (from: string, to: string, instant: boolean) => {
      if (!targets.has(to)) return;
      if (instant) instantIdRef.current = pieceAt.get(from)?.id ?? null;
      clearSelection();
      onMove(from, to);
    },
    [targets, pieceAt, onMove, clearSelection],
  );

  const localPoint = useCallback((e: { clientX: number; clientY: number }) => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const transform = getComputedStyle(el).transform;
    if (transform && transform !== "none") {
      const p = new DOMMatrix(transform).inverse().transformPoint(new DOMPoint(dx, dy));
      dx = p.x;
      dy = p.y;
    }
    return { x: w / 2 + dx, y: h / 2 + dy, w, h };
  }, []);

  const squareAt = useCallback(
    (e: { clientX: number; clientY: number }): string | null => {
      const pt = localPoint(e);
      if (!pt) return null;
      const file = Math.floor((pt.x / pt.w) * 7);
      const vRow = Math.floor((pt.y / pt.h) * 9);
      const rank = 8 - vRow;
      if (file < 0 || file > 6 || rank < 0 || rank > 8) return null;
      return jgSquare(rank, file);
    },
    [localPoint],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!interactive || e.button !== 0) return;
      const sq = squareAt(e);
      if (!sq) return;
      if (selected && targets.has(sq)) {
        attemptMove(selected, sq, false);
        return;
      }
      const piece = pieceAt.get(sq);
      if (canSelect(piece)) {
        const wasSelected = selected === sq;
        select(sq);
        dragArmRef.current = {
          from: sq,
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          wasSelected,
          dragging: false,
        };
        try {
          boardRef.current?.setPointerCapture(e.pointerId);
        } catch {
          // bỏ qua
        }
      } else {
        clearSelection();
      }
    },
    [interactive, squareAt, selected, targets, pieceAt, canSelect, select, attemptMove, clearSelection],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const arm = dragArmRef.current;
      if (!arm || arm.pointerId !== e.pointerId) return;
      if (!arm.dragging) {
        if (Math.hypot(e.clientX - arm.startX, e.clientY - arm.startY) < 5) return;
        arm.dragging = true;
      }
      const pt = localPoint(e);
      if (!pt) return;
      dragX.set(pt.x);
      dragY.set(pt.y);
      const over = squareAt(e);
      setDrag((current) => {
        if (current?.from === arm.from && current.over === over) return current;
        return { from: arm.from, over };
      });
    },
    [localPoint, squareAt, dragX, dragY],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const arm = dragArmRef.current;
      if (!arm || arm.pointerId !== e.pointerId) return;
      dragArmRef.current = null;
      if (arm.dragging) {
        const drop = squareAt(e);
        if (drop && drop !== arm.from && targets.has(drop)) {
          attemptMove(arm.from, drop, true);
        }
        setDrag(null);
        return;
      }
      if (arm.wasSelected) clearSelection();
    },
    [squareAt, targets, attemptMove, clearSelection],
  );

  useEffect(() => {
    instantIdRef.current = null;
  });

  const dragPiece = drag ? pieceAt.get(drag.from) : undefined;
  const counterRotate = rotated ? 180 : 0;
  const pieceSize = `${(0.82 / 7) * 100}%`;

  const renderDisc = (p: { rank: JgRank; color: JgColor }) => {
    return <JunglePiece rank={p.rank} color={p.color} className="h-full w-full" />;
  };

  const marker = (square: string, node: React.ReactNode, z = 5, key?: string) => {
    const { left, top } = pos(square);
    return (
      <div
        key={key ?? `mk-${square}-${z}`}
        className="pointer-events-none absolute"
        style={{
          left,
          top,
          width: pieceSize,
          aspectRatio: "1",
          transform: "translate(-50%, -50%)",
          zIndex: z,
        }}
      >
        {node}
      </div>
    );
  };

  return (
    <div
      className="jg-board-wrap relative w-full"
      style={{
        width: "calc(min(68dvh, 690px) * 7 / 9)",
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      <motion.div
        ref={boardRef}
        className="jg-board relative w-full overflow-hidden select-none"
        style={{ aspectRatio: "7 / 9", touchAction: "none" }}
        initial={false}
        animate={{ rotate: rotated ? 180 : 0 }}
        transition={{ duration: reduced ? 0 : 0.4, ease: FLIP_EASE }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragArmRef.current = null;
          setDrag(null);
        }}
      >
        {/* nền 63 ô */}
        <div className="grid h-full w-full grid-cols-7 grid-rows-9">
          {Array.from({ length: 63 }, (_, cell) => {
            const vRow = Math.floor(cell / 7);
            const f = cell % 7;
            const r = 8 - vRow;
            return (
              <div key={cell} className="jg-square relative">
                <SquareBg index={r * 7 + f} />
              </div>
            );
          })}
        </div>

        {/* trạng thái ô */}
        {lastMove &&
          [lastMove.from, lastMove.to].map((sq, i) =>
            marker(
              sq,
              <span
                className="block h-full w-full rounded-[6px]"
                style={{ background: "var(--brass)", opacity: 0.3 }}
              />,
              3,
              `lm-${i}`,
            ),
          )}
        {hint &&
          [hint.from, hint.to].map((sq, i) =>
            marker(
              sq,
              <span
                className="block h-full w-full rounded-[6px]"
                style={{ background: "var(--sage)", opacity: 0.35 }}
              />,
              3,
              `hint-${i}`,
            ),
          )}
        {selected &&
          marker(
            selected,
            <span
              className="block h-full w-full rounded-full"
              style={{ border: "3px solid var(--brass)" }}
            />,
            6,
          )}
        {[...targets.keys()].map((sq) =>
          pieceAt.has(sq)
            ? marker(
                sq,
                <span
                  className="block h-full w-full rounded-full"
                  style={{ border: "4px solid var(--sage)" }}
                />,
                12,
                `t-${sq}`,
              )
            : marker(
                sq,
                <span
                  className="absolute left-1/2 top-1/2 h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ background: "var(--sage)" }}
                />,
                12,
                `t-${sq}`,
              ),
        )}
        {drag?.over &&
          marker(
            drag.over,
            <span
              className="block h-full w-full rounded-[6px]"
              style={{
                boxShadow:
                  "inset 0 0 0 3px color-mix(in srgb, var(--parchment) 60%, transparent)",
              }}
            />,
            12,
          )}

        {/* thú */}
        {pieces.map((p) => {
          const { left, top } = pos(p.square);
          const isDragging = drag?.from === p.square;
          const isSelected = selected === p.square;
          return (
            <motion.div
              key={p.id}
              layout="position"
              layoutDependency={p.square}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left,
                top,
                width: pieceSize,
                aspectRatio: "1",
                zIndex: 10,
                opacity: isDragging ? 0.3 : 1,
              }}
              initial={false}
              transition={{
                layout: {
                  duration: reduced || instantIdRef.current === p.id ? 0 : 0.18,
                  ease: MOVE_EASE,
                },
              }}
              aria-label={`${JG_NAMES[p.rank]} ${p.color === "r" ? "đỏ" : "xanh"} ${p.square}`}
            >
              <motion.div
                className="h-full w-full"
                initial={false}
                animate={{
                  rotate: counterRotate,
                  scale: isSelected ? 1.055 : 1,
                }}
                transition={{
                  rotate: { duration: reduced ? 0 : 0.4, ease: FLIP_EASE },
                  scale: { duration: reduced ? 0 : 0.14, ease: MOVE_EASE },
                }}
              >
                {renderDisc(p)}
              </motion.div>
            </motion.div>
          );
        })}
        {dying.map((p) => {
          const { left, top } = pos(p.square);
          return (
            <motion.div
              key={`dying-${p.id}`}
              className="pointer-events-none absolute"
              style={{ width: pieceSize, aspectRatio: "1", left, top, zIndex: 8 }}
              initial={{ scale: 1, opacity: 1, rotate: p.bornRotate }}
              animate={{ scale: 0.6, opacity: 0, rotate: counterRotate }}
              transition={{
                rotate: { duration: reduced ? 0 : 0.4, ease: FLIP_EASE },
                default: { duration: reduced ? 0 : 0.14 },
              }}
              transformTemplate={(_, generated) => `translate(-50%, -50%) ${generated}`}
            >
              {renderDisc(p)}
            </motion.div>
          );
        })}

        {/* thú đang kéo */}
        {drag && dragPiece && (
          <motion.div
            className="pointer-events-none absolute"
            style={{
              left: dragX,
              top: dragY,
              width: pieceSize,
              aspectRatio: "1",
              transform: `translate(-50%, -50%) scale(1.1) rotate(${counterRotate}deg)`,
              zIndex: 30,
            }}
          >
            {renderDisc(dragPiece)}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
