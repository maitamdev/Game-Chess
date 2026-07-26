"use client";

import { create } from "zustand";
import { OAnQuan, type OqColor, type OqMove } from "@/lib/oanquan/rules";
import type { TimeControl } from "@/lib/types";

export type OqStatus = "idle" | "playing" | "over";

export interface OqResult {
  winner: OqColor | null;
  termination: string;
  /** Tỉ số chốt sổ khi kết thúc tự nhiên (timeout/resign không có). */
  scoreA?: number;
  scoreB?: number;
}

// Bàn ô ăn quan vẽ cố định A dưới B trên (đối xứng) → không cần orientation.
export interface OanquanStore {
  status: OqStatus;
  moves: OqMove[];
  viewIndex: number;
  turn: OqColor;
  result: OqResult | null;

  timeControl: TimeControl | null;
  aMs: number;
  bMs: number;
  clocks: { a: number; b: number }[];
  clockRunning: boolean;
  lastTickAt: number | null;

  newGame(opts: { timeControl: TimeControl | null }): void;
  tryMove(uci: string, force?: boolean): OqMove | null;
  undo(plies: number): void;
  setView(index: number): void;
  tick(): void;
  startTicking(): void;
  resign(color: OqColor): void;
  isLive(): boolean;
}

let game = new OAnQuan();

export const useOanquanStore = create<OanquanStore>((set, get) => ({
  status: "idle",
  moves: [],
  viewIndex: 0,
  turn: "a",
  result: null,

  timeControl: null,
  aMs: 0,
  bMs: 0,
  clocks: [{ a: 0, b: 0 }],
  clockRunning: false,
  lastTickAt: null,

  newGame({ timeControl }) {
    game = new OAnQuan();
    set({
      status: "playing",
      moves: [],
      viewIndex: 0,
      turn: "a",
      result: null,
      timeControl,
      aMs: timeControl?.initialMs ?? 0,
      bMs: timeControl?.initialMs ?? 0,
      clocks: [{ a: timeControl?.initialMs ?? 0, b: timeControl?.initialMs ?? 0 }],
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
      const aMs = Math.max(
        0,
        move.color === "a" && prev.clockRunning
          ? prev.aMs - pending + increment
          : prev.aMs,
      );
      const bMs = Math.max(
        0,
        move.color === "b" && prev.clockRunning
          ? prev.bMs - pending + increment
          : prev.bMs,
      );
      const wasLive = prev.viewIndex === prev.moves.length;
      const clockRunning = prev.timeControl != null && end == null;
      return {
        moves: [...prev.moves, move],
        viewIndex: wasLive ? prev.moves.length + 1 : prev.viewIndex,
        turn: game.turn(),
        clockRunning,
        lastTickAt: clockRunning ? now : null,
        aMs,
        bMs,
        clocks: [...prev.clocks, { a: aMs, b: bMs }],
        status: end ? "over" : "playing",
        result: end
          ? {
              winner: end.winner,
              termination: end.termination,
              scoreA: end.scoreA,
              scoreB: end.scoreB,
            }
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
        aMs: prev.timeControl ? clock.a : prev.aMs,
        bMs: prev.timeControl ? clock.b : prev.bMs,
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
    const key = s.turn === "a" ? "aMs" : "bMs";
    const remaining = Math.max(0, s[key] - deltaMs);
    if (remaining > 0) {
      set({ [key]: remaining, lastTickAt: now } as Partial<OanquanStore>);
      return;
    }
    // hết giờ trong ô ăn quan luôn là thua
    set({
      [key]: 0,
      status: "over",
      clockRunning: false,
      result: {
        winner: s.turn === "a" ? "b" : "a",
        termination: "timeout",
      },
    } as Partial<OanquanStore>);
  },

  resign(color) {
    if (get().status !== "playing") return;
    set({
      status: "over",
      clockRunning: false,
      result: { winner: color === "a" ? "b" : "a", termination: "resignation" },
    });
  },

  isLive() {
    const s = get();
    return s.viewIndex === s.moves.length;
  },
}));
