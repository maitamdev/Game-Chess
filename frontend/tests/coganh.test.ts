import assert from "node:assert/strict";
import test from "node:test";

import { GanhGame, initialGanhBoard, type GanhBoard } from "@/lib/coganh/rules";

test("Cờ Gánh khởi tạo 16 quân trên biên và có nước đi vào lòng bàn", () => {
  const game = new GanhGame();
  assert.deepEqual(game.score(), { red: 8, blue: 8 });
  assert.ok(game.legalMoves().some((move) => move.toRow > 0 && move.toRow < 4 && move.toCol > 0 && move.toCol < 4));
});

test("Cờ Gánh đi từng bước và gánh đôi quân đối phương", () => {
  const board: GanhBoard = Array.from({ length: 5 }, () => Array(5).fill(null));
  board[2][1] = "blue";
  board[2][3] = "blue";
  board[1][1] = "red";
  const next = new GanhGame(board, "red").play(1, 1, 2, 2);
  assert.ok(next);
  assert.equal(next.board[2][1], "red");
  assert.equal(next.board[2][3], "red");
  assert.deepEqual(next.score(), { red: 3, blue: 0 });
});

test("Cờ Gánh từ chối đi xa hơn một nút", () => {
  const game = new GanhGame(initialGanhBoard());
  assert.equal(game.play(0, 0, 2, 2), null);
});
