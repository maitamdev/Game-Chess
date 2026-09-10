import assert from "node:assert/strict";
import test from "node:test";

import {
  applyNguaAction,
  createNguaGame,
  nguaPublicView,
  type NguaState,
} from "../lib/ngua/engine";
import { createNguaPieces } from "../lib/ngua/rules";

test("Cá Ngựa online khởi tạo bốn màu và che quyền chọn quân", () => {
  const game = createNguaGame();
  assert.equal(game.pieces.length, 16);
  const view = nguaPublicView(game, 0);
  assert.equal(view.currentSeat, 0);
  assert.deepEqual(view.legalPieceIds, []);
  assert.equal(view.dice, null);
});

test("Cá Ngựa online đổ xúc xắc ở server và chỉ cho đi sau khi đổ", () => {
  const game = createNguaGame();
  const next = applyNguaAction(game, 0, { type: "roll" });
  assert.ok(next.dice === null || (next.dice >= 1 && next.dice <= 6));
  if (next.dice !== null) {
    assert.equal(next.rolled, true);
    assert.throws(
      () => applyNguaAction(next, 0, { type: "roll" }),
      /DICE_ALREADY_ROLLED/,
    );
  } else {
    assert.equal(next.currentSeat, 1);
  }
});

test("Cá Ngựa online công nhận thắng khi cả bốn quân về chuồng", () => {
  const pieces = createNguaPieces().map((piece) =>
    piece.color === "red"
      ? { ...piece, progress: piece.id === "red-0" ? 54 : 55 }
      : piece,
  );
  const state: NguaState = {
    gameType: "ngua",
    pieces,
    currentSeat: 0,
    dice: 1,
    rolled: true,
    winner: null,
    turn: 1,
    message: "",
    lastMove: null,
  };
  const next = applyNguaAction(state, 0, {
    type: "move_piece",
    pieceId: "red-0",
  });
  assert.equal(next.winner, "red");
  assert.equal(next.currentSeat, 0);
  assert.equal(next.pieces.filter((piece) => piece.color === "red" && piece.progress === 55).length, 4);
});

