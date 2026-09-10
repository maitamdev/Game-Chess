import { NextResponse } from "next/server";

import { listSeasons } from "@/lib/server/competition";
import { handle } from "@/lib/server/errors";

export const GET = handle(async () => NextResponse.json({ seasons: await listSeasons() }));
