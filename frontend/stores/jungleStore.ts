"use client";

import { create } from "zustand";
import { Jungle, type JgColor, type JgMove } from "@/lib/jungle/rules";
import type { TimeControl } from "@/lib/types";

export type JgStatus = "idle" | "playing" | "over";

export interface JgResult {
  winner: JgColor | null;
  termination: string;
}

export interface JungleStore {
  status: JgStatus;
  moves: JgMove[];
  viewIndex: number;
  turn: JgColor;
  result: JgResult | null;

  timeControl: TimeControl | null;
  redMs: number;
  blueMs: number;
  clocks: { r: number; b: number }[];
  clockRunning: boolean;
  lastTickAt: number | null;

  orientation: "red" | "blue";
  autoFlip: boolean;

  newGame(opts: {
    timeControl: TimeControl | null;
    orientation?: "red" | "blue";
    autoFlip?: boolean;
  }): void;
  tryMove(from: string, to: string, force?: boolean): JgMove | null;
  undo(plies: number): void;
  setView(index: number): void;
  flip(): void;
  setAutoFlip(v: boolean): void;
  tick(): void;
  startTicking(): void;
  resign(color: JgColor): void;
  legalMovesFrom(square: string): JgMove[];
  isLive(): boolean;
}

let game = new Jungle();

export const useJungleStore = create<JungleStore>((set, get) => ({
  status: "idle",
  moves: [],
  viewIndex: 0,
  turn: "r",
  result: null,

  timeControl: null,
  redMs: 0,
  blueMs: 0,
  clocks: [{ r: 0, b: 0 }],
  clockRunning: false,
  lastTickAt: null,

  orientation: "red",
  autoFlip: true,

  newGame({ timeControl, orientation, autoFlip }) {
    game = new Jungle();
    set((s) => ({
      status: "playing",
      moves: [],
      viewIndex: 0,
      turn: "r",
      result: null,
      timeControl,
      redMs: timeControl?.initialMs ?? 0,
      blueMs: timeControl?.initialMs ?? 0,
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
    const end = game.gameEnd();
    const increment = s.timeControl?.incrementMs ?? 0;

    set((prev) => {
      const now = performance.now();
      const pending =
        prev.clockRunning && prev.lastTickAt != null ? now - prev.lastTickAt : 0;
      const redMs = Math.max(
        0,
        move.color === "r" && prev.clockRunning
          ? prev.redMs - pending + increment
          : prev.redMs,
      );
      const blueMs = Math.max(
        0,
        move.color === "b" && prev.clockRunning
          ? prev.blueMs - pending + increment
          : prev.blueMs,
      );
      const wasLive = prev.viewIndex === prev.moves.length;
      const clockRunning = prev.timeControl != null && end == null;
      return {
        moves: [...prev.moves, move],
        viewIndex: wasLive ? prev.moves.length + 1 : prev.viewIndex,
        turn: game.turn(),
        clockRunning,
        lastTickAt: clockRunning ? now : null,
        redMs,
        blueMs,
        clocks: [...prev.clocks, { r: redMs, b: blueMs }],
        status: end ? "over" : "playing",
        result: end ? { winner: end.winner, termination: end.termination } : null,
        orientation: prev.autoFlip
          ? game.turn() === "r"
            ? "red"
            : "blue"
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
        clocks: prev.clocks.slice(0, moves.length + 1),
        redMs: prev.timeControl ? clock.r : prev.redMs,
        blueMs: prev.timeControl ? clock.b : prev.blueMs,
        clockRunning:
          moves.length > 0 && prev.timeControl != null && prev.clockRunning,
        viewIndex: moves.length,
        turn: game.turn(),
        result: null,
        orientation: prev.autoFlip
          ? game.turn() === "r"
            ? "red"
            : "blue"
          : prev.orientation,
      };
    });
  },

  setView(index) {
    const s = get();
    set({ viewIndex: Math.max(0, Math.min(index, s.moves.length)) });
  },

  flip() {
    set((s) => ({ orientation: s.orientation === "red" ? "blue" : "red" }));
  },

  setAutoFlip(autoFlip) {
    set((s) => ({
      autoFlip,
      orientation:
        autoFlip && s.status === "playing"
          ? s.turn === "r"
            ? "red"
            : "blue"
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
    const key = s.turn === "r" ? "redMs" : "blueMs";
    const remaining = Math.max(0, s[key] - deltaMs);
    if (remaining > 0) {
      set({ [key]: remaining, lastTickAt: now } as Partial<JungleStore>);
      return;
    }
    // hết giờ: bên kia thắng (trừ khi họ hết sạch thú — không thể vì đã thua trước đó)
    const other: JgColor = s.turn === "r" ? "b" : "r";
    set({
      [key]: 0,
      status: "over",
      clockRunning: false,
      result: { winner: other, termination: "timeout" },
    } as Partial<JungleStore>);
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
}));
