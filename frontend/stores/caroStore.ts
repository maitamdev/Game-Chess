"use client";

import { create } from "zustand";
import { Caro, type CaroColor, type CaroMove } from "@/lib/caro/rules";
import type { TimeControl } from "@/lib/types";

export type CaroStatus = "idle" | "playing" | "over";

export interface CaroResult {
  winner: CaroColor | null;
  termination: string;
  line?: { x: number; y: number }[];
}

export interface CaroStore {
  status: CaroStatus;
  moves: CaroMove[];
  viewIndex: number;
  turn: CaroColor;
  result: CaroResult | null;

  timeControl: TimeControl | null;
  xMs: number;
  oMs: number;
  clocks: { x: number; o: number }[];
  clockRunning: boolean;
  lastTickAt: number | null;

  newGame(opts: { timeControl: TimeControl | null }): void;
  tryMove(uci: string, force?: boolean): CaroMove | null;
  undo(plies: number): void;
  setView(index: number): void;
  tick(): void;
  startTicking(): void;
  resign(color: CaroColor): void;
  isLive(): boolean;
}

let game = new Caro();

export const useCaroStore = create<CaroStore>((set, get) => ({
  status: "idle",
  moves: [],
  viewIndex: 0,
  turn: "x",
  result: null,

  timeControl: null,
  xMs: 0,
  oMs: 0,
  clocks: [{ x: 0, o: 0 }],
  clockRunning: false,
  lastTickAt: null,

  newGame({ timeControl }) {
    game = new Caro();
    set({
      status: "playing",
      moves: [],
      viewIndex: 0,
      turn: "x",
      result: null,
      timeControl,
      xMs: timeControl?.initialMs ?? 0,
      oMs: timeControl?.initialMs ?? 0,
      clocks: [{ x: timeControl?.initialMs ?? 0, o: timeControl?.initialMs ?? 0 }],
      clockRunning: false,
      lastTickAt: null,
    });
  },

  tryMove(uci, force = false) {
    const s = get();
    if (s.status !== "playing" || (!force && !s.isLive())) return null;
    const move = game.move(uci);
    if (!move) return null;
    const end = game.gameEnd();
    const increment = s.timeControl?.incrementMs ?? 0;

    set((prev) => {
      const now = performance.now();
      const pending =
        prev.clockRunning && prev.lastTickAt != null ? now - prev.lastTickAt : 0;
      const xMs = Math.max(
        0,
        move.color === "x" && prev.clockRunning
          ? prev.xMs - pending + increment
          : prev.xMs,
      );
      const oMs = Math.max(
        0,
        move.color === "o" && prev.clockRunning
          ? prev.oMs - pending + increment
          : prev.oMs,
      );
      const wasLive = prev.viewIndex === prev.moves.length;
      const clockRunning = prev.timeControl != null && end == null;
      return {
        moves: [...prev.moves, move],
        viewIndex: wasLive ? prev.moves.length + 1 : prev.viewIndex,
        turn: game.turn(),
        clockRunning,
        lastTickAt: clockRunning ? now : null,
        xMs,
        oMs,
        clocks: [...prev.clocks, { x: xMs, o: oMs }],
        status: end ? "over" : "playing",
        result: end
          ? { winner: end.winner, termination: end.termination, line: end.line }
          : null,
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
        xMs: prev.timeControl ? clock.x : prev.xMs,
        oMs: prev.timeControl ? clock.o : prev.oMs,
        clockRunning:
          moves.length > 0 && prev.timeControl != null && prev.clockRunning,
        viewIndex: moves.length,
        turn: game.turn(),
        result: null,
      };
    });
  },

  setView(index) {
    const s = get();
    set({ viewIndex: Math.max(0, Math.min(index, s.moves.length)) });
  },

  startTicking() {
    set({ lastTickAt: performance.now() });
  },

  tick() {
    const s = get();
    if (s.status !== "playing" || !s.clockRunning || !s.timeControl) return;
    const now = performance.now();
    const deltaMs = now - (s.lastTickAt ?? now);
    const key = s.turn === "x" ? "xMs" : "oMs";
    const remaining = Math.max(0, s[key] - deltaMs);
    if (remaining > 0) {
      set({ [key]: remaining, lastTickAt: now } as Partial<CaroStore>);
      return;
    }
    // hết giờ trong caro luôn là thua
    set({
      [key]: 0,
      status: "over",
      clockRunning: false,
      result: {
        winner: s.turn === "x" ? "o" : "x",
        termination: "timeout",
      },
    } as Partial<CaroStore>);
  },

  resign(color) {
    if (get().status !== "playing") return;
    set({
      status: "over",
      clockRunning: false,
      result: { winner: color === "x" ? "o" : "x", termination: "resignation" },
    });
  },

  isLive() {
    const s = get();
    return s.viewIndex === s.moves.length;
  },
}));
