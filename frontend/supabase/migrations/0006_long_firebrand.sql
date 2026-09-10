ALTER TABLE "matchmaking_queue" ADD COLUMN "status" text DEFAULT 'waiting' NOT NULL;--> statement-breakpoint
ALTER TABLE "matchmaking_queue" ADD COLUMN "room_code" text;--> statement-breakpoint
ALTER TABLE "matchmaking_queue" ADD COLUMN "game_id" uuid;--> statement-breakpoint
ALTER TABLE "matchmaking_queue" ADD COLUMN "matched_at" bigint;--> statement-breakpoint
ALTER TABLE "matchmaking_queue" ADD CONSTRAINT "ck_matchmaking_status" CHECK ("matchmaking_queue"."status" in ('waiting', 'matched'));