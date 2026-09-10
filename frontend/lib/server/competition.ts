import { and, asc, count, desc, eq, inArray, or } from "drizzle-orm";

import {
  achievementDefinitions,
  db,
  games,
  playerAchievements,
  playerReports,
  players,
  seasons,
  tournamentMatches,
  tournamentParticipants,
  tournaments,
  type PlayerRow,
} from "./db";
import { ApiError } from "./errors";
import { isRoomGameType, type RoomGameType } from "./rooms";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function iso(ms: number | null): string | null {
  return ms === null ? null : new Date(ms).toISOString();
}

function statusFromDates(startsAt: number, endsAt: number, status: string): string {
  if (status === "cancelled" || status === "finished") return status;
  const now = Date.now();
  if (now < startsAt) return status === "draft" ? "draft" : "open";
  if (now >= endsAt) return "finished";
  return status === "open" || status === "live" ? status : "upcoming";
}

async function tournamentByKey(key: string) {
  const condition = UUID_RE.test(key)
    ? or(eq(tournaments.id, key), eq(tournaments.slug, key))
    : eq(tournaments.slug, key);
  const rows = await db.select().from(tournaments).where(condition).limit(1);
  return rows[0] ?? null;
}

export async function listSeasons() {
  const rows = await db
    .select()
    .from(seasons)
    .orderBy(desc(seasons.startsAt))
    .limit(12);
  return rows.map((season) => ({
    id: season.id,
    slug: season.slug,
    name: season.name,
    status: statusFromDates(season.startsAt, season.endsAt, season.status),
    starts_at: iso(season.startsAt),
    ends_at: iso(season.endsAt),
  }));
}

export async function listTournaments(options: {
  gameType?: string | null;
  status?: string | null;
} = {}) {
  const conditions = [];
  if (options.gameType && isRoomGameType(options.gameType)) {
    conditions.push(eq(tournaments.gameType, options.gameType));
  }
  if (options.status && ["draft", "open", "live", "finished", "cancelled"].includes(options.status)) {
    conditions.push(eq(tournaments.status, options.status));
  }
  const rows = await db
    .select()
    .from(tournaments)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(tournaments.startsAt), desc(tournaments.updatedAt))
    .limit(50);
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const participantCounts = await db
    .select({ tournamentId: tournamentParticipants.tournamentId, total: count() })
    .from(tournamentParticipants)
    .where(inArray(tournamentParticipants.tournamentId, ids))
    .groupBy(tournamentParticipants.tournamentId);
  const countByTournament = new Map(
    participantCounts.map((row) => [row.tournamentId, Number(row.total)]),
  );
  const seasonIds = Array.from(
    new Set(rows.map((row) => row.seasonId).filter((id): id is string => id !== null)),
  );
  const seasonRows = seasonIds.length
    ? await db.select().from(seasons).where(inArray(seasons.id, seasonIds))
    : [];
  const seasonById = new Map(seasonRows.map((season) => [season.id, season]));

  return rows.map((row) => {
    const season = row.seasonId ? seasonById.get(row.seasonId) : undefined;
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      game_type: row.gameType as RoomGameType,
      format: row.format,
      status: statusFromDates(row.startsAt, row.endsAt, row.status),
      max_players: row.maxPlayers,
      participant_count: countByTournament.get(row.id) ?? 0,
      starts_at: iso(row.startsAt),
      ends_at: iso(row.endsAt),
      season: season
        ? { id: season.id, slug: season.slug, name: season.name }
        : null,
    };
  });
}

