import assert from "node:assert/strict";
import test from "node:test";

import {
  applyTienLenAction,
  createTienLenGame,
  tienLenPublicView,
  type TienLenState,
} from "../lib/cards/tienlenEngine";

test("Tiến Lên online tạo bộ bài 4 người không trùng lá", () => {
  const game = createTienLenGame();
  assert.equal(game.hands.length, 4);
  assert.deepEqual(game.hands.map((hand) => hand.length), [13, 13, 13, 13]);
  const ids = game.hands.flat().map((card) => card.id);
  assert.equal(new Set(ids).size, 52);
  assert.ok(game.hands[game.currentSeat].some((card) => card.id === "spades-3"));
});

test("Tiến Lên online chỉ trả tay bài của đúng ghế và chặn sai lượt", () => {
  const game = createTienLenGame();
  const firstCard = game.hands[game.currentSeat][0];
  const view = tienLenPublicView(game, game.currentSeat);
  assert.equal(view.hand.length, 13);
  assert.equal(view.handCounts.length, 4);

  const wrongSeat = (game.currentSeat + 1) % 4;
  assert.throws(
    () => applyTienLenAction(game, wrongSeat, { type: "play_cards", cardIds: [firstCard.id] }),
    /NOT_YOUR_TURN/,
  );
});

test("Tiến Lên online xử lý đánh bài, bỏ lượt và kết thúc ván", () => {
  const card = { id: "spades-3", suit: "spades" as const, rank: "3" as const };
  const state: TienLenState = {
    gameType: "tienlen",
    hands: [[card], [{ id: "clubs-4", suit: "clubs", rank: "4" }], [{ id: "diamonds-5", suit: "diamonds", rank: "5" }], [{ id: "hearts-6", suit: "hearts", rank: "6" }]],
    currentSeat: 0,
    lastPlay: null,
    passes: 0,
    finishOrder: [],
    winnerSeat: null,
    turn: 1,
    message: "",
  };
  const next = applyTienLenAction(state, 0, {
    type: "play_cards",
    cardIds: [card.id],
  });
  assert.equal(next.winnerSeat, 0);
  assert.deepEqual(next.finishOrder, [0]);
  assert.equal(next.hands[0].length, 0);
});

