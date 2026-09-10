/** Các variant bàn cờ hiện được server live hỗ trợ. */

import {
  BOARD_GAME_IDS,
  type BoardGameId,
} from "@/lib/games/registry";

export type Variant = BoardGameId;

export const VALID_VARIANTS = BOARD_GAME_IDS;

export const VALID_TIME_CONTROLS = ["3+2", "5+0", "10+0", "15+10"] as const;

export function isVariant(v: string): v is Variant {
  return (VALID_VARIANTS as readonly string[]).includes(v);
}

/** '10+5' → {initialMs: 600000, incrementMs: 5000} */
export function parseTimeControl(tc: string): {
  initialMs: number;
  incrementMs: number;
} {
  const [minutes, inc] = tc.split("+");
  return {
    initialMs: Number(minutes) * 60_000,
    incrementMs: Number(inc ?? 0) * 1000,
  };
}
