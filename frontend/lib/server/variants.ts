/** Danh mục variant + ánh xạ cột thống kê theo game (port VARIANT_FIELDS). */

import type { UserRow } from "./db";

export type Variant = "chess" | "xiangqi" | "caro" | "jungle" | "oanquan";

export const VALID_VARIANTS: readonly Variant[] = [
  "chess",
  "xiangqi",
  "caro",
  "jungle",
  "oanquan",
];

export const VALID_TIME_CONTROLS = ["3+2", "5+0", "10+0", "15+10"] as const;

export function isVariant(v: string): v is Variant {
  return (VALID_VARIANTS as readonly string[]).includes(v);
}

type StatKeys = {
  elo: keyof UserRow & string;
  games: keyof UserRow & string;
  wins: keyof UserRow & string;
  losses: keyof UserRow & string;
  draws: keyof UserRow & string;
};

export const VARIANT_STATS: Record<Variant, StatKeys> = {
  chess: {
    elo: "elo",
    games: "gamesPlayed",
    wins: "wins",
    losses: "losses",
    draws: "draws",
  },
  xiangqi: {
    elo: "xqElo",
    games: "xqGamesPlayed",
    wins: "xqWins",
    losses: "xqLosses",
    draws: "xqDraws",
  },
  caro: {
    elo: "caroElo",
    games: "caroGamesPlayed",
    wins: "caroWins",
    losses: "caroLosses",
    draws: "caroDraws",
  },
  jungle: {
    elo: "jgElo",
    games: "jgGamesPlayed",
    wins: "jgWins",
    losses: "jgLosses",
    draws: "jgDraws",
  },
  oanquan: {
    elo: "oqElo",
    games: "oqGamesPlayed",
    wins: "oqWins",
    losses: "oqLosses",
    draws: "oqDraws",
  },
};

/** (elo, số ván đã chơi) của user theo variant. */
export function userVariantStats(
  user: UserRow,
  variant: Variant,
): { elo: number; gamesPlayed: number } {
  const keys = VARIANT_STATS[variant];
  return {
    elo: user[keys.elo] as number,
    gamesPlayed: user[keys.games] as number,
  };
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
