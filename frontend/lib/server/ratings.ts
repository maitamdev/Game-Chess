import { and, desc, eq, inArray, or } from "drizzle-orm";

import {
  db,
  games,
  players,
  ratingHistory,
  ratings,
  type PlayerRow,
  type RatingRow,
} from "./db";
import { isVariant, type Variant } from "./variants";

export const INITIAL_RATING = 1200;

function kFactor(gamesPlayed: number): number {
  if (gamesPlayed < 30) return 40;
  if (gamesPlayed < 100) return 20;
  return 10;
}

function expectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400));
}

function resultScore(result: "win" | "draw" | "loss"): number {
  return result === "win" ? 1 : result === "draw" ? 0.5 : 0;
}

export async function ensureRating(
  playerId: string,
  gameType: Variant,
): Promise<RatingRow> {
  const now = Date.now();
  await db
    .insert(ratings)
    .values({ playerId, gameType, updatedAt: now })
    .onConflictDoNothing({ target: [ratings.playerId, ratings.gameType] });
  const rows = await db
    .select()
    .from(ratings)
    .where(and(eq(ratings.playerId, playerId), eq(ratings.gameType, gameType)))
    .limit(1);
  if (!rows[0]) throw new Error("RATING_NOT_CREATED");
  return rows[0];
}

export async function recordBoardRating(
  gameId: string,
  variantRaw: string,
  whiteId: string,
  blackId: string,
  result: "white" | "black" | "draw" | "aborted",
): Promise<void> {
  if (result === "aborted" || !isVariant(variantRaw)) return;
  const variant = variantRaw as Variant;
  const now = Date.now();
  await db.transaction(async (tx) => {
    await tx
      .insert(ratings)
      .values([
        { playerId: whiteId, gameType: variant, updatedAt: now },
        { playerId: blackId, gameType: variant, updatedAt: now },
      ])
      .onConflictDoNothing({ target: [ratings.playerId, ratings.gameType] });

    const historyRows = await tx
      .select({ id: ratingHistory.id })
      .from(ratingHistory)
      .where(eq(ratingHistory.gameId, gameId))
      .limit(1);
    if (historyRows.length > 0) return;

    const current = await tx
      .select()
      .from(ratings)
      .where(
        and(
          eq(ratings.gameType, variant),
          inArray(ratings.playerId, [whiteId, blackId]),
        ),
      )
      .for("update");
    const white = current.find((row) => row.playerId === whiteId);
    const black = current.find((row) => row.playerId === blackId);
    if (!white || !black) throw new Error("RATING_ROWS_MISSING");

    const whiteOutcome = result === "white" ? "win" : result === "black" ? "loss" : "draw";
    const blackOutcome = result === "black" ? "win" : result === "white" ? "loss" : "draw";
    const whiteDelta = Math.round(
      kFactor(white.games) *
        (resultScore(whiteOutcome) - expectedScore(white.rating, black.rating)),
    );
    const blackDelta = Math.round(
      kFactor(black.games) *
        (resultScore(blackOutcome) - expectedScore(black.rating, white.rating)),
    );
    const whiteAfter = Math.max(0, white.rating + whiteDelta);
    const blackAfter = Math.max(0, black.rating + blackDelta);

    await tx
      .update(ratings)
      .set({
        rating: whiteAfter,
        games: white.games + 1,
        wins: white.wins + (whiteOutcome === "win" ? 1 : 0),
        draws: white.draws + (whiteOutcome === "draw" ? 1 : 0),
        losses: white.losses + (whiteOutcome === "loss" ? 1 : 0),
        updatedAt: now,
      })
      .where(eq(ratings.id, white.id));
    await tx
      .update(ratings)
      .set({
        rating: blackAfter,
        games: black.games + 1,
        wins: black.wins + (blackOutcome === "win" ? 1 : 0),
        draws: black.draws + (blackOutcome === "draw" ? 1 : 0),
        losses: black.losses + (blackOutcome === "loss" ? 1 : 0),
        updatedAt: now,
      })
      .where(eq(ratings.id, black.id));

    await tx.insert(ratingHistory).values([
      {
        playerId: whiteId,
        gameType: variant,
        gameId,
        result: whiteOutcome,
        ratingBefore: white.rating,
        ratingAfter: whiteAfter,
        delta: whiteDelta,
        createdAt: now,
      },
      {
        playerId: blackId,
        gameType: variant,
        gameId,
        result: blackOutcome,
        ratingBefore: black.rating,
        ratingAfter: blackAfter,
        delta: blackDelta,
        createdAt: now,
      },
    ]);
  });
}

export async function leaderboard(
  gameTypeRaw: string,
  limit = 50,
): Promise<Array<RatingRow & { player: { id: string; username: string } }>> {
  const gameType = isVariant(gameTypeRaw) ? gameTypeRaw : "chess";
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  const rows = await db
    .select({ rating: ratings, player: players })
    .from(ratings)
    .innerJoin(players, eq(players.id, ratings.playerId))
    .where(eq(ratings.gameType, gameType))
    .orderBy(desc(ratings.rating), desc(ratings.games))
    .limit(safeLimit);
  return rows.map(({ rating, player }) => ({
    ...rating,
    player: { id: player.id, username: player.username },
  }));
}

export async function playerRatings(playerId: string): Promise<RatingRow[]> {
  return db
    .select()
    .from(ratings)
    .where(eq(ratings.playerId, playerId))
    .orderBy(desc(ratings.rating));
}

export async function recentBoardGames(playerId: string, limit = 20) {
  const gameRows = await db
    .select()
    .from(games)
    .where(or(eq(games.whiteId, playerId), eq(games.blackId, playerId)))
    .orderBy(desc(games.startedAt))
    .limit(Math.min(50, Math.max(1, limit)));
  const opponentIds = Array.from(
    new Set(
      gameRows.map((game) =>
        game.whiteId === playerId ? game.blackId : game.whiteId,
      ),
    ),
  );
  const opponentRows =
    opponentIds.length === 0
      ? []
      : await db
          .select({ id: players.id, username: players.username })
          .from(players)
          .where(inArray(players.id, opponentIds));
  const names = new Map(opponentRows.map((player) => [player.id, player.username]));
  return gameRows.map((game) => ({
    id: game.id,
    variant: game.variant,
    opponent: {
      id: game.whiteId === playerId ? game.blackId : game.whiteId,
      username: names.get(game.whiteId === playerId ? game.blackId : game.whiteId) ?? "Người chơi",
    },
    side: game.whiteId === playerId ? "white" : "black",
    result: game.result,
    termination: game.termination,
    status: game.status,
    started_at: new Date(game.startedAt).toISOString(),
    ended_at: game.endedAt === null ? null : new Date(game.endedAt).toISOString(),
    rating_game: isVariant(game.variant) ? game.variant : null,
  }));
}

