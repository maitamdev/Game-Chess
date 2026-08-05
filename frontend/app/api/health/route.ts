import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({
      status: "ok",
      database: "connected",
    });
  } catch (error) {
    console.error(
      "Database readiness check failed:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      {
        status: "error",
        database: "unavailable",
      },
      { status: 503 },
    );
  }
}
