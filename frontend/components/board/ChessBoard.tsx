"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Color, Move, PieceSymbol, Square as SquareName } from "chess.js";
import type { TrackedPiece } from "@/lib/types";
import { PIECE_NAMES } from "@/lib/types";
import Piece, { FLIP_EASE, fileOf, pieceSrc, rankOf } from "./Piece";
import Square from "./Square";
import PromotionDialog from "./PromotionDialog";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

export interface ChessBoardProps {
  pieces: TrackedPiece[];
  turn: Color;
  orientation: "white" | "black";
  /** Cho phép người dùng thao tác (đang ở thế cờ hiện tại, ván đang diễn ra) */
  interactive: boolean;
  /** Bên được phép đi từ bàn này: 'both' cho 2 người 1 máy */
  movableColor: Color | "both" | null;
  legalMovesFrom: (square: SquareName) => Move[];
  onMove: (from: SquareName, to: SquareName, promotion?: PieceSymbol) => void;
  lastMove: { from: SquareName; to: SquareName } | null;
  /** Ô vua đang bị chiếu, nếu có */
  checkSquare: SquareName | null;
  /** Nước gợi ý từ engine - tô sáng hai ô */
  hint?: { from: SquareName; to: SquareName } | null;
  /** Cho phép đặt nước đi trước lượt cho màu này khi chưa tới lượt họ (mục 5.3) */
  premoveColor?: Color | null;
  premove?: { from: SquareName; to: SquareName } | null;
  onPremove?: (from: SquareName, to: SquareName, promotion?: PieceSymbol) => void;
  onPremoveCancel?: () => void;
  /** Các nước "giả định" cho premove (tính trên thế cờ đảo lượt) */
  premoveMovesFrom?: (square: SquareName) => Move[];
}

interface DragState {
  from: SquareName;
  x: number; // px, toạ độ cục bộ (đã bù xoay 180°)
  y: number;
  over: SquareName | null;
}

interface PromotionState {
  from: SquareName;
  to: SquareName;
  color: Color;
  instant: boolean;
}

interface DyingPiece extends TrackedPiece {
  diedAt: number;
  bornRotate: number;
}

