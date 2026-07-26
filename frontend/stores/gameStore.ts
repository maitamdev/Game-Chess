"use client";

import { Chess, type Color, type Move, type PieceSymbol, type Square } from "chess.js";
import { create } from "zustand";
import type { GameResult, TimeControl } from "@/lib/types";

export type GameStatus = "idle" | "playing" | "over";

interface NewGameOptions {
  timeControl: TimeControl | null;
  orientation?: "white" | "black";
  autoFlip?: boolean;
}

export interface GameStore {
  status: GameStatus;
  moves: Move[];
  fens: string[]; // fens[i] = FEN sau i nước; fens[0] = thế cờ ban đầu
  viewIndex: number; // == moves.length khi đang xem thế cờ hiện tại
  turn: Color;
  result: GameResult | null;

  timeControl: TimeControl | null;
  whiteMs: number;
  blackMs: number;
  /** Đồng hồ hai bên sau từng nước — clocks[i] ứng với fens[i], để undo khôi phục */
  clocks: { w: number; b: number }[];
  clockRunning: boolean;
  /** mốc performance.now() của lần trừ giờ gần nhất — tick/tryMove cùng dùng */
  lastTickAt: number | null;

  orientation: "white" | "black";
  autoFlip: boolean;

  newGame(opts: NewGameOptions): void;
  /** force = true: áp nước của engine kể cả khi người chơi đang xem lịch sử */
  tryMove(
    from: Square,
    to: Square,
    promotion?: PieceSymbol,
    force?: boolean,
  ): Move | null;
  undo(plies: number): void;
  setView(index: number): void;
  flip(): void;
  setAutoFlip(autoFlip: boolean): void;
  tick(): void;
  startTicking(): void;
  resign(color: Color): void;
  legalMovesFrom(square: Square): Move[];
  isLive(): boolean;
}

/** Bên `color` còn đủ lực chiếu bí không (dùng khi đối thủ hết giờ). */
export function canMate(chess: Chess, color: Color): boolean {
  let minors = 0;
  for (const row of chess.board()) {
    for (const piece of row) {
      if (!piece || piece.color !== color || piece.type === "k") continue;
      if (piece.type === "p" || piece.type === "r" || piece.type === "q") return true;
      minors++; // mã hoặc tượng
    }
  }
  return minors >= 2;
}

function detectGameOver(chess: Chess): GameResult | null {
  if (chess.isCheckmate()) {
    return {
      winner: chess.turn() === "w" ? "black" : "white",
      termination: "checkmate",
    };
  }
  if (chess.isStalemate()) return { winner: null, termination: "stalemate" };
  if (chess.isInsufficientMaterial())
    return { winner: null, termination: "insufficient" };
  if (chess.isThreefoldRepetition())
    return { winner: null, termination: "repetition" };
  if (chess.isDrawByFiftyMoves()) return { winner: null, termination: "fifty_move" };
  return null;
}

let chess = new Chess();

