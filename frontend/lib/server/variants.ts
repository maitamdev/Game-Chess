/** Danh mục các game bàn cờ chạy trên luồng phòng chung. */

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
