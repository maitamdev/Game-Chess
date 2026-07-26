"use client";

import { useEffect, useMemo } from "react";
import { Chess, type PieceSymbol, type Square } from "chess.js";
import { useGameStore } from "@/stores/gameStore";
import { trackPieces } from "./pieceTracker";

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

/** Trạng thái suy ra từ store cho thế cờ đang xem (viewIndex). */
export function useGameDerived() {
  const moves = useGameStore((s) => s.moves);
  const fens = useGameStore((s) => s.fens);
  const viewIndex = useGameStore((s) => s.viewIndex);

  const pieces = useMemo(() => trackPieces(moves, viewIndex), [moves, viewIndex]);

  const lastMove = useMemo(
    () =>
      viewIndex > 0
        ? { from: moves[viewIndex - 1].from, to: moves[viewIndex - 1].to }
        : null,
    [moves, viewIndex],
  );

  const checkSquare = useMemo<Square | null>(() => {
    const c = new Chess(fens[viewIndex]);
    if (!c.inCheck()) return null;
    const color = c.turn();
    for (const row of c.board()) {
      for (const p of row) {
        if (p && p.type === "k" && p.color === color) return p.square;
      }
    }
    return null;
  }, [fens, viewIndex]);

  const captured = useMemo(() => {
    const byWhite: PieceSymbol[] = [];
    const byBlack: PieceSymbol[] = [];
    for (let i = 0; i < viewIndex; i++) {
      const m = moves[i];
      if (m.captured) (m.color === "w" ? byWhite : byBlack).push(m.captured);
    }
    const diff =
      byWhite.reduce((sum, t) => sum + PIECE_VALUES[t], 0) -
      byBlack.reduce((sum, t) => sum + PIECE_VALUES[t], 0);
    return { byWhite, byBlack, whiteDiff: diff, blackDiff: -diff };
  }, [moves, viewIndex]);

  return { pieces, lastMove, checkSquare, captured };
}

/** Chạy đồng hồ: store tự tính delta từ lastTickAt (tryMove chốt phần
 *  thời gian dở khi đổi lượt nên không cần reset theo turn). */
export function useClockTicker() {
  const status = useGameStore((s) => s.status);
  const clockRunning = useGameStore((s) => s.clockRunning);
  const hasClock = useGameStore((s) => s.timeControl !== null);

  useEffect(() => {
    if (status !== "playing" || !clockRunning || !hasClock) return;
    useGameStore.getState().startTicking();
    const interval = setInterval(() => {
      useGameStore.getState().tick();
    }, 100);
    return () => clearInterval(interval);
  }, [status, clockRunning, hasClock]);
}
