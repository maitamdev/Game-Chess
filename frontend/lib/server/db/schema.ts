/**
 * Schema Drizzle (SQLite/libSQL) — port 1-1 từ SQLAlchemy models cũ,
 * cộng thêm các cột "live" để ván online chạy không cần tiến trình thường trực
 * (Vercel serverless): đồng hồ, heartbeat, đề nghị hoà đều nằm trong DB,
 * mọi phán quyết (hết giờ, huỷ ván, xử thua rớt mạng) thực hiện lazy khi
 * có request đọc/ghi ván.
 *
 * Thời gian lưu dạng epoch milliseconds (integer) — serializer đổi sang ISO.
 */

import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    // thống kê cờ vua
    elo: integer("elo").notNull().default(1200),
    gamesPlayed: integer("games_played").notNull().default(0),
    wins: integer("wins").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    draws: integer("draws").notNull().default(0),
    // thống kê cờ tướng
    xqElo: integer("xq_elo").notNull().default(1200),
    xqGamesPlayed: integer("xq_games_played").notNull().default(0),
    xqWins: integer("xq_wins").notNull().default(0),
    xqLosses: integer("xq_losses").notNull().default(0),
    xqDraws: integer("xq_draws").notNull().default(0),
    // thống kê cờ caro
    caroElo: integer("caro_elo").notNull().default(1200),
    caroGamesPlayed: integer("caro_games_played").notNull().default(0),
    caroWins: integer("caro_wins").notNull().default(0),
    caroLosses: integer("caro_losses").notNull().default(0),
    caroDraws: integer("caro_draws").notNull().default(0),
    // thống kê cờ thú
    jgElo: integer("jg_elo").notNull().default(1200),
    jgGamesPlayed: integer("jg_games_played").notNull().default(0),
    jgWins: integer("jg_wins").notNull().default(0),
    jgLosses: integer("jg_losses").notNull().default(0),
    jgDraws: integer("jg_draws").notNull().default(0),
    // thống kê ô ăn quan
    oqElo: integer("oq_elo").notNull().default(1200),
    oqGamesPlayed: integer("oq_games_played").notNull().default(0),
    oqWins: integer("oq_wins").notNull().default(0),
    oqLosses: integer("oq_losses").notNull().default(0),
    oqDraws: integer("oq_draws").notNull().default(0),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("ux_users_username").on(t.username),
    uniqueIndex("ux_users_email").on(t.email),
    index("ix_users_elo").on(t.elo),
  ],
);

export const games = sqliteTable(
  "games",
  {
    id: text("id").primaryKey(),
    whiteId: text("white_id")
      .notNull()
      .references(() => users.id),
    blackId: text("black_id")
      .notNull()
      .references(() => users.id),
    // 'chess' | 'xiangqi' | 'caro' | 'jungle' | 'oanquan'
    // (cờ tướng/cờ thú: white = Đỏ đi trước; ô ăn quan: white = bên A)
    variant: text("variant").notNull().default("chess"),
    timeControl: text("time_control").notNull(),
    // 'white' | 'black' | 'draw' | 'aborted' | null khi đang chơi
    result: text("result"),
    // 'checkmate','resignation','timeout','stalemate','agreement','repetition',
    // 'fifty_move','insufficient','aborted','perpetual_check','den',
    // 'no_pieces','five_in_row','all_quan_captured','max_ply'
    termination: text("termination"),
    pgn: text("pgn"),
    finalFen: text("final_fen"),
    whiteEloBefore: integer("white_elo_before"),
    blackEloBefore: integer("black_elo_before"),
    // thay đổi Elo của bên trắng (giữ tên cột cũ)
    eloChange: integer("elo_change"),
    // thay đổi Elo bên đen (K-factor hai bên có thể khác nhau)
    blackEloChange: integer("black_elo_change"),
    startedAt: integer("started_at").notNull(),
    endedAt: integer("ended_at"),

    // ---- trạng thái live (thay cho GameSession trong RAM) ----
    status: text("status").notNull().default("active"), // active | finished
    whiteMs: integer("white_ms").notNull().default(0),
    blackMs: integer("black_ms").notNull().default(0),
    incrementMs: integer("increment_ms").notNull().default(0),
    // null = đồng hồ chưa chạy (trước nước đi đầu tiên)
    turnStartedAt: integer("turn_started_at"),
    lastPly: integer("last_ply").notNull().default(0),
    drawOfferFrom: text("draw_offer_from"), // 'white' | 'black' | null
    whiteLastSeen: integer("white_last_seen"),
    blackLastSeen: integer("black_last_seen"),
  },
  (t) => [
    index("ix_games_white_id").on(t.whiteId),
    index("ix_games_black_id").on(t.blackId),
    index("ix_games_started_at").on(t.startedAt),
    index("ix_games_status").on(t.status),
  ],
);

export const moves = sqliteTable(
  "moves",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    ply: integer("ply").notNull(), // 1, 2, 3...
    san: text("san").notNull(),
    uci: text("uci").notNull(),
    fenAfter: text("fen_after").notNull(),
    timeLeftMs: integer("time_left_ms").notNull(),
    evaluation: integer("evaluation"),
  },
  (t) => [index("ix_moves_game_ply").on(t.gameId, t.ply)],
);

export const ratingHistory = sqliteTable(
  "rating_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    elo: integer("elo").notNull(),
    variant: text("variant").notNull().default("chess"),
    gameId: text("game_id").references(() => games.id),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("ix_rating_history_user").on(t.userId, t.createdAt)],
);

/**
 * Hàng đợi ghép cặp — thay cho Matchmaker trong RAM. Không có vòng lặp nền:
 * mỗi lần join/poll status đều thử ghép cặp; entry không poll quá hạn bị dọn.
 */
export const queueEntries = sqliteTable(
  "queue_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    variant: text("variant").notNull(),
    timeControl: text("time_control").notNull(),
    elo: integer("elo").notNull(),
    joinedAt: integer("joined_at").notNull(),
    lastSeen: integer("last_seen").notNull(),
    // đã ghép xong: chờ chính chủ poll nhận game_id rồi xoá entry
    matchedGameId: text("matched_game_id"),
  },
  (t) => [
    uniqueIndex("ux_queue_user").on(t.userId),
    index("ix_queue_bucket").on(t.variant, t.timeControl),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type GameRow = typeof games.$inferSelect;
export type MoveRow = typeof moves.$inferSelect;
export type RatingHistoryRow = typeof ratingHistory.$inferSelect;
export type QueueEntryRow = typeof queueEntries.$inferSelect;
