import { desc } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { db, users } from "@/lib/server/db";
import { userPublicDto } from "@/lib/server/dto";
import { ApiError, handle } from "@/lib/server/errors";
import { isVariant, type Variant } from "@/lib/server/variants";

const ELO_COLS = {
  chess: users.elo,
  xiangqi: users.xqElo,
  caro: users.caroElo,
  jungle: users.jgElo,
  oanquan: users.oqElo,
} satisfies Record<Variant, unknown>;

export const GET = handle(async (req: NextRequest) => {
  const url = new URL(req.url);
  const limit = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("limit") ?? 100) || 100),
  );
  const variant = url.searchParams.get("variant") ?? "chess";
  if (!isVariant(variant)) {
    throw new ApiError(422, "VALIDATION", "Loại cờ không hợp lệ");
  }
  const rows = await db
    .select()
    .from(users)
    .orderBy(desc(ELO_COLS[variant]))
    .limit(limit);
  return NextResponse.json(rows.map(userPublicDto));
});
