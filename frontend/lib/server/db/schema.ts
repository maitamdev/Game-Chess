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
      sql`${table.variant} in ('chess', 'xiangqi', 'caro', 'jungle', 'oanquan')`,
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
      sql`${table.gameType} in ('chess', 'xiangqi', 'caro', 'jungle', 'oanquan', 'uno')`,
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
        (${table.gameType} <> 'uno' and ${table.maxPlayers} = 2 and ${table.timeControl} is not null)
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

export type UserRow = typeof players.$inferSelect;
export type PlayerRow = UserRow;
export type GameRow = typeof games.$inferSelect;
export type MoveRow = typeof moves.$inferSelect;
export type CardRoomRow = typeof cardRooms.$inferSelect;
export type CardRoomPlayerRow = typeof cardRoomPlayers.$inferSelect;
