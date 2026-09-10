import assert from "node:assert/strict";
import test from "node:test";

import {
  applyBaiCaoAction,
  applyXiDachAction,
  baiCaoPublicView,
  createBaiCaoGame,
  createXiDachGame,
  xiDachPublicView,
} from "../lib/cards/partyEngine";

test("Xì Dách online chia bài cho 2-4 người và che lá nhà cái", () => {
  const game = createXiDachGame(3);
  assert.deepEqual(game.playerHands.map((hand) => hand.length), [2, 2, 2]);
  assert.equal(game.dealerHand.length, 2);
  assert.equal(new Set([...game.playerHands.flat(), ...game.dealerHand, ...game.drawPile].map((card) => card.id)).size, 52);
  const view = xiDachPublicView(game, 0);
  assert.equal(view.hand.length, 2);
  assert.equal(view.dealerVisible.length, 1);
  assert.equal(view.dealerCount, 2);
});

test("Xì Dách online xử lý lượt dừng đến khi có kết quả", () => {
  let game = createXiDachGame(2);
  let guard = 0;
  while (game.phase !== "finished" && guard < 10) {
    game = applyXiDachAction(game, game.currentSeat, { type: "stand" });
    guard += 1;
  }
  assert.equal(game.phase, "finished");
  assert.equal(game.results.length, 2);
  assert.equal(xiDachPublicView(game, 0).dealerVisible.length, game.dealerHand.length);
});

test("Bài Cào online chỉ hoàn tất sau khi tất cả ghế lật bài", () => {
  let game = createBaiCaoGame(4);
  assert.deepEqual(game.hands.map((hand) => hand.length), [3, 3, 3, 3]);
  for (let index = 0; index < 4; index += 1) {
    game = applyBaiCaoAction(game, game.currentSeat, { type: "reveal" });
    if (index < 3) assert.equal(game.phase, "revealing");
  }
  assert.equal(game.phase, "finished");
  assert.equal(game.results.length, 4);
  assert.equal(baiCaoPublicView(game, 0).revealed.every(Boolean), true);
});
