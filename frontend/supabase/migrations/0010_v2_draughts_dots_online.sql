-- Kỳ Đài v2: mở Cờ Đam và Dots & Boxes vào live server-authoritative.
ALTER TABLE "game_rooms" DROP CONSTRAINT "ck_game_rooms_type";
ALTER TABLE "game_rooms" ADD CONSTRAINT "ck_game_rooms_type" CHECK ("game_rooms"."game_type" in ('chess', 'xiangqi', 'caro', 'jungle', 'oanquan', 'reversi', 'connect4', 'draughts', 'dots', 'uno', 'tienlen', 'ngua', 'xidach', 'baicao'));

ALTER TABLE "games" DROP CONSTRAINT "ck_games_variant";
ALTER TABLE "games" ADD CONSTRAINT "ck_games_variant" CHECK ("games"."variant" in ('chess', 'xiangqi', 'caro', 'jungle', 'oanquan', 'reversi', 'connect4', 'draughts', 'dots'));

ALTER TABLE "tournaments" DROP CONSTRAINT "ck_tournaments_game_type";
ALTER TABLE "tournaments" ADD CONSTRAINT "ck_tournaments_game_type" CHECK ("tournaments"."game_type" in ('chess', 'xiangqi', 'caro', 'jungle', 'oanquan', 'reversi', 'connect4', 'draughts', 'dots', 'uno', 'tienlen', 'ngua', 'xidach', 'baicao'));

ALTER TABLE "game_rooms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "games" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tournaments" ENABLE ROW LEVEL SECURITY;