export default function ChessBoard({
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
  premoveColor,
  premove,
  onPremove,
  onPremoveCancel,
  premoveMovesFrom,
}: ChessBoardProps) {
  const reduced = useReducedMotion();
  const boardRef = useRef<HTMLDivElement>(null);
  const rotated = orientation === "black";

  const [selected, setSelected] = useState<SquareName | null>(null);
  const [targets, setTargets] = useState<Map<SquareName, Move[]>>(new Map());
  const [drag, setDrag] = useState<DragState | null>(null);
  const [promotion, setPromotion] = useState<PromotionState | null>(null);
  const [dying, setDying] = useState<DyingPiece[]>([]);

  const dragArmRef = useRef<{
    from: SquareName;
    pointerId: number;
    startX: number;
    startY: number;
    wasSelected: boolean;
    dragging: boolean;
  } | null>(null);
  const instantIdRef = useRef<string | null>(null);

  const pieceAt = useMemo(() => {
    const map = new Map<SquareName, TrackedPiece>();
    for (const p of pieces) map.set(p.square, p);
    return map;
  }, [pieces]);

  // Góc counter-rotate của lần render trước - quân bị ăn trong nước có
  // tự xoay phải khởi đầu ở góc cũ rồi xoay cùng bàn.
  const prevRotatedRef = useRef(rotated);

  // Quân bị ăn: giữ lại 140ms để hoạt ảnh thu nhỏ + mờ dần.
  // Timer không bị hủy theo vòng đời effect (tránh entry kẹt lại khi có
  // nước đi kế tiếp trong 160ms - ví dụ tua nhanh lịch sử); chỉ dọn khi unmount.
  const prevPiecesRef = useRef<TrackedPiece[]>(pieces);
  const dyingTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  useEffect(() => {
    const timers = dyingTimersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);
  useEffect(() => {
    const prev = prevPiecesRef.current;
    prevPiecesRef.current = pieces;
    if (prev === pieces) return;
    // thế cờ đổi (nước đi/undo/tua/nước đối thủ) → lựa chọn cũ hết hiệu lực
    setSelected(null);
    setTargets(new Map());
    dragArmRef.current = null;
    setDrag(null);
    setPromotion(null);
    const currentIds = new Set(pieces.map((p) => p.id));
    const removed = prev.filter((p) => !currentIds.has(p.id));
    if (removed.length === 0) return;
    const now = Date.now();
    const removedIds = new Set(removed.map((p) => p.id));
    const bornRotate = prevRotatedRef.current ? 180 : 0;
    setDying((d) => [
      // loại entry trùng id (tua qua cùng nước ăn quân hai lần) và entry
      // của quân đã quay lại bàn (undo) để không trùng key
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

  const clearSelection = useCallback(() => {
    setSelected(null);
    setTargets(new Map());
  }, []);

  // Ván kết thúc / mất quyền thao tác giữa lúc kéo quân → huỷ thao tác
  useEffect(() => {
    if (!interactive) {
      dragArmRef.current = null;
      setDrag(null);
      setPromotion(null);
      clearSelection();
    }
  }, [interactive, clearSelection]);

  const canSelect = useCallback(
    (piece: TrackedPiece | undefined): piece is TrackedPiece => {
      if (!interactive || !piece || promotion) return false;
      if (piece.color === turn) {
        return movableColor === "both" || movableColor === piece.color;
      }
      // chưa tới lượt: cho chọn quân mình để đặt premove
      return premoveColor != null && piece.color === premoveColor && !!onPremove;
    },
    [interactive, promotion, turn, movableColor, premoveColor, onPremove],
  );

  const select = useCallback(
    (square: SquareName) => {
      setSelected(square);
      const piece = pieceAt.get(square);
      const isPremoveSelect = piece != null && piece.color !== turn;
      const source = isPremoveSelect ? premoveMovesFrom : legalMovesFrom;
      const map = new Map<SquareName, Move[]>();
      for (const m of source?.(square) ?? []) {
        const list = map.get(m.to) ?? [];
        list.push(m);
        map.set(m.to, list);
      }
      setTargets(map);
    },
    [legalMovesFrom, premoveMovesFrom, pieceAt, turn],
  );

  const attemptMove = useCallback(
    (from: SquareName, to: SquareName, instant: boolean) => {
      const moves = targets.get(to);
      if (!moves || moves.length === 0) return;
      const piece = pieceAt.get(from);
      // Premove: quân được chọn không thuộc bên đang đi
      if (piece && piece.color !== turn) {
        clearSelection();
        // phong cấp trong premove mặc định thành Hậu
        onPremove?.(from, to, moves[0].promotion ? "q" : undefined);
        return;
      }
      if (moves[0].promotion) {
        setPromotion({ from, to, color: turn, instant });
        clearSelection();
        return;
      }
      if (instant) {
        instantIdRef.current = pieceAt.get(from)?.id ?? null;
      }
      clearSelection();
      onMove(from, to);
    },
    [targets, turn, pieceAt, onMove, onPremove, clearSelection],
  );

  // Toạ độ cục bộ từ sự kiện con trỏ. Bù xoay bằng ma trận transform
  // thực tế (nghịch đảo) thay vì cờ nhị phân - đúng cả khi bàn đang
  // ở góc trung gian giữa hoạt ảnh xoay 400ms.
  const localPoint = useCallback((e: { clientX: number; clientY: number }) => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const size = el.offsetWidth; // kích thước layout, không bị transform
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const transform = getComputedStyle(el).transform;
    if (transform && transform !== "none") {
      const p = new DOMMatrix(transform)
        .inverse()
        .transformPoint(new DOMPoint(dx, dy));
      dx = p.x;
      dy = p.y;
    }
    return { x: size / 2 + dx, y: size / 2 + dy, size };
  }, []);

  const squareAt = useCallback(
    (e: { clientX: number; clientY: number }): SquareName | null => {
      const pt = localPoint(e);
      if (!pt) return null;
      const f = Math.floor((pt.x / pt.size) * 8);
      const r = 7 - Math.floor((pt.y / pt.size) * 8);
      if (f < 0 || f > 7 || r < 0 || r > 7) return null;
      return `${FILES[f]}${r + 1}` as SquareName;
    },
    [localPoint],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!interactive || promotion || e.button !== 0) return;
      const sq = squareAt(e);
      if (!sq) return;

      // Đã chọn quân và nhấp vào ô đích hợp lệ → đi (nhấp chọn rồi nhấp đích)
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
          // pointerId không còn hoạt động (một số thiết bị cảm ứng) - bỏ qua
        }
      } else {
        clearSelection();
        // nhấp ra ngoài khi đang có premove → huỷ premove
        if (premove) onPremoveCancel?.();
      }
    },
    [
      interactive,
      promotion,
      squareAt,
      selected,
      targets,
      pieceAt,
      canSelect,
      select,
      attemptMove,
      clearSelection,
      premove,
      onPremoveCancel,
    ],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const arm = dragArmRef.current;
      if (!arm || arm.pointerId !== e.pointerId) return;
      if (!arm.dragging) {
        const dist = Math.hypot(e.clientX - arm.startX, e.clientY - arm.startY);
        if (dist < 5) return;
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
        // Thả ngoài ô hợp lệ: quân bật về, giữ nguyên lựa chọn
        setDrag(null);
        return;
      }

      // Nhấp lần hai vào quân đang chọn → bỏ chọn
      if (arm.wasSelected) clearSelection();
    },
    [squareAt, targets, attemptMove, clearSelection],
  );

  const onKeyActivate = useCallback(
    (sq: SquareName) => {
      if (!interactive || promotion) return;
      if (selected && targets.has(sq)) {
        attemptMove(selected, sq, false);
        return;
      }
      const piece = pieceAt.get(sq);
      if (canSelect(piece)) {
        if (selected === sq) clearSelection();
        else select(sq);
      } else {
        clearSelection();
      }
    },
    [
      interactive,
      promotion,
      selected,
      targets,
      pieceAt,
      canSelect,
      select,
      attemptMove,
      clearSelection,
    ],
  );

  const handlePromotionPick = useCallback(
    (p: PieceSymbol) => {
      if (!promotion) return;
      if (promotion.instant) {
        instantIdRef.current = pieceAt.get(promotion.from)?.id ?? null;
      }
      onMove(promotion.from, promotion.to, p);
      setPromotion(null);
    },
    [promotion, pieceAt, onMove],
  );

  // Xoá đánh dấu "đặt ngay" sau khi render nước đi đó
  useEffect(() => {
    instantIdRef.current = null;
  });

  const dragPiece = drag ? pieceAt.get(drag.from) : undefined;

  return (
    <div
      className="relative"
      style={{ width: "min(80vh, 640px)", maxWidth: "calc(100vw - 32px)" }}
    >
      <motion.div
        ref={boardRef}
        className="relative aspect-square w-full overflow-hidden rounded-[8px] border border-line select-none"
        style={{ touchAction: "none" }}
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
        {/* Lưới 64 ô */}
        <div className="grid h-full w-full grid-cols-8 grid-rows-8">
          {Array.from({ length: 64 }, (_, i) => {
            const f = i % 8;
            const r = 7 - Math.floor(i / 8); // hàng trên cùng là hàng 8
            const sq = `${FILES[f]}${r + 1}` as SquareName;
            const piece = pieceAt.get(sq);
            const target = targets.get(sq);
            const showFile = rotated ? r === 7 : r === 0;
            const showRank = rotated ? f === 7 : f === 0;
            return (
              <Square
                key={sq}
                square={sq}
                isLight={(f + r) % 2 === 1}
                isSelected={selected === sq}
                isLastMove={lastMove?.from === sq || lastMove?.to === sq}
                isCheck={checkSquare === sq}
                checkKey={`${checkSquare}-${lastMove?.to ?? ""}`}
                isLegalEmpty={!!target && !piece}
                isLegalCapture={!!target && !!piece}
                isDragHover={drag?.over === sq}
                isHint={hint?.from === sq || hint?.to === sq}
                isPremove={premove?.from === sq || premove?.to === sq}
                fileLabel={showFile ? FILES[f] : null}
                rankLabel={showRank ? String(r + 1) : null}
                counterRotated={rotated}
                ariaLabel={
                  piece
                    ? `${sq}, ${PIECE_NAMES[piece.type]} ${piece.color === "w" ? "trắng" : "đen"}`
                    : sq
                }
                onKeyActivate={onKeyActivate}
                onEscape={clearSelection}
              />
            );
          })}
        </div>

        {/* Lớp quân cờ */}
        <div className="pointer-events-none absolute inset-0">
          {pieces.map((p) => (
            <Piece
              key={p.id}
              piece={p}
              counterRotated={rotated}
              instant={instantIdRef.current === p.id}
              ghost={drag?.from === p.square}
            />
          ))}
          {dying.map((p) => (
            <Piece
              key={`dying-${p.id}`}
              piece={p}
              counterRotated={rotated}
              dying
              bornRotate={p.bornRotate}
            />
          ))}
          {/* Quân đang kéo: phóng to 1.1, bám theo con trỏ */}
          {drag && dragPiece && (
            <div
              className="pointer-events-none absolute"
              style={{
                left: drag.x,
                top: drag.y,
                width: "12.5%",
                height: "12.5%",
                transform: `translate(-50%, -50%) scale(1.1) ${rotated ? "rotate(180deg)" : ""}`,
                zIndex: 30,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pieceSrc(dragPiece)}
                alt=""
                draggable={false}
                className="h-full w-full"
              />
            </div>
          )}
        </div>
      </motion.div>

      {promotion && (
        <PromotionDialog
          color={promotion.color}
          square={promotion.to}
          orientation={orientation}
          onPick={handlePromotionPick}
          onCancel={() => setPromotion(null)}
        />
      )}
    </div>
  );
}
