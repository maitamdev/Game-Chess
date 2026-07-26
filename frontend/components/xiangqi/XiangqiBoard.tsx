"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { XqColor, XqMove } from "@/lib/xiangqi/rules";
import { XQ_PIECE_CHARS, XQ_PIECE_NAMES, xqCoords } from "@/lib/xiangqi/rules";
import type { TrackedXqPiece } from "@/lib/xiangqi/tracker";

/**
 * Bàn cờ tướng tự dựng: quân đứng trên GIAO ĐIỂM 9×10, sông giữa bàn,
 * cung có gạch chéo. Tương tác nhấp-chọn + kéo-thả, xoay 180° cho bên đen,
 * các trạng thái ô cùng ngôn ngữ thị giác với bàn cờ vua (mục 10, 11).
 */

export interface XiangqiBoardProps {
  pieces: TrackedXqPiece[];
  turn: XqColor;
  orientation: "red" | "black";
  interactive: boolean;
  movableColor: XqColor | "both" | null;
  legalMovesFrom: (square: string) => XqMove[];
  onMove: (from: string, to: string) => void;
  lastMove: { from: string; to: string } | null;
  checkSquare: string | null;
  hint?: { from: string; to: string } | null;
}

interface DragState {
  from: string;
  x: number;
  y: number;
  over: string | null;
}

interface DyingPiece extends TrackedXqPiece {
  diedAt: number;
  /** góc counter-rotate tại thời điểm bị ăn — xoay tiếp theo bàn khi tự xoay */
  bornRotate: number;
}

const MOVE_EASE: [number, number, number, number] = [0.2, 0.8, 0.3, 1];
const FLIP_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

/** Toạ độ phần trăm của giao điểm (hệ chưa xoay, đỏ ở dưới). */
function pos(square: string): { left: string; top: string } {
  const { rank, file } = xqCoords(square);
  return {
    left: `${((file + 0.5) / 9) * 100}%`,
    top: `${((9 - rank + 0.5) / 10) * 100}%`,
  };
}

function GridSvg() {
  const lines: React.ReactNode[] = [];
  const x = (f: number) => 5 + f * 10;
  const y = (vr: number) => 5 + vr * 10; // vr 0 = hàng trên (rank 9)
  // ngang
  for (let vr = 0; vr < 10; vr++) {
    lines.push(
      <line key={`h${vr}`} x1={x(0)} y1={y(vr)} x2={x(8)} y2={y(vr)} />,
    );
  }
  // dọc: cột biên liền mạch, cột giữa đứt ở sông (giữa vr 4 và 5)
  for (let f = 0; f < 9; f++) {
    if (f === 0 || f === 8) {
      lines.push(<line key={`v${f}`} x1={x(f)} y1={y(0)} x2={x(f)} y2={y(9)} />);
    } else {
      lines.push(
        <line key={`v${f}a`} x1={x(f)} y1={y(0)} x2={x(f)} y2={y(4)} />,
        <line key={`v${f}b`} x1={x(f)} y1={y(5)} x2={x(f)} y2={y(9)} />,
      );
    }
  }
  // gạch chéo cung hai bên
  lines.push(
    <line key="p1" x1={x(3)} y1={y(0)} x2={x(5)} y2={y(2)} />,
    <line key="p2" x1={x(5)} y1={y(0)} x2={x(3)} y2={y(2)} />,
    <line key="p3" x1={x(3)} y1={y(7)} x2={x(5)} y2={y(9)} />,
    <line key="p4" x1={x(5)} y1={y(7)} x2={x(3)} y2={y(9)} />,
  );
  return (
    <svg
      viewBox="0 0 90 100"
      className="absolute inset-0 h-full w-full"
      aria-hidden
      preserveAspectRatio="none"
    >
      <g stroke="#8a6a44" strokeWidth={0.5} strokeLinecap="round">
        {lines}
      </g>
      <rect
        x={4}
        y={4}
        width={82}
        height={92}
        fill="none"
        stroke="#6E4F35"
        strokeWidth={1.1}
      />
      <text
        x={26}
        y={51.6}
        fontSize={4.6}
        fill="#6E4F35"
        opacity={0.55}
        fontFamily="serif"
      >
        楚 河
      </text>
      <text
        x={53}
        y={51.6}
        fontSize={4.6}
        fill="#6E4F35"
        opacity={0.55}
        fontFamily="serif"
      >
        漢 界
      </text>
    </svg>
  );
}