export async function tournamentDetail(key: string, viewerId: string | null = null) {
  const row = await tournamentByKey(key);
  if (!row) throw new ApiError(404, "TOURNAMENT_NOT_FOUND", "Không tìm thấy giải đấu");
  const [season, participants, matches] = await Promise.all([
    row.seasonId
      ? db.select().from(seasons).where(eq(seasons.id, row.seasonId)).limit(1)
      : Promise.resolve([]),
    db
      .select({ participant: tournamentParticipants, player: players })
      .from(tournamentParticipants)
      .innerJoin(players, eq(players.id, tournamentParticipants.playerId))
      .where(eq(tournamentParticipants.tournamentId, row.id))
      .orderBy(desc(tournamentParticipants.score), desc(tournamentParticipants.wins), asc(tournamentParticipants.joinedAt)),
    db
      .select()
      .from(tournamentMatches)
      .where(eq(tournamentMatches.tournamentId, row.id))
      .orderBy(asc(tournamentMatches.round), asc(tournamentMatches.matchNumber))
      .limit(100),
  ]);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    game_type: row.gameType as RoomGameType,
    format: row.format,
    status: statusFromDates(row.startsAt, row.endsAt, row.status),
    max_players: row.maxPlayers,
    starts_at: iso(row.startsAt),
    ends_at: iso(row.endsAt),
    rules: row.rulesJson,
    season: season[0]
      ? { id: season[0].id, slug: season[0].slug, name: season[0].name }
      : null,
    viewer_registered: viewerId
      ? participants.some(({ participant }) => participant.playerId === viewerId)
      : false,
    participants: participants.map(({ participant, player }, index) => ({
      rank: index + 1,
      player: { id: player.id, username: player.username },
      score: participant.score,
      wins: participant.wins,
      draws: participant.draws,
      losses: participant.losses,
      status: participant.status,
    })),
    matches: matches.map((match) => ({
      id: match.id,
      round: match.round,
      match_number: match.matchNumber,
      player_a_id: match.playerAId,
      player_b_id: match.playerBId,
      game_id: match.gameId,
      winner_id: match.winnerId,
      status: match.status,
      scheduled_at: iso(match.scheduledAt),
      completed_at: iso(match.completedAt),
    })),
  };
}

export async function registerForTournament(
  player: PlayerRow,
  key: string,
) {
  const row = await tournamentByKey(key);
  if (!row) throw new ApiError(404, "TOURNAMENT_NOT_FOUND", "Không tìm thấy giải đấu");
  const now = Date.now();
  try {
    await db.transaction(async (tx) => {
      const lockedRows = await tx
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, row.id))
        .limit(1)
        .for("update");
      const locked = lockedRows[0];
      if (!locked) throw new ApiError(404, "TOURNAMENT_NOT_FOUND", "Không tìm thấy giải đấu");
      const status = statusFromDates(locked.startsAt, locked.endsAt, locked.status);
      if (status !== "open") {
        throw new ApiError(409, "TOURNAMENT_NOT_OPEN", "Giải đấu chưa mở hoặc đã bắt đầu");
      }
      const alreadyRegistered = await tx
        .select({ id: tournamentParticipants.id })
        .from(tournamentParticipants)
        .where(
          and(
            eq(tournamentParticipants.tournamentId, locked.id),
            eq(tournamentParticipants.playerId, player.id),
          ),
        )
        .limit(1);
      if (alreadyRegistered.length > 0) {
        throw new ApiError(409, "ALREADY_REGISTERED", "Bạn đã đăng ký giải đấu này");
      }
      const current = await tx
        .select({ total: count() })
        .from(tournamentParticipants)
        .where(eq(tournamentParticipants.tournamentId, locked.id));
      if (Number(current[0]?.total ?? 0) >= locked.maxPlayers) {
        throw new ApiError(409, "TOURNAMENT_FULL", "Giải đấu đã đủ người");
      }
      await tx.insert(tournamentParticipants).values({
        tournamentId: locked.id,
        playerId: player.id,
        score: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        status: "registered",
        joinedAt: now,
        updatedAt: now,
      });
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      throw new ApiError(409, "ALREADY_REGISTERED", "Bạn đã đăng ký giải đấu này");
    }
    throw error;
  }
  await unlockAchievement(player.id, "tournament_entry");
  return tournamentDetail(row.id, player.id);
}

