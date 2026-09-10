/**
 * Schema PostgreSQL dùng cho Supabase.
 *
 * `players` chỉ lưu phiên khách tạm thời với tên hiển thị. Trình duyệt nhận
 * cookie phiên được ký bởi server.
 */

import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const epoch = (name: string) => bigint(name, { mode: "number" });

export const players = pgTable(
  "players",
  {
    id: uuid("id").primaryKey(),
    username: text("display_name").notNull(),
    createdAt: epoch("created_at").notNull(),
    lastSeen: epoch("last_seen").notNull(),
  },
  (table) => [
    index("ix_players_last_seen").on(table.lastSeen),
    check(
      "ck_players_display_name",
      sql`char_length(${table.username}) between 2 and 24`,
    ),
  ],
);

// Alias tạm để phần luật ván cũ tiếp tục dùng chung model người chơi khách.
export const users = players;

/** Tài khoản tùy chọn gắn với guest player hiện có. */
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    login: text("login").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: epoch("created_at").notNull(),
    lastLoginAt: epoch("last_login_at"),
  },
  (table) => [
    uniqueIndex("ux_accounts_player").on(table.playerId),
    uniqueIndex("ux_accounts_login").on(table.login),
    check(
      "ck_accounts_login",
      sql`${table.login} ~ '^[a-z0-9_]{3,24}$'`,
    ),
  ],
);

export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey(),
    whiteId: uuid("white_id")
      .notNull()
      .references(() => players.id),
    blackId: uuid("black_id")
      .notNull()
      .references(() => players.id),
    variant: text("variant").notNull().default("chess"),
    timeControl: text("time_control").notNull(),
    result: text("result"),
    termination: text("termination"),
    pgn: text("pgn"),
    finalFen: text("final_fen"),
    startedAt: epoch("started_at").notNull(),
    endedAt: epoch("ended_at"),
    status: text("status").notNull().default("active"),
    whiteMs: integer("white_ms").notNull().default(0),
    blackMs: integer("black_ms").notNull().default(0),
    incrementMs: integer("increment_ms").notNull().default(0),
    turnStartedAt: epoch("turn_started_at"),
    lastPly: integer("last_ply").notNull().default(0),
    drawOfferFrom: text("draw_offer_from"),
    whiteLastSeen: epoch("white_last_seen"),
    blackLastSeen: epoch("black_last_seen"),
  },
  (table) => [
    index("ix_games_white_id").on(table.whiteId),
    index("ix_games_black_id").on(table.blackId),
    index("ix_games_started_at").on(table.startedAt),
    index("ix_games_status").on(table.status),
    check(
      "ck_games_variant",
      sql`${table.variant} in ('chess', 'xiangqi', 'caro', 'jungle', 'oanquan', 'reversi', 'connect4', 'draughts', 'dots')`,
    ),
    check("ck_games_status", sql`${table.status} in ('active', 'finished')`),
    check(
      "ck_games_result",
      sql`${table.result} is null or ${table.result} in ('white', 'black', 'draw', 'aborted')`,
    ),
    check(
      "ck_games_clock_values",
      sql`${table.whiteMs} >= 0 and ${table.blackMs} >= 0 and ${table.incrementMs} >= 0 and ${table.lastPly} >= 0`,
    ),
  ],
);