export default function XiangqiBoard({
  pieces,
  turn,
  orientation,
  interactive,
  movableColor,
  legalMovesFrom,
  onMove,
  lastMove,
  checkSquare,
  hint,
}: XiangqiBoardProps) {
  const reduced = useReducedMotion();
  const boardRef = useRef<HTMLDivElement>(null);
  const rotated = orientation === "black";

  const [selected, setSelected] = useState<string | null>(null);
  const [targets, setTargets] = useState<Map<string, XqMove>>(new Map());
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dying, setDying] = useState<DyingPiece[]>([]);

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
    const map = new Map<string, TrackedXqPiece>();
    for (const p of pieces) map.set(p.square, p);
    return map;
  }, [pieces]);

  const clearSelection = useCallback(() => {
    setSelected(null);
    setTargets(new Map());
  }, []);

  // góc counter-rotate của LẦN RENDER TRƯỚC — quân bị ăn trong nước có tự
  // xoay phải khởi đầu ở góc cũ rồi xoay cùng bàn, không nhảy phắt 180°
  const prevRotatedRef = useRef(rotated);

  // quân bị ăn: giữ 140ms cho hoạt ảnh thu nhỏ + mờ dần
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
    // thế cờ đổi từ bên ngoài (undo/tua/nước đối thủ) → xoá lựa chọn cũ
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
    (piece: TrackedXqPiece | undefined): piece is TrackedXqPiece => {
      if (!interactive || !piece) return false;
      if (piece.color !== turn) return false;
      return movableColor === "both" || movableColor === piece.color;
    },
    [interactive, turn, movableColor],
  );

  const select = useCallback(
    (square: string) => {
      setSelected(square);
      const map = new Map<string, XqMove>();
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

  // con trỏ → toạ độ cục bộ (bù transform thực tế, kể cả giữa hoạt ảnh xoay)
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
      const file = Math.round((pt.x / pt.w) * 9 - 0.5);
      const vRow = Math.round((pt.y / pt.h) * 10 - 0.5);
      const rank = 9 - vRow;
      if (file < 0 || file > 8 || rank < 0 || rank > 9) return null;
      return `${"abcdefghi"[file]}${rank}`;
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
          // bỏ qua pointer không hợp lệ
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
      setDrag({ from: arm.from, x: pt.x, y: pt.y, over: squareAt(e) });
    },
    [localPoint, squareAt],
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

  const renderDisc = (p: { type: TrackedXqPiece["type"]; color: XqColor }) => (
    <span
      className="flex h-full w-full select-none items-center justify-center rounded-full"
      style={{
        background: "#F2E8CF",
        border: `2px solid ${p.color === "r" ? "#B4553C" : "#22262C"}`,
        boxShadow: "inset 0 0 0 2px #E9DCC0",
        color: p.color === "r" ? "#B4553C" : "#22262C",
        fontFamily: '"Noto Serif SC", "SimSun", serif',
        fontWeight: 700,
        lineHeight: 1,
        containerType: "size",
      }}
    >
      {/* cỡ chữ theo kích thước đĩa quân (container query) */}
      <span style={{ fontSize: "56cqw" }}>{XQ_PIECE_CHARS[p.color][p.type]}</span>
    </span>
  );

  // kích thước quân: 88% một ô ngang (1/9 bàn)
  const pieceSize = `${(0.88 / 9) * 100}%`;

  const marker = (square: string, node: React.ReactNode, z = 5) => {
    const { left, top } = pos(square);
    return (
      <div
        key={`mk-${square}-${z}`}
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
      className="relative"
      style={{
        width: "min(66vh, 560px)",
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      <motion.div
        ref={boardRef}
        className="relative w-full overflow-hidden rounded-[8px] border border-line select-none"
        style={{ aspectRatio: "9 / 10", background: "var(--boxwood)", touchAction: "none" }}
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
        <GridSvg />

        {/* trạng thái giao điểm */}
        {lastMove &&
          marker(
            lastMove.from,
            <span
              className="block h-full w-full rounded-full"
              style={{ background: "var(--brass)", opacity: 0.25 }}
            />,
            3,
          )}
        {lastMove &&
          marker(
            lastMove.to,
            <span
              className="block h-full w-full rounded-full"
              style={{ border: "3px solid var(--brass)", opacity: 0.7 }}
            />,
            3,
          )}
        {hint &&
          [hint.from, hint.to].map((sq) =>
            marker(
              sq,
              <span
                className="block h-full w-full rounded-full"
                style={{ background: "var(--sage)", opacity: 0.3 }}
              />,
              3,
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
        {checkSquare &&
          marker(
            checkSquare,
            <span
              key={`chk-${checkSquare}-${lastMove?.to ?? ""}`}
              className="check-overlay block h-full w-full rounded-full"
            />,
            4,
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
              )
            : marker(
                sq,
                <span
                  className="absolute left-1/2 top-1/2 h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ background: "var(--sage)" }}
                />,
                12,
              ),
        )}
        {drag?.over &&
          marker(
            drag.over,
            <span
              className="block h-full w-full rounded-full"
              style={{
                boxShadow:
                  "0 0 0 3px color-mix(in srgb, var(--parchment) 60%, transparent)",
              }}
            />,
            12,
          )}

        {/* quân cờ */}
        {pieces.map((p) => {
          const { left, top } = pos(p.square);
          const isDragging = drag?.from === p.square;
          return (
            <motion.div
              key={p.id}
              className="pointer-events-none absolute"
              style={{
                width: pieceSize,
                aspectRatio: "1",
                zIndex: 10,
                opacity: isDragging ? 0.3 : 1,
              }}
              initial={false}
              animate={{ left, top, rotate: counterRotate }}
              transition={{
                left: {
                  duration: reduced || instantIdRef.current === p.id ? 0 : 0.18,
                  ease: MOVE_EASE,
                },
                top: {
                  duration: reduced || instantIdRef.current === p.id ? 0 : 0.18,
                  ease: MOVE_EASE,
                },
                rotate: { duration: reduced ? 0 : 0.4, ease: FLIP_EASE },
              }}
              // đặt tâm quân vào giao điểm
              transformTemplate={(_, generated) =>
                `translate(-50%, -50%) ${generated}`
              }
              aria-label={`${XQ_PIECE_NAMES[p.type]} ${p.color === "r" ? "đỏ" : "đen"} ${p.square}`}
            >
              {renderDisc(p)}
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
              transformTemplate={(_, generated) =>
                `translate(-50%, -50%) ${generated}`
              }
            >
              {renderDisc(p)}
            </motion.div>
          );
        })}

        {/* quân đang kéo */}
        {drag && dragPiece && (
          <div
            className="pointer-events-none absolute"
            style={{
              left: drag.x,
              top: drag.y,
              width: pieceSize,
              aspectRatio: "1",
              transform: `translate(-50%, -50%) scale(1.1) rotate(${counterRotate}deg)`,
              zIndex: 30,
            }}
          >
            {renderDisc(dragPiece)}
          </div>
        )}
      </motion.div>
    </div>
  );
}
