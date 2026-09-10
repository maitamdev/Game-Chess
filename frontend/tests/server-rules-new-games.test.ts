import assert from "node:assert/strict";
import test from "node:test";

import { createRules } from "../lib/server/rules";
import { DotsGame } from "../lib/dots/rules";

test("server Reversi dùng UCI riêng, lật quân và phát hiện kết thúc", () => {
  const rules = createRules("reversi", []);
  assert.equal(rules.turnColor(), "white");
  const move = rules.tryMove("r2c3");
  assert.ok(move);
  assert.equal(move.uci, "r2c3");
  assert.equal(rules.ply(), 1);
  assert.equal(rules.turnColor(), "black");
  assert.equal(rules.tryMove("r0c0"), null);
  assert.match(rules.fen(), /\//);
});

test("server Connect Four thả quân, đổi lượt và kết thúc khi đủ bốn", () => {
  const rules = createRules("connect4", []);
  for (const column of [0, 0, 1, 1, 2, 2, 3]) {
    assert.ok(rules.tryMove(`c${column}`));
  }
  assert.equal(rules.ply(), 7);
  assert.deepEqual(rules.detectEnd(), {
    result: "white",
    termination: "four_in_a_row",
  });
  assert.equal(rules.tryMove("c4"), null);
});

test("server rule rebuild lại được lịch nước của game mới", () => {
  const reversi = createRules("reversi", ["r2c3", "r2c2"]);
  assert.equal(reversi.ply(), 2);
  const connect4 = createRules("connect4", ["c3", "c2", "c3"]);
  assert.equal(connect4.ply(), 3);
  assert.equal(connect4.turnColor(), "black");
});

test("server Cờ Đam giữ lượt ăn liên hoàn và dựng lại đúng thế cờ", () => {
  const rules = createRules("draughts", ["d5041", "d2130"]);
  assert.equal(rules.ply(), 2);
  assert.equal(rules.turnColor(), "white");
  assert.match(rules.fen(), /\/.* [rb] -/);
});

test("server Dots & Boxes ghi cạnh, giữ lượt khi khép ô và kết thúc đủ 40 cạnh", () => {
  const rules = createRules("dots", []);
  let game = new DotsGame();
  while (game.winner() === null) {
    const edge = game.legalMoves()[0];
    const uci = `${edge.orientation}${edge.row}${edge.col}`;
    assert.ok(rules.tryMove(uci));
    game = game.play(edge)!;
  }
  assert.equal(rules.ply(), 40);
  const end = rules.detectEnd();
  assert.ok(end);
  assert.equal(typeof end.scoreA, "number");
  assert.equal(typeof end.scoreB, "number");
});