export const moves = pgTable(
  "moves",
  {
    id: serial("id").primaryKey(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    ply: integer("ply").notNull(),
    san: text("san").notNull(),
    uci: text("uci").notNull(),
    fenAfter: text("fen_after").notNull(),
    timeLeftMs: integer("time_left_ms").notNull(),
    evaluation: integer("evaluation"),
  },
  (table) => [
    uniqueIndex("ux_moves_game_ply").on(table.gameId, table.ply),
    check("ck_moves_ply", sql`${table.ply} > 0`),
    check("ck_moves_time_left", sql`${table.timeLeftMs} >= 0`),
  ],
);

/** Rating riêng theo từng variant, khởi điểm 1200. */
export const ratings = pgTable(
  "ratings",
  {
    id: serial("id").primaryKey(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    gameType: text("game_type").notNull(),
    rating: integer("rating").notNull().default(1200),
    games: integer("games").notNull().default(0),
    wins: integer("wins").notNull().default(0),
    draws: integer("draws").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    updatedAt: epoch("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("ux_ratings_player_game").on(table.playerId, table.gameType),
    index("ix_ratings_game").on(table.gameType, table.rating),
    check("ck_ratings_values", sql`${table.rating} between 0 and 4000 and ${table.games} >= 0 and ${table.wins} >= 0 and ${table.draws} >= 0 and ${table.losses} >= 0`),
  ],
);

export const ratingHistory = pgTable(
  "rating_history",
  {
    id: serial("id").primaryKey(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    gameType: text("game_type").notNull(),
    gameId: uuid("game_id"),
    result: text("result").notNull(),
    ratingBefore: integer("rating_before").notNull(),
    ratingAfter: integer("rating_after").notNull(),
    delta: integer("delta").notNull(),
    createdAt: epoch("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("ux_rating_history_player_game").on(table.playerId, table.gameId),
    index("ix_rating_history_player_created").on(table.playerId, table.createdAt),
  ],
);

export const matchmakingQueue = pgTable(
  "matchmaking_queue",
  {
    id: serial("id").primaryKey(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    gameType: text("game_type").notNull(),
    timeControl: text("time_control").notNull(),
    rating: integer("rating").notNull().default(1200),
    status: text("status").notNull().default("waiting"),
    roomCode: text("room_code"),
    gameId: uuid("game_id"),
    matchedAt: epoch("matched_at"),
    joinedAt: epoch("joined_at").notNull(),
    updatedAt: epoch("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("ux_matchmaking_player").on(table.playerId),
    index("ix_matchmaking_search").on(table.gameType, table.timeControl, table.rating, table.joinedAt),
    check("ck_matchmaking_rating", sql`${table.rating} between 0 and 4000`),
    check("ck_matchmaking_status", sql`${table.status} in ('waiting', 'matched')`),
  ],
);

export const cardRooms = pgTable(
  "game_rooms",
  {
    id: uuid("id").primaryKey(),
    code: text("code").notNull(),
    gameType: text("game_type").notNull(),
    title: text("title").notNull(),
    isPublic: boolean("is_public").notNull().default(true),
    hostId: uuid("host_player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    maxPlayers: integer("max_players").notNull(),
    status: text("status").notNull().default("waiting"),
    timeControl: text("time_control"),
    gameId: uuid("game_id").references(() => games.id),
    stateJson: jsonb("state_json"),
    version: integer("version").notNull().default(0),
    createdAt: epoch("created_at").notNull(),
    updatedAt: epoch("updated_at").notNull(),
    expiresAt: epoch("expires_at").notNull(),
  },
  (table) => [
    uniqueIndex("ux_game_rooms_code").on(table.code),
    index("ix_game_rooms_public").on(table.isPublic, table.status, table.updatedAt),
    index("ix_game_rooms_expires").on(table.expiresAt),
    check(
      "ck_game_rooms_code",
      sql`${table.code} ~ '^[A-HJ-NP-Z2-9]{6}$'`,
    ),
    check(
      "ck_game_rooms_type",
      sql`${table.gameType} in ('chess', 'xiangqi', 'caro', 'jungle', 'oanquan', 'reversi', 'connect4', 'draughts', 'dots', 'uno', 'tienlen', 'ngua', 'xidach', 'baicao')`,
    ),
    check(
      "ck_game_rooms_status",
      sql`${table.status} in ('waiting', 'playing', 'finished')`,
    ),
    check(
      "ck_game_rooms_shape",
      sql`(
        (${table.gameType} = 'uno' and ${table.maxPlayers} between 2 and 4 and ${table.timeControl} is null)
        or
        (${table.gameType} = 'tienlen' and ${table.maxPlayers} = 4 and ${table.timeControl} is null)
        or
        (${table.gameType} = 'ngua' and ${table.maxPlayers} = 4 and ${table.timeControl} is null)
        or
        (${table.gameType} in ('xidach', 'baicao') and ${table.maxPlayers} between 2 and 4 and ${table.timeControl} is null)
        or
        (${table.gameType} not in ('uno', 'tienlen', 'ngua', 'xidach', 'baicao') and ${table.maxPlayers} = 2 and ${table.timeControl} is not null)
      )`,
    ),
    check("ck_game_rooms_version", sql`${table.version} >= 0`),
    check(
      "ck_game_rooms_lifetime",
      sql`${table.expiresAt} > ${table.createdAt} and ${table.updatedAt} >= ${table.createdAt}`,
    ),
  ],
);

export const cardRoomPlayers = pgTable(
  "room_players",
  {
    id: serial("id").primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => cardRooms.id, { onDelete: "cascade" }),
    userId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    seat: integer("seat").notNull(),
    joinedAt: epoch("joined_at").notNull(),
    lastSeen: epoch("last_seen").notNull(),
  },
  (table) => [
    uniqueIndex("ux_room_player").on(table.roomId, table.userId),
    uniqueIndex("ux_room_seat").on(table.roomId, table.seat),
    index("ix_room_players_player").on(table.userId),
    check("ck_room_players_seat", sql`${table.seat} between 0 and 3`),
  ],
);

/** Tin nháº¯n nháº¹ trong phÃ²ng, Ä‘Æ°á»£c giá»¯ theo room Ä‘á»ƒ lá»‹ch sá»­ tá»± háº¿t theo phÃ²ng. */
export const roomMessages = pgTable(
  "room_messages",
  {
    id: serial("id").primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => cardRooms.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: epoch("created_at").notNull(),
  },
  (table) => [
    index("ix_room_messages_room_created").on(table.roomId, table.createdAt),
    check("ck_room_messages_body", sql`char_length(${table.body}) between 1 and 280`),
  ],
);

/** Mùa xếp hạng dùng chung cho các giải đấu và bảng thành tích. */
export const seasons = pgTable(
  "seasons",
  {
    id: uuid("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("upcoming"),
    startsAt: epoch("starts_at").notNull(),
    endsAt: epoch("ends_at").notNull(),
    createdAt: epoch("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("ux_seasons_slug").on(table.slug),
    index("ix_seasons_status_dates").on(table.status, table.startsAt, table.endsAt),
    check(
      "ck_seasons_status",
      sql`${table.status} in ('upcoming', 'active', 'finished')`,
    ),
    check("ck_seasons_dates", sql`${table.endsAt} > ${table.startsAt}`),
  ],
);

/** Giải đấu nhiều game: v1 dùng leaderboard/swiss, v2 bổ sung bracket. */
export const tournaments = pgTable(
  "tournaments",
  {
    id: uuid("id").primaryKey(),
    seasonId: uuid("season_id").references(() => seasons.id, { onDelete: "set null" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    gameType: text("game_type").notNull(),
    format: text("format").notNull().default("swiss"),
    status: text("status").notNull().default("draft"),
    maxPlayers: integer("max_players").notNull().default(64),
    startsAt: epoch("starts_at").notNull(),
    endsAt: epoch("ends_at").notNull(),
    rulesJson: jsonb("rules_json"),
    createdAt: epoch("created_at").notNull(),
    updatedAt: epoch("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("ux_tournaments_slug").on(table.slug),
    index("ix_tournaments_season_status").on(table.seasonId, table.status, table.startsAt),
    check(
      "ck_tournaments_game_type",
      sql`${table.gameType} in ('chess', 'xiangqi', 'caro', 'jungle', 'oanquan', 'reversi', 'connect4', 'draughts', 'dots', 'uno', 'tienlen', 'ngua', 'xidach', 'baicao')`,
    ),
    check(
      "ck_tournaments_format",
      sql`${table.format} in ('swiss', 'single_elimination', 'leaderboard')`,
    ),
    check(
      "ck_tournaments_status",
      sql`${table.status} in ('draft', 'open', 'live', 'finished', 'cancelled')`,
    ),
    check(
      "ck_tournaments_shape",
      sql`${table.maxPlayers} between 2 and 512 and ${table.endsAt} > ${table.startsAt} and ${table.updatedAt} >= ${table.createdAt}`,
    ),
  ],
);

export const tournamentParticipants = pgTable(
  "tournament_participants",
  {
    id: serial("id").primaryKey(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    seed: integer("seed"),
    score: integer("score").notNull().default(0),
    wins: integer("wins").notNull().default(0),
    draws: integer("draws").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    status: text("status").notNull().default("registered"),
    joinedAt: epoch("joined_at").notNull(),
    updatedAt: epoch("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("ux_tournament_participant").on(table.tournamentId, table.playerId),
    index("ix_tournament_participants_rank").on(table.tournamentId, table.score, table.wins),
    check(
      "ck_tournament_participant_status",
      sql`${table.status} in ('registered', 'active', 'eliminated', 'withdrawn', 'winner')`,
    ),
    check(
      "ck_tournament_participant_stats",
      sql`${table.score} >= 0 and ${table.wins} >= 0 and ${table.draws} >= 0 and ${table.losses} >= 0 and ${table.updatedAt} >= ${table.joinedAt}`,
    ),
  ],
);

export const tournamentMatches = pgTable(
  "tournament_matches",
  {
    id: uuid("id").primaryKey(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    round: integer("round").notNull(),
    matchNumber: integer("match_number").notNull(),
    playerAId: uuid("player_a_id").references(() => players.id, { onDelete: "set null" }),
    playerBId: uuid("player_b_id").references(() => players.id, { onDelete: "set null" }),
    gameId: uuid("game_id").references(() => games.id, { onDelete: "set null" }),
    winnerId: uuid("winner_id").references(() => players.id, { onDelete: "set null" }),
    status: text("status").notNull().default("scheduled"),
    scheduledAt: epoch("scheduled_at"),
    completedAt: epoch("completed_at"),
    createdAt: epoch("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("ux_tournament_match_slot").on(table.tournamentId, table.round, table.matchNumber),
    index("ix_tournament_matches_players").on(table.playerAId, table.playerBId, table.status),
    check("ck_tournament_match_round", sql`${table.round} > 0 and ${table.matchNumber} > 0`),
    check(
      "ck_tournament_match_status",
      sql`${table.status} in ('scheduled', 'playing', 'finished', 'bye', 'cancelled')`,
    ),
  ],
);

export const achievementDefinitions = pgTable(
  "achievement_definitions",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull().default("milestone"),
    icon: text("icon").notNull().default("trophy"),
    points: integer("points").notNull().default(10),
    target: integer("target").notNull().default(1),
  },
  (table) => [
    uniqueIndex("ux_achievement_definitions_key").on(table.key),
    check("ck_achievement_definition_points", sql`${table.points} >= 0 and ${table.target} > 0`),
  ],
);

export const playerAchievements = pgTable(
  "player_achievements",
  {
    id: serial("id").primaryKey(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    achievementId: integer("achievement_id")
      .notNull()
      .references(() => achievementDefinitions.id, { onDelete: "cascade" }),
    progress: integer("progress").notNull().default(0),
    unlockedAt: epoch("unlocked_at"),
    metadata: jsonb("metadata"),
    createdAt: epoch("created_at").notNull(),
    updatedAt: epoch("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("ux_player_achievement").on(table.playerId, table.achievementId),
    index("ix_player_achievements_player_unlocked").on(table.playerId, table.unlockedAt),
    check("ck_player_achievement_progress", sql`${table.progress} >= 0 and ${table.updatedAt} >= ${table.createdAt}`),
  ],
);

export const playerReports = pgTable(
  "player_reports",
  {
    id: serial("id").primaryKey(),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    reportedId: uuid("reported_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    gameId: uuid("game_id").references(() => games.id, { onDelete: "set null" }),
    roomId: uuid("room_id").references(() => cardRooms.id, { onDelete: "set null" }),
    reason: text("reason").notNull(),
    details: text("details"),
    status: text("status").notNull().default("open"),
    resolvedBy: uuid("resolved_by").references(() => players.id, { onDelete: "set null" }),
    createdAt: epoch("created_at").notNull(),
    resolvedAt: epoch("resolved_at"),
  },
  (table) => [
    index("ix_player_reports_status_created").on(table.status, table.createdAt),
    index("ix_player_reports_reported").on(table.reportedId, table.createdAt),
    check("ck_player_report_reason", sql`char_length(${table.reason}) between 2 and 48`),
    check(
      "ck_player_report_status",
      sql`${table.status} in ('open', 'reviewing', 'resolved', 'dismissed')`,
    ),
    check("ck_player_report_not_self", sql`${table.reporterId} <> ${table.reportedId}`),
  ],
);

export type UserRow = typeof players.$inferSelect;
export type PlayerRow = UserRow;
export type AccountRow = typeof accounts.$inferSelect;
export type RatingRow = typeof ratings.$inferSelect;
export type RatingHistoryRow = typeof ratingHistory.$inferSelect;
export type MatchmakingQueueRow = typeof matchmakingQueue.$inferSelect;
export type GameRow = typeof games.$inferSelect;
export type MoveRow = typeof moves.$inferSelect;
export type CardRoomRow = typeof cardRooms.$inferSelect;
export type CardRoomPlayerRow = typeof cardRoomPlayers.$inferSelect;
export type RoomMessageRow = typeof roomMessages.$inferSelect;
export type SeasonRow = typeof seasons.$inferSelect;
export type TournamentRow = typeof tournaments.$inferSelect;
export type TournamentParticipantRow = typeof tournamentParticipants.$inferSelect;
export type TournamentMatchRow = typeof tournamentMatches.$inferSelect;
export type AchievementDefinitionRow = typeof achievementDefinitions.$inferSelect;
export type PlayerAchievementRow = typeof playerAchievements.$inferSelect;
export type PlayerReportRow = typeof playerReports.$inferSelect;
