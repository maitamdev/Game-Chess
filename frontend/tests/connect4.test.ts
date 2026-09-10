import assert from "node:assert/strict";
import test from "node:test";

import { Connect4Game, type Connect4Board } from "@/lib/connect4/rules";

test("Connect Four thả quân từ dưới lên và đổi lượt", () => {
  let game = new Connect4Game();
  game = game.play(3)!;
  game = game.play(3)!;
  assert.equal(game.board[5][3], "red");
  assert.equal(game.board[4][3], "yellow");
  assert.equal(game.turn, "red");
});

test("Connect Four nhận diện chuỗi bốn quân ngang", () => {
  let game = new Connect4Game();
  for (const column of [0, 0, 1, 1, 2, 2, 3]) game = game.play(column)!;
  assert.equal(game.winner(), "red");
  assert.equal(game.play(4), null);
});

test("Connect Four nhận diện chuỗi chéo và chặn cột đầy", () => {
  let game = new Connect4Game();
  for (const column of [4, 1, 5, 0, 4, 1, 5, 2, 0, 5, 5, 5, 2, 1, 3, 3, 3, 2, 2]) game = game.play(column)!;
  assert.equal(game.winner(), "red");

  const fullColumn: Connect4Board = Array.from({ length: 6 }, (_, row) => [row % 2 === 0 ? "red" : "yellow", null, null, null, null, null, null]);
  const full = new Connect4Game(fullColumn, "red");
  assert.equal(full.validColumns().includes(0), false);
  assert.equal(full.play(0), null);
});
