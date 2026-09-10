import assert from "node:assert/strict";
import test from "node:test";
import { DotsGame } from "@/lib/dots/rules";

test("Dots & Boxes khởi tạo 40 cạnh và 16 ô trống", () => {
  const game = new DotsGame();
  assert.equal(game.legalMoves().length, 40);
  assert.deepEqual(game.score(), { red: 0, blue: 0 });
});

test("Dots & Boxes cho người khép ô đi tiếp", () => {
  let game = new DotsGame();
  game = game.play({ orientation: "h", row: 0, col: 0 })!;
  game = game.play({ orientation: "v", row: 0, col: 0 })!;
  game = game.play({ orientation: "h", row: 1, col: 0 })!;
  game = game.play({ orientation: "h", row: 0, col: 1 })!;
  const scoring = game.play({ orientation: "v", row: 0, col: 1 })!;
  assert.equal(scoring.score().red, 1);
  assert.equal(scoring.turn, "red");
});

test("Dots & Boxes kết thúc và xác định người thắng", () => {
  const boxes = Array.from({ length: 4 }, () => Array<"red" | "blue">(4).fill("red"));
  const game = new DotsGame(undefined, undefined, boxes);
  assert.equal(game.winner(), "red");
});
