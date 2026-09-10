import assert from "node:assert/strict";
import test from "node:test";
import { DraughtsGame, initialDraughtsBoard, type DraughtsBoard } from "@/lib/draughts/rules";

test("Cờ Đam khởi tạo 24 quân và Đỏ đi trước", () => {
  const game = new DraughtsGame();
  assert.equal(initialDraughtsBoard().flat().filter(Boolean).length, 24);
  assert.equal(game.turn, "red");
  assert.equal(game.legalMoves().length, 7);
});

test("Cờ Đam bắt buộc ăn và hỗ trợ ăn liên hoàn", () => {
  const board: DraughtsBoard = Array.from({ length: 8 }, () => Array(8).fill(null));
  board[5][0] = { color: "red", king: false };
  board[4][1] = { color: "black", king: false };
  board[2][3] = { color: "black", king: false };
  const game = new DraughtsGame(board);
  assert.deepEqual(game.legalMoves().map((move) => move.to), [{ row: 3, col: 2 }]);
  const continued = game.play(game.legalMoves()[0])!;
  assert.equal(continued.turn, "red");
  assert.deepEqual(continued.legalMoves().map((move) => move.to), [{ row: 1, col: 4 }]);
});

test("Cờ Đam phong vua khi chạm hàng cuối", () => {
  const board: DraughtsBoard = Array.from({ length: 8 }, () => Array(8).fill(null));
  board[1][2] = { color: "red", king: false };
  board[2][7] = { color: "black", king: false };
  const game = new DraughtsGame(board);
  const next = game.play(game.legalMoves().find((move) => move.to.row === 0)!);
  assert.equal(next?.board[0][1]?.king, true);
});
