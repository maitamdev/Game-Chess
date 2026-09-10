CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"player_id" uuid NOT NULL,
	"login" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" bigint NOT NULL,
	"last_login_at" bigint,
	CONSTRAINT "ck_accounts_login" CHECK ("accounts"."login" ~ '^[a-z0-9_]{3,24}$')
);
--> statement-breakpoint
CREATE TABLE "matchmaking_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" uuid NOT NULL,
	"game_type" text NOT NULL,
	"time_control" text NOT NULL,
	"rating" integer DEFAULT 1200 NOT NULL,
	"joined_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "ck_matchmaking_rating" CHECK ("matchmaking_queue"."rating" between 0 and 4000)
);
--> statement-breakpoint
CREATE TABLE "rating_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" uuid NOT NULL,
	"game_type" text NOT NULL,
	"game_id" uuid,
	"result" text NOT NULL,
	"rating_before" integer NOT NULL,
	"rating_after" integer NOT NULL,
	"delta" integer NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" uuid NOT NULL,
	"game_type" text NOT NULL,
	"rating" integer DEFAULT 1200 NOT NULL,
	"games" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"draws" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "ck_ratings_values" CHECK ("ratings"."rating" between 0 and 4000 and "ratings"."games" >= 0 and "ratings"."wins" >= 0 and "ratings"."draws" >= 0 and "ratings"."losses" >= 0)
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchmaking_queue" ADD CONSTRAINT "matchmaking_queue_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_history" ADD CONSTRAINT "rating_history_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_accounts_player" ON "accounts" USING btree ("player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_accounts_login" ON "accounts" USING btree ("login");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_matchmaking_player" ON "matchmaking_queue" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "ix_matchmaking_search" ON "matchmaking_queue" USING btree ("game_type","time_control","rating","joined_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_rating_history_player_game" ON "rating_history" USING btree ("player_id","game_id");--> statement-breakpoint
CREATE INDEX "ix_rating_history_player_created" ON "rating_history" USING btree ("player_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_ratings_player_game" ON "ratings" USING btree ("player_id","game_type");--> statement-breakpoint
CREATE INDEX "ix_ratings_game" ON "ratings" USING btree ("game_type","rating");
--> statement-breakpoint
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "ratings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "rating_history" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "matchmaking_queue" ENABLE ROW LEVEL SECURITY;
