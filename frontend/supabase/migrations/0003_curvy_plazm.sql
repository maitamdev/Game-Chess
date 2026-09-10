ALTER TABLE "game_rooms" DROP CONSTRAINT "ck_game_rooms_type";--> statement-breakpoint
ALTER TABLE "game_rooms" DROP CONSTRAINT "ck_game_rooms_shape";--> statement-breakpoint
ALTER TABLE "game_rooms" ADD CONSTRAINT "ck_game_rooms_type" CHECK ("game_rooms"."game_type" in ('chess', 'xiangqi', 'caro', 'jungle', 'oanquan', 'uno', 'tienlen', 'ngua'));--> statement-breakpoint
ALTER TABLE "game_rooms" ADD CONSTRAINT "ck_game_rooms_shape" CHECK ((
        ("game_rooms"."game_type" = 'uno' and "game_rooms"."max_players" between 2 and 4 and "game_rooms"."time_control" is null)
        or
        ("game_rooms"."game_type" = 'tienlen' and "game_rooms"."max_players" = 4 and "game_rooms"."time_control" is null)
        or
        ("game_rooms"."game_type" = 'ngua' and "game_rooms"."max_players" = 4 and "game_rooms"."time_control" is null)
        or
        ("game_rooms"."game_type" not in ('uno', 'tienlen', 'ngua') and "game_rooms"."max_players" = 2 and "game_rooms"."time_control" is not null)
      ));