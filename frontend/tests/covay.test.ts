import assert from "node:assert/strict";
import test from "node:test";

import { GoGame } from "@/lib/covay/rules";

test("Cờ Vây khởi tạo bàn 9×9 và Đen đi trước", () => {
  const game = new GoGame();
  assert.equal(game.legalMoves().length, 81);
  assert.deepEqual(game.score(), { black: 0, white: 0 });
});

test("Cờ Vây bắt nhóm quân hết khí", () => {
  let game = new GoGame();
  game = game.play(1, 1)!; // Đen
  game = game.play(0, 1)!; // Trắng
  game = game.play(3, 3)!; // Đen
  game = game.play(1, 0)!; // Trắng
  game = game.play(4, 4)!; // Đen
  game = game.play(1, 2)!; // Trắng
  game = game.play(5, 5)!; // Đen
  game = game.play(2, 1)!; // Trắng ăn quân ở 1,1
  assert.equal(game.board[1][1], null);
});

test("Cờ Vây cho bỏ lượt liên tiếp để kết thúc ván", () => {
  const game = new GoGame().pass()!;
  assert.equal(game.winner(), null);
  const finished = game.pass()!;
  assert.equal(finished.winner(), "draw");
});