export const useGameStore = create<GameStore>((set, get) => ({
  status: "idle",
  moves: [],
  fens: [new Chess().fen()],
  viewIndex: 0,
  turn: "w",
  result: null,

  timeControl: null,
  whiteMs: 0,
  blackMs: 0,
  clocks: [{ w: 0, b: 0 }],
  clockRunning: false,
  lastTickAt: null,

  orientation: "white",
  autoFlip: true,

  newGame({ timeControl, orientation, autoFlip }) {
    chess = new Chess();
    set((s) => ({
      status: "playing",
      moves: [],
      fens: [chess.fen()],
      viewIndex: 0,
      turn: "w",
      result: null,
      timeControl,
      whiteMs: timeControl?.initialMs ?? 0,
      blackMs: timeControl?.initialMs ?? 0,
      clocks: [{ w: timeControl?.initialMs ?? 0, b: timeControl?.initialMs ?? 0 }],
      clockRunning: false,
      lastTickAt: null,
      orientation: orientation ?? (s.autoFlip ? "white" : s.orientation),
      autoFlip: autoFlip ?? s.autoFlip,
    }));
  },

  tryMove(from, to, promotion, force = false) {
    const s = get();
    if (s.status !== "playing" || (!force && !s.isLive())) return null;
    let move: Move;
    try {
      move = chess.move({ from, to, promotion });
    } catch {
      return null;
    }

    const mover = move.color;
    const increment = s.timeControl?.incrementMs ?? 0;
    const result = detectGameOver(chess);

    set((prev) => {
      // Chốt phần thời gian đã trôi từ lần tick cuối cho NGƯỜI VỪA ĐI
      // (không rò 0–100ms mỗi nước), rồi cộng giờ sau khi hoàn tất nước đi.
      const now = performance.now();
      const pending =
        prev.clockRunning && prev.lastTickAt != null ? now - prev.lastTickAt : 0;
      const whiteMs = Math.max(
        0,
        mover === "w" && prev.clockRunning
          ? prev.whiteMs - pending + increment
          : prev.whiteMs,
      );
      const blackMs = Math.max(
        0,
        mover === "b" && prev.clockRunning
          ? prev.blackMs - pending + increment
          : prev.blackMs,
      );
      const wasLive = prev.viewIndex === prev.moves.length;
      const clockRunning = prev.timeControl != null && result == null;
      return {
        moves: [...prev.moves, move],
        fens: [...prev.fens, chess.fen()],
        // đang xem lịch sử thì giữ nguyên vị trí xem
        viewIndex: wasLive ? prev.moves.length + 1 : prev.viewIndex,
        turn: chess.turn(),
        clockRunning,
        lastTickAt: clockRunning ? now : null,
        whiteMs,
        blackMs,
        clocks: [...prev.clocks, { w: whiteMs, b: blackMs }],
        status: result ? "over" : "playing",
        result,
        orientation: prev.autoFlip
          ? chess.turn() === "w"
            ? "white"
            : "black"
          : prev.orientation,
      };
    });
    return move;
  },

  undo(plies) {
    const s = get();
    if (s.status !== "playing" || s.moves.length === 0) return;
    const count = Math.min(plies, s.moves.length);
    for (let i = 0; i < count; i++) chess.undo();
    set((prev) => {
      const moves = prev.moves.slice(0, prev.moves.length - count);
      // khôi phục đồng hồ về đúng thời điểm sau nước cuối còn lại
      const clock = prev.clocks[moves.length] ?? prev.clocks[0];
      return {
        moves,
        fens: prev.fens.slice(0, moves.length + 1),
        clocks: prev.clocks.slice(0, moves.length + 1),
        whiteMs: prev.timeControl ? clock.w : prev.whiteMs,
        blackMs: prev.timeControl ? clock.b : prev.blackMs,
        clockRunning:
          moves.length > 0 && prev.timeControl != null && prev.clockRunning,
        viewIndex: moves.length,
        turn: chess.turn(),
        result: null,
        orientation: prev.autoFlip
          ? chess.turn() === "w"
            ? "white"
            : "black"
          : prev.orientation,
      };
    });
  },

  setView(index) {
    const s = get();
    const clamped = Math.max(0, Math.min(index, s.moves.length));
    set({ viewIndex: clamped });
  },

  flip() {
    set((s) => ({ orientation: s.orientation === "white" ? "black" : "white" }));
  },

  setAutoFlip(autoFlip) {
    set((s) => ({
      autoFlip,
      orientation:
        autoFlip && s.status === "playing"
          ? s.turn === "w"
            ? "white"
            : "black"
          : s.orientation,
    }));
  },

  startTicking() {
    set({ lastTickAt: performance.now() });
  },

  tick() {
    const s = get();
    if (s.status !== "playing" || !s.clockRunning || !s.timeControl) return;
    const now = performance.now();
    const deltaMs = now - (s.lastTickAt ?? now);
    const side = s.turn;
    const key = side === "w" ? "whiteMs" : "blackMs";
    const remaining = Math.max(0, s[key] - deltaMs);
    if (remaining > 0) {
      set({ [key]: remaining, lastTickAt: now } as Partial<GameStore>);
      return;
    }
    // Hết giờ: bên kia thắng, trừ khi không đủ lực chiếu bí thì hoà
    const other: Color = side === "w" ? "b" : "w";
    const winner = canMate(chess, other)
      ? other === "w"
        ? "white"
        : "black"
      : null;
    set({
      [key]: 0,
      status: "over",
      clockRunning: false,
      result: { winner, termination: "timeout" },
    } as Partial<GameStore>);
  },

  resign(color) {
    const s = get();
    if (s.status !== "playing") return;
    set({
      status: "over",
      clockRunning: false,
      result: {
        winner: color === "w" ? "black" : "white",
        termination: "resignation",
      },
    });
  },

  legalMovesFrom(square) {
    if (get().status !== "playing" || !get().isLive()) return [];
    return chess.moves({ square, verbose: true });
  },

  isLive() {
    const s = get();
    return s.viewIndex === s.moves.length;
  },
}));
