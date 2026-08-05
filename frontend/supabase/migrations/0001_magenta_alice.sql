DROP INDEX "ix_moves_game_ply";--> statement-breakpoint
CREATE UNIQUE INDEX "ux_moves_game_ply" ON "moves" USING btree ("game_id","ply");--> statement-breakpoint
ALTER TABLE "room_players" ADD CONSTRAINT "ck_room_players_seat" CHECK ("room_players"."seat" between 0 and 3);--> statement-breakpoint
ALTER TABLE "game_rooms" ADD CONSTRAINT "ck_game_rooms_code" CHECK ("game_rooms"."code" ~ '^[A-HJ-NP-Z2-9]{6}$');--> statement-breakpoint
ALTER TABLE "game_rooms" ADD CONSTRAINT "ck_game_rooms_type" CHECK ("game_rooms"."game_type" in ('chess', 'xiangqi', 'caro', 'jungle', 'oanquan', 'uno'));--> statement-breakpoint
ALTER TABLE "game_rooms" ADD CONSTRAINT "ck_game_rooms_status" CHECK ("game_rooms"."status" in ('waiting', 'playing', 'finished'));--> statement-breakpoint
ALTER TABLE "game_rooms" ADD CONSTRAINT "ck_game_rooms_shape" CHECK ((
        ("game_rooms"."game_type" = 'uno' and "game_rooms"."max_players" between 2 and 4 and "game_rooms"."time_control" is null)
        or
        ("game_rooms"."game_type" <> 'uno' and "game_rooms"."max_players" = 2 and "game_rooms"."time_control" is not null)
      ));--> statement-breakpoint
ALTER TABLE "game_rooms" ADD CONSTRAINT "ck_game_rooms_version" CHECK ("game_rooms"."version" >= 0);--> statement-breakpoint
ALTER TABLE "game_rooms" ADD CONSTRAINT "ck_game_rooms_lifetime" CHECK ("game_rooms"."expires_at" > "game_rooms"."created_at" and "game_rooms"."updated_at" >= "game_rooms"."created_at");--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "ck_games_variant" CHECK ("games"."variant" in ('chess', 'xiangqi', 'caro', 'jungle', 'oanquan'));--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "ck_games_status" CHECK ("games"."status" in ('active', 'finished'));--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "ck_games_result" CHECK ("games"."result" is null or "games"."result" in ('white', 'black', 'draw', 'aborted'));--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "ck_games_clock_values" CHECK ("games"."white_ms" >= 0 and "games"."black_ms" >= 0 and "games"."increment_ms" >= 0 and "games"."last_ply" >= 0);--> statement-breakpoint
ALTER TABLE "moves" ADD CONSTRAINT "ck_moves_ply" CHECK ("moves"."ply" > 0);--> statement-breakpoint
ALTER TABLE "moves" ADD CONSTRAINT "ck_moves_time_left" CHECK ("moves"."time_left_ms" >= 0);--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "ck_players_display_name" CHECK (char_length("players"."display_name") between 2 and 24);