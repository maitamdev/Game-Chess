import assert from "node:assert/strict";
import test from "node:test";

import { ReversiGame } from "@/lib/reversi/rules";

test("Reversi khởi tạo bốn quân và Đen đi trước", () => {
  const game = new ReversiGame();
  assert.deepEqual(game.score(), { black: 2, white: 2 });
  assert.equal(game.turn, "black");
  assert.equal(game.legalMoves().length, 4);
});

test("Reversi lật đúng dãy quân theo nước hợp lệ", () => {
  const next = new ReversiGame().play(2, 3);
  assert.ok(next);
  assert.equal(next.board[2][3], "black");
  assert.equal(next.board[3][3], "black");
  assert.deepEqual(next.score(), { black: 4, white: 1 });
  assert.equal(next.turn, "white");
});

test("Reversi từ chối nước không kẹp quân và cho bỏ lượt khi bí nước", () => {
  const game = new ReversiGame();
  assert.equal(game.play(0, 0), null);
  const blockedBoard = Array.from({ length: 8 }, () => Array(8).fill("black"));
  blockedBoard[0][0] = null;
  const blocked = new ReversiGame(blockedBoard, "white");
  assert.equal(blocked.legalMoves().length, 0);
  assert.equal(blocked.pass()?.turn, "black");
});
