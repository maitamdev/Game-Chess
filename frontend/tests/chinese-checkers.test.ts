import assert from "node:assert/strict";
import test from "node:test";

import { allCheckersCoords, ChineseCheckersGame, coordKey, initialChineseCheckersBoard } from "@/lib/checkers/rules";

test("Chinese Checkers tạo bàn lục giác rút gọn và hai trại 10 quân", () => {
  const board = initialChineseCheckersBoard();
  assert.equal(allCheckersCoords().length, 61);
  assert.equal(Object.values(board).filter((cell) => cell === "red").length, 10);
  assert.equal(Object.values(board).filter((cell) => cell === "yellow").length, 10);
});

test("Chinese Checkers cho đi một bước và nhảy qua quân đang chiếm chỗ", () => {
  const board: Record<string, "red" | "yellow" | null> = Object.fromEntries(
    allCheckersCoords().map((coord) => [coordKey(coord), null]),
  );
  board["0:0"] = "red";
  board["1:0"] = "yellow";
  const game = new ChineseCheckersGame(board);
  const moves = game.destinations({ q: 0, r: 0 });
  assert.equal(moves.some((move) => coordKey(move.to) === "2:0" && move.jumps === 1), true);
  assert.ok(game.play({ q: 0, r: 0 }, { q: 2, r: 0 }));
});

test("Chinese Checkers không cho nhảy ra ngoài bàn hoặc đi quân đối thủ", () => {
  const game = new ChineseCheckersGame();
  assert.deepEqual(game.destinations({ q: 0, r: 4 }), []);
  assert.equal(game.play({ q: 0, r: 4 }, { q: 0, r: 3 }), null);
});
