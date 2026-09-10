-- Kỳ Đài v2: season, tournament, achievement và moderation foundation.
CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"starts_at" bigint NOT NULL,
	"ends_at" bigint NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "ck_seasons_status" CHECK ("seasons"."status" in ('upcoming', 'active', 'finished')),
	CONSTRAINT "ck_seasons_dates" CHECK ("seasons"."ends_at" > "seasons"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"season_id" uuid,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"game_type" text NOT NULL,
	"format" text DEFAULT 'swiss' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"max_players" integer DEFAULT 64 NOT NULL,
	"starts_at" bigint NOT NULL,
	"ends_at" bigint NOT NULL,
	"rules_json" jsonb,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "ck_tournaments_game_type" CHECK ("tournaments"."game_type" in ('chess', 'xiangqi', 'caro', 'jungle', 'oanquan', 'reversi', 'connect4', 'uno', 'tienlen', 'ngua', 'xidach', 'baicao')),
	CONSTRAINT "ck_tournaments_format" CHECK ("tournaments"."format" in ('swiss', 'single_elimination', 'leaderboard')),
	CONSTRAINT "ck_tournaments_status" CHECK ("tournaments"."status" in ('draft', 'open', 'live', 'finished', 'cancelled')),
	CONSTRAINT "ck_tournaments_shape" CHECK ("tournaments"."max_players" between 2 and 512 and "tournaments"."ends_at" > "tournaments"."starts_at" and "tournaments"."updated_at" >= "tournaments"."created_at")
);
--> statement-breakpoint
CREATE TABLE "tournament_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"seed" integer,
	"score" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"draws" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'registered' NOT NULL,
	"joined_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "ck_tournament_participant_status" CHECK ("tournament_participants"."status" in ('registered', 'active', 'eliminated', 'withdrawn', 'winner')),
	CONSTRAINT "ck_tournament_participant_stats" CHECK ("tournament_participants"."score" >= 0 and "tournament_participants"."wins" >= 0 and "tournament_participants"."draws" >= 0 and "tournament_participants"."losses" >= 0 and "tournament_participants"."updated_at" >= "tournament_participants"."joined_at")
);
--> statement-breakpoint
CREATE TABLE "tournament_matches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tournament_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"match_number" integer NOT NULL,
	"player_a_id" uuid,
	"player_b_id" uuid,
	"game_id" uuid,
	"winner_id" uuid,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"scheduled_at" bigint,
	"completed_at" bigint,
	"created_at" bigint NOT NULL,
	CONSTRAINT "ck_tournament_match_round" CHECK ("tournament_matches"."round" > 0 and "tournament_matches"."match_number" > 0),
	CONSTRAINT "ck_tournament_match_status" CHECK ("tournament_matches"."status" in ('scheduled', 'playing', 'finished', 'bye', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "achievement_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text DEFAULT 'milestone' NOT NULL,
	"icon" text DEFAULT 'trophy' NOT NULL,
	"points" integer DEFAULT 10 NOT NULL,
	"target" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "ck_achievement_definition_points" CHECK ("achievement_definitions"."points" >= 0 and "achievement_definitions"."target" > 0)
);
--> statement-breakpoint
CREATE TABLE "player_achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" uuid NOT NULL,
	"achievement_id" integer NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"unlocked_at" bigint,
	"metadata" jsonb,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "ck_player_achievement_progress" CHECK ("player_achievements"."progress" >= 0 and "player_achievements"."updated_at" >= "player_achievements"."created_at")
);
--> statement-breakpoint
CREATE TABLE "player_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reported_id" uuid NOT NULL,
	"game_id" uuid,
	"room_id" uuid,
	"reason" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_by" uuid,
	"created_at" bigint NOT NULL,
	"resolved_at" bigint,
	CONSTRAINT "ck_player_report_reason" CHECK (char_length("player_reports"."reason") between 2 and 48),
	CONSTRAINT "ck_player_report_status" CHECK ("player_reports"."status" in ('open', 'reviewing', 'resolved', 'dismissed')),
	CONSTRAINT "ck_player_report_not_self" CHECK ("player_reports"."reporter_id" <> "player_reports"."reported_id")
);
--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_player_a_id_players_id_fk" FOREIGN KEY ("player_a_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_player_b_id_players_id_fk" FOREIGN KEY ("player_b_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_winner_id_players_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "player_achievements" ADD CONSTRAINT "player_achievements_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "player_achievements" ADD CONSTRAINT "player_achievements_achievement_id_achievement_definitions_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievement_definitions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "player_reports" ADD CONSTRAINT "player_reports_reporter_id_players_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "player_reports" ADD CONSTRAINT "player_reports_reported_id_players_id_fk" FOREIGN KEY ("reported_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "player_reports" ADD CONSTRAINT "player_reports_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "player_reports" ADD CONSTRAINT "player_reports_room_id_game_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."game_rooms"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "player_reports" ADD CONSTRAINT "player_reports_resolved_by_players_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "ux_seasons_slug" ON "seasons" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "ix_seasons_status_dates" ON "seasons" USING btree ("status","starts_at","ends_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "ux_tournaments_slug" ON "tournaments" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "ix_tournaments_season_status" ON "tournaments" USING btree ("season_id","status","starts_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "ux_tournament_participant" ON "tournament_participants" USING btree ("tournament_id","player_id");
--> statement-breakpoint
CREATE INDEX "ix_tournament_participants_rank" ON "tournament_participants" USING btree ("tournament_id","score","wins");
--> statement-breakpoint
CREATE UNIQUE INDEX "ux_tournament_match_slot" ON "tournament_matches" USING btree ("tournament_id","round","match_number");
--> statement-breakpoint
CREATE INDEX "ix_tournament_matches_players" ON "tournament_matches" USING btree ("player_a_id","player_b_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX "ux_achievement_definitions_key" ON "achievement_definitions" USING btree ("key");
--> statement-breakpoint
CREATE UNIQUE INDEX "ux_player_achievement" ON "player_achievements" USING btree ("player_id","achievement_id");
--> statement-breakpoint
CREATE INDEX "ix_player_achievements_player_unlocked" ON "player_achievements" USING btree ("player_id","unlocked_at");
--> statement-breakpoint
CREATE INDEX "ix_player_reports_status_created" ON "player_reports" USING btree ("status","created_at");
--> statement-breakpoint
CREATE INDEX "ix_player_reports_reported" ON "player_reports" USING btree ("reported_id","created_at");
--> statement-breakpoint
INSERT INTO "achievement_definitions" ("key", "title", "description", "category", "icon", "points", "target") VALUES
  ('first_win', 'Chiến thắng đầu tiên', 'Thắng ván online đầu tiên.', 'milestone', 'sparkle', 25, 1),
  ('ten_games', 'Vào guồng', 'Hoàn thành 10 ván online.', 'milestone', 'target', 50, 10),
  ('five_wins', 'Chuỗi phong độ', 'Thắng 5 ván online.', 'milestone', 'flame', 75, 5),
  ('multi_game', 'Người chơi đa bàn', 'Chơi ít nhất 3 game khác nhau.', 'explorer', 'compass', 60, 3),
  ('tournament_entry', 'Bước vào giải', 'Tham gia một giải đấu.', 'competition', 'flag', 20, 1),
  ('tournament_podium', 'Lên bục', 'Kết thúc trong top 3 một giải đấu.', 'competition', 'trophy', 100, 1),
  ('reversi_corner', 'Giữ góc', 'Chiếm một góc trong Reversi.', 'gameplay', 'square', 30, 1),
  ('connect4_four', 'Bốn liên tiếp', 'Thắng Connect Four bằng một hàng bốn.', 'gameplay', 'circles-four', 30, 1)
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
WITH "clock" AS (
  SELECT floor(extract(epoch from now()) * 1000)::bigint AS "now_ms"
)
INSERT INTO "seasons" ("id", "slug", "name", "status", "starts_at", "ends_at", "created_at")
SELECT '90000000-0000-4000-8000-000000000001'::uuid, 'season-1', 'Mùa Khai Bàn', 'active', "now_ms" - 86400000, "now_ms" + 7776000000, "now_ms"
FROM "clock"
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
WITH "clock" AS (
  SELECT floor(extract(epoch from now()) * 1000)::bigint AS "now_ms"
)
INSERT INTO "tournaments" ("id", "season_id", "slug", "title", "game_type", "format", "status", "max_players", "starts_at", "ends_at", "rules_json", "created_at", "updated_at")
SELECT '90000000-0000-4000-8000-000000000002'::uuid, '90000000-0000-4000-8000-000000000001'::uuid, 'reversi-mua-khai-ban', 'Reversi: Bàn khai cuộc', 'reversi', 'swiss', 'open', 32, "now_ms" + 172800000, "now_ms" + 604800000, '{"rounds": 5, "time_control": "10+0"}'::jsonb, "now_ms", "now_ms" FROM "clock"
UNION ALL
SELECT '90000000-0000-4000-8000-000000000003'::uuid, '90000000-0000-4000-8000-000000000001'::uuid, 'connect4-tang-toc', 'Connect Four: Tăng tốc', 'connect4', 'single_elimination', 'open', 16, "now_ms" + 259200000, "now_ms" + 518400000, '{"rounds": 4, "time_control": "5+0"}'::jsonb, "now_ms", "now_ms" FROM "clock"
UNION ALL
SELECT '90000000-0000-4000-8000-000000000004'::uuid, '90000000-0000-4000-8000-000000000001'::uuid, 'co-viet-cuoi-tuan', 'Cuối tuần Cờ Việt', 'chess', 'leaderboard', 'open', 64, "now_ms" + 432000000, "now_ms" + 1296000000, '{"games": ["chess", "xiangqi", "caro"], "time_control": "10+0"}'::jsonb, "now_ms", "now_ms" FROM "clock"
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "seasons" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "tournaments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "tournament_participants" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "tournament_matches" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "achievement_definitions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "player_achievements" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "player_reports" ENABLE ROW LEVEL SECURITY;