export async function getPlayerAchievements(playerId: string) {
  const [definitions, progressRows] = await Promise.all([
    db.select().from(achievementDefinitions).orderBy(asc(achievementDefinitions.id)),
    db
      .select()
      .from(playerAchievements)
      .where(eq(playerAchievements.playerId, playerId)),
  ]);
  const progressByDefinition = new Map(progressRows.map((row) => [row.achievementId, row]));
  return definitions.map((definition) => {
    const progress = progressByDefinition.get(definition.id);
    return {
      key: definition.key,
      title: definition.title,
      description: definition.description,
      category: definition.category,
      icon: definition.icon,
      points: definition.points,
      target: definition.target,
      progress: progress?.progress ?? 0,
      unlocked_at: iso(progress?.unlockedAt ?? null),
      unlocked: progress?.unlockedAt !== null && progress?.unlockedAt !== undefined,
    };
  });
}

/** Rebuild tiến độ từ event log games để job có thể chạy lại an toàn. */
export async function syncPlayerAchievements(playerId: string): Promise<void> {
  const finishedGames = await db
    .select({ variant: games.variant, whiteId: games.whiteId, blackId: games.blackId, result: games.result })
    .from(games)
    .where(
      and(
        eq(games.status, "finished"),
        or(eq(games.whiteId, playerId), eq(games.blackId, playerId)),
      ),
    );
  const wins = finishedGames.filter(
    (game) =>
      (game.whiteId === playerId && game.result === "white") ||
      (game.blackId === playerId && game.result === "black"),
  ).length;
  const playedVariants = new Set(finishedGames.map((game) => game.variant));
  const values: Record<string, number> = {
    first_win: wins > 0 ? 1 : 0,
    ten_games: finishedGames.length,
    five_wins: wins,
    multi_game: playedVariants.size,
  };
  const definitions = await db.select().from(achievementDefinitions);
  const existing = await db
    .select()
    .from(playerAchievements)
    .where(eq(playerAchievements.playerId, playerId));
  const existingById = new Map(existing.map((row) => [row.achievementId, row]));
  const now = Date.now();

  await db.transaction(async (tx) => {
    for (const definition of definitions) {
      const progress = Math.min(
        definition.target,
        values[definition.key] ?? existingById.get(definition.id)?.progress ?? 0,
      );
      const current = existingById.get(definition.id);
      const unlockedAt =
        current?.unlockedAt ?? (progress >= definition.target ? now : null);
      await tx
        .insert(playerAchievements)
        .values({
          playerId,
          achievementId: definition.id,
          progress,
          unlockedAt,
          createdAt: current?.createdAt ?? now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [playerAchievements.playerId, playerAchievements.achievementId],
          set: { progress, unlockedAt, updatedAt: now },
        });
    }
  });
}

export async function unlockAchievement(playerId: string, key: string): Promise<void> {
  const definitionRows = await db
    .select()
    .from(achievementDefinitions)
    .where(eq(achievementDefinitions.key, key))
    .limit(1);
  const definition = definitionRows[0];
  if (!definition) return;
  const now = Date.now();
  await db
    .insert(playerAchievements)
    .values({
      playerId,
      achievementId: definition.id,
      progress: definition.target,
      unlockedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [playerAchievements.playerId, playerAchievements.achievementId],
      set: { progress: definition.target, unlockedAt: now, updatedAt: now },
    });
}

export async function createPlayerReport(
  reporter: PlayerRow,
  input: { reportedId: string; reason: string; details?: string; gameId?: string; roomId?: string },
) {
  if (reporter.id === input.reportedId) {
    throw new ApiError(422, "REPORT_SELF", "Không thể báo cáo chính mình");
  }
  const target = await db.select({ id: players.id }).from(players).where(eq(players.id, input.reportedId)).limit(1);
  if (!target[0]) throw new ApiError(404, "PLAYER_NOT_FOUND", "Không tìm thấy người chơi");
  const [created] = await db
    .insert(playerReports)
    .values({
      reporterId: reporter.id,
      reportedId: input.reportedId,
      reason: input.reason.trim().slice(0, 48),
      details: input.details?.trim().slice(0, 1000) || null,
      gameId: input.gameId ?? null,
      roomId: input.roomId ?? null,
      status: "open",
      createdAt: Date.now(),
    })
    .returning({ id: playerReports.id, status: playerReports.status });
  return created;
}
