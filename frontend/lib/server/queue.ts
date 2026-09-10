import { and, asc, eq, gt, lt, ne } from "drizzle-orm";

import {
  matchmakingQueue,
  db,
  players,
  type PlayerRow,
} from "./db";
import { ApiError } from "./errors";
import { createGameRoom, joinGameRoom } from "./rooms";
import { ensureRating } from "./ratings";
import { isVariant, VALID_TIME_CONTROLS, type Variant } from "./variants";

const INITIAL_RANGE = 100;
const RANGE_PER_MINUTE = 50;
const MAX_RANGE = 600;

function rangeForWait(joinedAt: number, now: number): number {
  return Math.min(
    MAX_RANGE,
    INITIAL_RANGE + Math.floor(Math.max(0, now - joinedAt) / 60_000) * RANGE_PER_MINUTE,
  );
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export interface QueueResult {
  status: "waiting" | "matched";
  game_type: Variant;
  time_control: string;
  queued_at: string | null;
  room_code: string | null;
  game_id: string | null;
}

export async function enqueuePlayer(
  player: PlayerRow,
  gameTypeRaw: string,
  timeControlRaw: string,
): Promise<QueueResult> {
  if (!isVariant(gameTypeRaw)) {
    throw new ApiError(422, "INVALID_GAME", "Game chưa hỗ trợ matchmaking");
  }
  if (!(VALID_TIME_CONTROLS as readonly string[]).includes(timeControlRaw)) {
    throw new ApiError(422, "INVALID_TIME_CONTROL", "Thời gian không hợp lệ");
  }
  const gameType = gameTypeRaw as Variant;
  const timeControl = timeControlRaw;
  const rating = await ensureRating(player.id, gameType);
  const now = Date.now();

  let candidateId: string | null = null;
  try {
    await db.transaction(async (tx) => {
      await tx
        .delete(matchmakingQueue)
        .where(eq(matchmakingQueue.playerId, player.id));
      const candidates = await tx
        .select()
        .from(matchmakingQueue)
        .where(
          and(
            eq(matchmakingQueue.gameType, gameType),
            eq(matchmakingQueue.timeControl, timeControl),
            eq(matchmakingQueue.status, "waiting"),
            ne(matchmakingQueue.playerId, player.id),
            gt(matchmakingQueue.rating, rating.rating - MAX_RANGE),
            lt(matchmakingQueue.rating, rating.rating + MAX_RANGE),
          ),
        )
        .orderBy(asc(matchmakingQueue.joinedAt))
        .limit(10)
        .for("update");
      const candidate = candidates.find(
        (row) => Math.abs(row.rating - rating.rating) <= rangeForWait(row.joinedAt, now),
      );
      if (candidate) {
        await tx.delete(matchmakingQueue).where(eq(matchmakingQueue.id, candidate.id));
        candidateId = candidate.playerId;
        return;
      }
      await tx.insert(matchmakingQueue).values({
        playerId: player.id,
        gameType,
        timeControl,
        rating: rating.rating,
        joinedAt: now,
        updatedAt: now,
      });
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const existing = await db
      .select()
      .from(matchmakingQueue)
      .where(eq(matchmakingQueue.playerId, player.id))
      .limit(1);
    if (existing.length === 0) throw error;
  }

  if (!candidateId) {
    return {
      status: "waiting",
      game_type: gameType,
      time_control: timeControl,
      queued_at: new Date(now).toISOString(),
      room_code: null,
      game_id: null,
    };
  }

  const candidateRows = await db
    .select()
    .from(players)
    .where(eq(players.id, candidateId))
    .limit(1);
  const candidate = candidateRows[0];
  if (!candidate) throw new ApiError(409, "PLAYER_GONE", "Đối thủ đã rời hàng chờ");
  const room = await createGameRoom(player, {
    gameType,
    maxPlayers: 2,
    timeControl,
    title: `Đấu nhanh ${gameType}`,
    isPublic: false,
  });
  const joined = await joinGameRoom(candidate, room.code, gameType);
  const matchedAt = Date.now();
  await db.insert(matchmakingQueue).values([
    {
      playerId: player.id,
      gameType,
      timeControl,
      rating: rating.rating,
      status: "matched",
      roomCode: joined.code,
      gameId: joined.game_id,
      matchedAt,
      joinedAt: matchedAt,
      updatedAt: matchedAt,
    },
    {
      playerId: candidate.id,
      gameType,
      timeControl,
      rating: rating.rating,
      status: "matched",
      roomCode: joined.code,
      gameId: joined.game_id,
      matchedAt,
      joinedAt: matchedAt,
      updatedAt: matchedAt,
    },
  ]).onConflictDoNothing({ target: matchmakingQueue.playerId });
  return {
    status: "matched",
    game_type: gameType,
    time_control: timeControl,
    queued_at: null,
    room_code: joined.code,
    game_id: joined.game_id,
  };
}

export async function leaveQueue(player: PlayerRow): Promise<void> {
  await db
    .delete(matchmakingQueue)
    .where(eq(matchmakingQueue.playerId, player.id));
}

export async function queueStatus(player: PlayerRow): Promise<QueueResult | null> {
  const rows = await db
    .select()
    .from(matchmakingQueue)
    .where(eq(matchmakingQueue.playerId, player.id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.status === "matched") {
    if (row.matchedAt !== null && Date.now() - row.matchedAt > 10 * 60_000) {
      await db.delete(matchmakingQueue).where(eq(matchmakingQueue.id, row.id));
      return null;
    }
    return {
      status: "matched",
      game_type: row.gameType as Variant,
      time_control: row.timeControl,
      queued_at: new Date(row.joinedAt).toISOString(),
      room_code: row.roomCode,
      game_id: row.gameId,
    };
  }
  await db
    .update(matchmakingQueue)
    .set({ updatedAt: Date.now() })
    .where(eq(matchmakingQueue.id, row.id));
  return {
    status: "waiting",
    game_type: row.gameType as Variant,
    time_control: row.timeControl,
    queued_at: new Date(row.joinedAt).toISOString(),
    room_code: null,
    game_id: null,
  };
}
