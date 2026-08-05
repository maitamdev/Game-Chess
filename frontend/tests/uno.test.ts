import assert from "node:assert/strict";
import test from "node:test";

import {
  applyUnoAction,
  canPlayUnoCard,
  createUnoGame,
  unoPublicView,
  type UnoCard,
  type UnoGameState,
} from "../lib/cards/unoEngine";

function actionState(
  card: UnoCard,
  playerCount = 3,
): UnoGameState {
  return {
    hands: [
      [card, { id: 99, color: "blue", value: "1" }],
      ...Array.from({ length: playerCount - 1 }, (_, seat) => [
        { id: 200 + seat, color: "yellow" as const, value: "2" as const },
      ]),
    ],
    drawPile: Array.from({ length: 12 }, (_, index) => ({
      id: 300 + index,
      color: "green" as const,
      value: "3" as const,
    })),
    discard: [{ id: 1, color: "red", value: "5" }],
    currentSeat: 0,
    direction: 1,
    activeColor: "red",
    winnerSeat: null,
    turn: 1,
    message: "",
  };
}

test("UNO khởi tạo đúng cho phòng 2, 3 và 4 người", () => {
  for (const playerCount of [2, 3, 4]) {
    const game = createUnoGame(playerCount);
    assert.equal(game.hands.length, playerCount);
    assert.deepEqual(
      game.hands.map((hand) => hand.length),
      Array(playerCount).fill(7),
    );
    assert.equal(
      game.hands.flat().length + game.drawPile.length + game.discard.length,
      108,
    );
    assert.match(game.discard[0].value, /^\d$/);
    assert.notEqual(game.discard[0].color, null);
  }
});

test("UNO từ chối số người ngoài khoảng 2 đến 4", () => {
  assert.throws(() => createUnoGame(1), /2-4/);
  assert.throws(() => createUnoGame(5), /2-4/);
});

test("góc nhìn công khai chỉ trả bài của đúng ghế", () => {
  const game = createUnoGame(3);
  const view = unoPublicView(game, 1);
  assert.deepEqual(view.hand, game.hands[1]);
  assert.deepEqual(view.handCounts, [7, 7, 7]);
  assert.equal("hands" in view, false);
});

test("luật đánh bài nhận cùng màu, cùng số và bài đổi màu", () => {
  const top: UnoCard = { id: 1, color: "red", value: "5" };
  assert.equal(
    canPlayUnoCard({ id: 2, color: "red", value: "9" }, top, "red"),
    true,
  );
  assert.equal(
    canPlayUnoCard({ id: 3, color: "blue", value: "5" }, top, "red"),
    true,
  );
  assert.equal(
    canPlayUnoCard({ id: 4, color: null, value: "wild" }, top, "red"),
    true,
  );
  assert.equal(
    canPlayUnoCard({ id: 5, color: "blue", value: "9" }, top, "red"),
    false,
  );
});

test("rút bài tăng tay và chuyển lượt, sai lượt bị từ chối", () => {
  const game = createUnoGame(2);
  const next = applyUnoAction(game, 0, { type: "draw" });
  assert.equal(next.hands[0].length, 8);
  assert.equal(next.currentSeat, 1);
  assert.equal(next.turn, 2);
  assert.throws(
    () => applyUnoAction(next, 0, { type: "draw" }),
    /NOT_YOUR_TURN/,
  );
});

test("lá cấm lượt bỏ qua đúng người kế tiếp", () => {
  const game = actionState({ id: 2, color: "red", value: "skip" });
  const next = applyUnoAction(game, 0, { type: "play", cardId: 2 });
  assert.equal(next.currentSeat, 2);
  assert.equal(next.direction, 1);
});

test("lá đổi chiều đảo thứ tự, riêng hai người cho người đánh đi tiếp", () => {
  const threePlayers = actionState({
    id: 2,
    color: "red",
    value: "reverse",
  });
  const reversed = applyUnoAction(threePlayers, 0, {
    type: "play",
    cardId: 2,
  });
  assert.equal(reversed.direction, -1);
  assert.equal(reversed.currentSeat, 2);

  const twoPlayers = actionState(
    { id: 2, color: "red", value: "reverse" },
    2,
  );
  const repeated = applyUnoAction(twoPlayers, 0, {
    type: "play",
    cardId: 2,
  });
  assert.equal(repeated.currentSeat, 0);
});

test("lá cộng hai bắt đúng người rút bài và mất lượt", () => {
  const game = actionState({ id: 2, color: "red", value: "draw2" });
  const next = applyUnoAction(game, 0, { type: "play", cardId: 2 });
  assert.equal(next.hands[1].length, 3);
  assert.equal(next.currentSeat, 2);
  assert.equal(next.drawPile.length, game.drawPile.length - 2);
});

test("lá đổi màu yêu cầu màu mới và cập nhật màu đang hiệu lực", () => {
  const game = actionState({ id: 2, color: null, value: "wild" });
  assert.throws(
    () => applyUnoAction(game, 0, { type: "play", cardId: 2 }),
    /COLOR_REQUIRED/,
  );
  const next = applyUnoAction(game, 0, {
    type: "play",
    cardId: 2,
    color: "blue",
  });
  assert.equal(next.activeColor, "blue");
  assert.equal(next.currentSeat, 1);
});
