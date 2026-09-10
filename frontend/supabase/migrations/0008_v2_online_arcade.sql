-- Kỳ Đài v2: mở hai game chiến thuật mới trên đường ray room + games/moves.
ALTER TABLE "game_rooms" DROP CONSTRAINT "ck_game_rooms_type";
--> statement-breakpoint
ALTER TABLE "game_rooms" ADD CONSTRAINT "ck_game_rooms_type" CHECK ("game_rooms"."game_type" in ('chess', 'xiangqi', 'caro', 'jungle', 'oanquan', 'reversi', 'connect4', 'uno', 'tienlen', 'ngua', 'xidach', 'baicao'));
--> statement-breakpoint
ALTER TABLE "games" DROP CONSTRAINT "ck_games_variant";
--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "ck_games_variant" CHECK ("games"."variant" in ('chess', 'xiangqi', 'caro', 'jungle', 'oanquan', 'reversi', 'connect4'));
--> statement-breakpoint
ALTER TABLE "players" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "game_rooms" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "games" ENABLE ROW LEVEL SECURITY;
