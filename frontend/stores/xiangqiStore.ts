"use client";

import { create } from "zustand";
import { Xiangqi, type XqColor, type XqMove } from "@/lib/xiangqi/rules";
import type { TimeControl } from "@/lib/types";

export type XqStatus = "idle" | "playing" | "over";

export interface XqResult {
  winner: XqColor | null;
  termination: string;
}

interface NewGameOptions {
  timeControl: TimeControl | null;
  orientation?: "red" | "black";
  autoFlip?: boolean;
}

export interface XiangqiStore {
  status: XqStatus;
  moves: XqMove[];
  fens: string[];
  viewIndex: number;
  turn: XqColor;
  result: XqResult | null;

  timeControl: TimeControl | null;
  redMs: number;
  blackMs: number;
  clocks: { r: number; b: number }[];
  clockRunning: boolean;
  lastTickAt: number | null;

  orientation: "red" | "black";
  autoFlip: boolean;

  newGame(opts: NewGameOptions): void;
  tryMove(from: string, to: string, force?: boolean): XqMove | null;
  undo(plies: number): void;
  setView(index: number): void;
  flip(): void;
  setAutoFlip(v: boolean): void;
  tick(): void;
  startTicking(): void;
  resign(color: XqColor): void;
  legalMovesFrom(square: string): XqMove[];
  isLive(): boolean;
  inCheckSquare(viewIndex: number): string | null;
}

let game = new Xiangqi();

export const useXiangqiStore = create<XiangqiStore>((set, get) => ({
  status: "idle",
  moves: [],
  fens: [new Xiangqi().fen()],
  viewIndex: 0,
  turn: "r",
  result: null,

  timeControl: null,
  redMs: 0,
  blackMs: 0,
  clocks: [{ r: 0, b: 0 }],
  clockRunning: false,
  lastTickAt: null,

  orientation: "red",
  autoFlip: true,

  newGame({ timeControl, orientation, autoFlip }) {
    game = new Xiangqi();
    set((s) => ({
      status: "playing",
      moves: [],
      fens: [game.fen()],
      viewIndex: 0,
      turn: "r",
      result: null,
      timeControl,
      redMs: timeControl?.initialMs ?? 0,
      blackMs: timeControl?.initialMs ?? 0,
      clocks: [{ r: timeControl?.initialMs ?? 0, b: timeControl?.initialMs ?? 0 }],
      clockRunning: false,
      lastTickAt: null,
      orientation: orientation ?? "red",
      autoFlip: autoFlip ?? s.autoFlip,
    }));
  },

  tryMove(from, to, force = false) {
    const s = get();
    if (s.status !== "playing" || (!force && !s.isLive())) return null;
    const move = game.move({ from, to });
    if (!move) return null;

    const mover = move.color;
    const increment = s.timeControl?.incrementMs ?? 0;
    const end = game.gameEnd();

    set((prev) => {
      // Chốt thời gian đã trôi từ tick cuối cho người vừa đi, rồi cộng giờ
      const now = performance.now();
      const pending =
        prev.clockRunning && prev.lastTickAt != null ? now - prev.lastTickAt : 0;
      const redMs = Math.max(
        0,
        mover === "r" && prev.clockRunning
          ? prev.redMs - pending + increment
          : prev.redMs,
      );
      const blackMs = Math.max(
        0,
        mover === "b" && prev.clockRunning
          ? prev.blackMs - pending + increment
          : prev.blackMs,
      );
      const wasLive = prev.viewIndex === prev.moves.length;
      const clockRunning = prev.timeControl != null && end == null;
      return {
        moves: [...prev.moves, move],
        fens: [...prev.fens, game.fen()],
        viewIndex: wasLive ? prev.moves.length + 1 : prev.viewIndex,
        turn: game.turn(),
        clockRunning,
        lastTickAt: clockRunning ? now : null,
        redMs,
        blackMs,
        clocks: [...prev.clocks, { r: redMs, b: blackMs }],
        status: end ? "over" : "playing",
        result: end ? { winner: end.winner, termination: end.termination } : null,
        orientation: prev.autoFlip
          ? game.turn() === "r"
            ? "red"
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
    for (let i = 0; i < count; i++) game.undo();
    set((prev) => {
      const moves = prev.moves.slice(0, prev.moves.length - count);
      const clock = prev.clocks[moves.length] ?? prev.clocks[0];
      return {
        moves,
        fens: prev.fens.slice(0, moves.length + 1),
        clocks: prev.clocks.slice(0, moves.length + 1),
        redMs: prev.timeControl ? clock.r : prev.redMs,
        blackMs: prev.timeControl ? clock.b : prev.blackMs,
        clockRunning:
          moves.length > 0 && prev.timeControl != null && prev.clockRunning,
        viewIndex: moves.length,
        turn: game.turn(),
        result: null,
        orientation: prev.autoFlip
          ? game.turn() === "r"
            ? "red"
            : "black"
          : prev.orientation,
      };
    });
  },

  setView(index) {
    const s = get();
    set({ viewIndex: Math.max(0, Math.min(index, s.moves.length)) });
  },

  flip() {
    set((s) => ({ orientation: s.orientation === "red" ? "black" : "red" }));
  },

  setAutoFlip(autoFlip) {
    set((s) => ({
      autoFlip,
      orientation:
        autoFlip && s.status === "playing"
          ? s.turn === "r"
            ? "red"
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
    const key = side === "r" ? "redMs" : "blackMs";
    const remaining = Math.max(0, s[key] - deltaMs);
    if (remaining > 0) {
      set({ [key]: remaining, lastTickAt: now } as Partial<XiangqiStore>);
      return;
    }
    // Hết giờ: bên kia thắng, trừ khi không còn quân tấn công → hoà
    const other: XqColor = side === "r" ? "b" : "r";
    const winner = game.hasAttackingMaterial(other) ? other : null;
    set({
      [key]: 0,
      status: "over",
      clockRunning: false,
      result: { winner, termination: "timeout" },
    } as Partial<XiangqiStore>);
  },

  resign(color) {
    if (get().status !== "playing") return;
    set({
      status: "over",
      clockRunning: false,
      result: { winner: color === "r" ? "b" : "r", termination: "resignation" },
    });
  },

  legalMovesFrom(square) {
    if (get().status !== "playing" || !get().isLive()) return [];
    return game.moves({ square });
  },

  isLive() {
    const s = get();
    return s.viewIndex === s.moves.length;
  },

  /** Ô Tướng của bên đang đi nếu đang bị chiếu, tại thế cờ đang xem. */
  inCheckSquare(viewIndex) {
    const s = get();
    const replay = new Xiangqi();
    for (let i = 0; i < viewIndex && i < s.moves.length; i++) {
      replay.pushMove(s.moves[i]);
    }
    if (!replay.inCheck()) return null;
    const color = replay.turn();
    for (const p of replay.pieces()) {
      if (p.type === "k" && p.color === color) return p.square;
    }
    return null;
  },
}));
