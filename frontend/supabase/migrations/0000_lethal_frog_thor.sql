CREATE TABLE "room_players" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"seat" integer NOT NULL,
	"joined_at" bigint NOT NULL,
	"last_seen" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_rooms" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"game_type" text NOT NULL,
	"title" text NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"host_player_id" uuid NOT NULL,
	"max_players" integer NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"time_control" text,
	"game_id" uuid,
	"state_json" jsonb,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"expires_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY NOT NULL,
	"white_id" uuid NOT NULL,
	"black_id" uuid NOT NULL,
	"variant" text DEFAULT 'chess' NOT NULL,
	"time_control" text NOT NULL,
	"result" text,
	"termination" text,
	"pgn" text,
	"final_fen" text,
	"started_at" bigint NOT NULL,
	"ended_at" bigint,
	"status" text DEFAULT 'active' NOT NULL,
	"white_ms" integer DEFAULT 0 NOT NULL,
	"black_ms" integer DEFAULT 0 NOT NULL,
	"increment_ms" integer DEFAULT 0 NOT NULL,
	"turn_started_at" bigint,
	"last_ply" integer DEFAULT 0 NOT NULL,
	"draw_offer_from" text,
	"white_last_seen" bigint,
	"black_last_seen" bigint
);
--> statement-breakpoint
CREATE TABLE "moves" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" uuid NOT NULL,
	"ply" integer NOT NULL,
	"san" text NOT NULL,
	"uci" text NOT NULL,
	"fen_after" text NOT NULL,
	"time_left_ms" integer NOT NULL,
	"evaluation" integer
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"created_at" bigint NOT NULL,
	"last_seen" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "room_players" ADD CONSTRAINT "room_players_room_id_game_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."game_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_players" ADD CONSTRAINT "room_players_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_rooms" ADD CONSTRAINT "game_rooms_host_player_id_players_id_fk" FOREIGN KEY ("host_player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_rooms" ADD CONSTRAINT "game_rooms_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_white_id_players_id_fk" FOREIGN KEY ("white_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_black_id_players_id_fk" FOREIGN KEY ("black_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moves" ADD CONSTRAINT "moves_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_room_player" ON "room_players" USING btree ("room_id","player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_room_seat" ON "room_players" USING btree ("room_id","seat");--> statement-breakpoint
CREATE INDEX "ix_room_players_player" ON "room_players" USING btree ("player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_game_rooms_code" ON "game_rooms" USING btree ("code");--> statement-breakpoint
CREATE INDEX "ix_game_rooms_public" ON "game_rooms" USING btree ("is_public","status","updated_at");--> statement-breakpoint
CREATE INDEX "ix_game_rooms_expires" ON "game_rooms" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "ix_games_white_id" ON "games" USING btree ("white_id");--> statement-breakpoint
CREATE INDEX "ix_games_black_id" ON "games" USING btree ("black_id");--> statement-breakpoint
CREATE INDEX "ix_games_started_at" ON "games" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "ix_games_status" ON "games" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ix_moves_game_ply" ON "moves" USING btree ("game_id","ply");--> statement-breakpoint
CREATE INDEX "ix_players_last_seen" ON "players" USING btree ("last_seen");
--> statement-breakpoint
ALTER TABLE "players" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "game_rooms" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "room_players" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "games" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "moves" ENABLE ROW LEVEL SECURITY;
