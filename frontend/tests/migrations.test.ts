import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";

const migrationsDir = join(process.cwd(), "supabase", "migrations");

async function applyMigrations(db: PGlite) {
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  assert.ok(files.length > 0, "phải có ít nhất một migration");
  for (const file of files) {
    const sql = await readFile(join(migrationsDir, file), "utf8");
    await db.exec(sql.replaceAll("--> statement-breakpoint", ""));
  }
}

test("migration Supabase tạo đúng schema và chặn dữ liệu phòng sai", async () => {
  const db = new PGlite();
  try {
    await applyMigrations(db);

    const tables = await db.query<{ table_name: string }>(
      `select table_name
       from information_schema.tables
       where table_schema = 'public' and table_type = 'BASE TABLE'
       order by table_name`,
    );
    assert.deepEqual(
      tables.rows.map((row) => row.table_name),
      [
        "accounts",
        "achievement_definitions",
        "game_rooms",
        "games",
        "matchmaking_queue",
        "moves",
        "player_achievements",
        "player_reports",
        "players",
        "rating_history",
        "ratings",
        "room_messages",
        "room_players",
        "seasons",
        "tournament_matches",
        "tournament_participants",
        "tournaments",
      ],
    );

    const rls = await db.query<{ relname: string; relrowsecurity: boolean }>(
      `select relname, relrowsecurity
       from pg_class
       where relname in ('players', 'game_rooms', 'room_players', 'games', 'moves', 'accounts', 'ratings', 'rating_history', 'matchmaking_queue', 'room_messages', 'seasons', 'tournaments', 'tournament_participants', 'tournament_matches', 'achievement_definitions', 'player_achievements', 'player_reports')
       order by relname`,
    );
    assert.equal(rls.rows.length, 17);
    assert.equal(rls.rows.every((row) => row.relrowsecurity), true);

    await db.exec(`
      insert into players (id, display_name, created_at, last_seen)
      values
        ('00000000-0000-4000-8000-000000000001', 'Minh', 1, 1),
        ('00000000-0000-4000-8000-000000000002', 'Lan', 1, 1);

      insert into game_rooms (
        id, code, game_type, title, host_player_id, max_players,
        status, created_at, updated_at, expires_at
      ) values (
        '10000000-0000-4000-8000-000000000001', 'ABC234', 'uno', 'Phòng UNO',
        '00000000-0000-4000-8000-000000000001', 4,
        'waiting', 1, 1, 2
      );
    `);

    await assert.rejects(
      db.exec(`
        insert into players (id, display_name, created_at, last_seen)
        values ('00000000-0000-4000-8000-000000000003', 'x', 1, 1)
      `),
      /ck_players_display_name/,
    );
    await assert.rejects(
      db.exec(`
        insert into game_rooms (
          id, code, game_type, title, host_player_id, max_players,
          status, created_at, updated_at, expires_at
        ) values (
          '10000000-0000-4000-8000-000000000002', 'ABC10O', 'uno', 'Sai mã',
          '00000000-0000-4000-8000-000000000001', 4,
          'waiting', 1, 1, 2
        )
      `),
      /ck_game_rooms_code/,
    );
    await assert.rejects(
      db.exec(`
        insert into game_rooms (
          id, code, game_type, title, host_player_id, max_players,
          status, time_control, created_at, updated_at, expires_at
        ) values (
          '10000000-0000-4000-8000-000000000003', 'XYZ234', 'chess', 'Sai ghế',
          '00000000-0000-4000-8000-000000000001', 3,
          'waiting', '10+0', 1, 1, 2
        )
      `),
      /ck_game_rooms_shape/,
    );
  } finally {
    await db.close();
  }
});

test("migration bảo đảm mỗi ván chỉ có một nước đi cho mỗi ply", async () => {
  const db = new PGlite();
  try {
    await applyMigrations(db);
    await db.exec(`
      insert into players (id, display_name, created_at, last_seen)
      values
        ('00000000-0000-4000-8000-000000000001', 'Minh', 1, 1),
        ('00000000-0000-4000-8000-000000000002', 'Lan', 1, 1);

      insert into games (
        id, white_id, black_id, variant, time_control, started_at
      ) values (
        '20000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000002',
        'chess', '10+0', 1
      );

      insert into moves (
        game_id, ply, san, uci, fen_after, time_left_ms
      ) values (
        '20000000-0000-4000-8000-000000000001',
        1, 'e4', 'e2e4', 'fen', 599000
      );
    `);

    await assert.rejects(
      db.exec(`
        insert into moves (
          game_id, ply, san, uci, fen_after, time_left_ms
        ) values (
          '20000000-0000-4000-8000-000000000001',
          1, 'd4', 'd2d4', 'fen', 598000
        )
      `),
      /ux_moves_game_ply/,
    );
  } finally {
    await db.close();
  }
});
