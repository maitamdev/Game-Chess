import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/server/auth";
import { userPublicDto } from "@/lib/server/dto";
import { handle } from "@/lib/server/errors";

export const GET = handle(async (req: NextRequest) => {
  const user = await requireUser(req);
  return NextResponse.json(userPublicDto(user));
});
