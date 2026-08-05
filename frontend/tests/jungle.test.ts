import assert from "node:assert/strict";
import test from "node:test";

import {
  Jungle,
  jgCoords,
  type JgColor,
  type JgPiece,
  type JgRank,
} from "../lib/jungle/rules";

type JungleInternals = {
  squares: (JgPiece | null)[];
  side: JgColor;
};

function boardIndex(square: string): number {
  const { rank, file } = jgCoords(square);
  return rank * 7 + file;
}

function position(
  side: JgColor,
  pieces: Array<[square: string, color: JgColor, rank: JgRank]>,
): Jungle {
  const game = new Jungle();
  const internal = game as unknown as JungleInternals;
  internal.squares.fill(null);
  internal.side = side;
  for (const [square, color, rank] of pieces) {
    internal.squares[boardIndex(square)] = { color, rank };
  }
  return game;
}

function targets(game: Jungle, square: string): string[] {
  return game.moves({ square }).map((move) => move.to);
}

test("Cờ thú khởi tạo đủ 16 quân và bên Đỏ đi trước", () => {
  const game = new Jungle();
  const pieces = game.pieces();

  assert.equal(game.turn(), "r");
  assert.equal(pieces.length, 16);
  assert.equal(pieces.filter((piece) => piece.color === "r").length, 8);
  assert.equal(pieces.filter((piece) => piece.color === "b").length, 8);
  assert.deepEqual(game.get("a0"), { color: "r", rank: 7 });
  assert.deepEqual(game.get("g8"), { color: "b", rank: 7 });
});

test("quân chỉ ăn cấp thấp hơn hoặc bằng cấp của mình", () => {
  const weaker = position("r", [
    ["d2", "r", 2],
    ["d3", "b", 3],
  ]);
  assert.equal(targets(weaker, "d2").includes("d3"), false);

  const stronger = position("r", [
    ["d2", "r", 3],
    ["d3", "b", 2],
  ]);
  assert.equal(targets(stronger, "d2").includes("d3"), true);
});

test("Chuột ăn được Voi, còn Voi không ăn được Chuột", () => {
  const ratAttacks = position("r", [
    ["d2", "r", 1],
    ["d3", "b", 8],
  ]);
  assert.equal(targets(ratAttacks, "d2").includes("d3"), true);

  const elephantAttacks = position("r", [
    ["d2", "r", 8],
    ["d3", "b", 1],
  ]);
  assert.equal(targets(elephantAttacks, "d2").includes("d3"), false);
});

test("chỉ Chuột được xuống sông và không được ăn xuyên ranh giới nước", () => {
  const rat = position("r", [["a3", "r", 1]]);
  assert.equal(targets(rat, "a3").includes("b3"), true);

  const cat = position("r", [["a3", "r", 2]]);
  assert.equal(targets(cat, "a3").includes("b3"), false);

  const waterRat = position("r", [
    ["b3", "r", 1],
    ["a3", "b", 8],
  ]);
  assert.equal(targets(waterRat, "b3").includes("a3"), false);
});

test("Sư tử và Hổ nhảy qua sông nhưng bị Chuột chặn", () => {
  const clearRiver = position("r", [["a3", "r", 6]]);
  assert.equal(targets(clearRiver, "a3").includes("d3"), true);

  const blockedRiver = position("r", [
    ["a3", "r", 6],
    ["b3", "b", 1],
  ]);
  assert.equal(targets(blockedRiver, "a3").includes("d3"), false);
});

test("quân trong bẫy đối phương bị hạ cấp và không được vào hang của mình", () => {
  const trapped = position("r", [
    ["c1", "r", 1],
    ["c0", "b", 8],
  ]);
  assert.equal(targets(trapped, "c1").includes("c0"), true);

  const ownDen = position("r", [["d1", "r", 4]]);
  assert.equal(targets(ownDen, "d1").includes("d0"), false);
});

test("vào hang đối phương kết thúc ván ngay lập tức", () => {
  const game = position("r", [
    ["d7", "r", 2],
    ["a8", "b", 6],
  ]);

  assert.ok(game.move("d7d8"));
  assert.deepEqual(game.gameEnd(), { winner: "r", termination: "den" });
});

test("hoàn tác khôi phục chính xác thế cờ, lượt đi và số ply", () => {
  const game = new Jungle();
  const initialFen = game.fen();

  assert.ok(game.move("a2a3"));
  assert.ok(game.move("g6g5"));
  assert.equal(game.ply, 2);

  assert.ok(game.undo());
  assert.ok(game.undo());
  assert.equal(game.fen(), initialFen);
  assert.equal(game.turn(), "r");
  assert.equal(game.ply, 0);
});
