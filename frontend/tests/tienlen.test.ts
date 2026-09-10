import assert from "node:assert/strict";
import test from "node:test";
import type { StandardCard } from "@/lib/cards/deck";
import {
  canBeat,
  evaluateTienLenPlay,
  findFirstPlayer,
  getWhiteWinReason,
} from "@/lib/cards/tienlen";

function card(rank: StandardCard["rank"], suit: StandardCard["suit"]): StandardCard {
  return { id: `${suit}-${rank}`, rank, suit };
}

test("nhận diện các bộ cơ bản và không cho 2 vào sảnh", () => {
  assert.equal(evaluateTienLenPlay([card("7", "spades")])?.kind, "single");
  assert.equal(evaluateTienLenPlay([card("8", "spades"), card("8", "hearts")])?.kind, "pair");
  assert.equal(evaluateTienLenPlay([card("3", "spades"), card("4", "clubs"), card("5", "hearts")])?.kind, "straight");
  assert.equal(evaluateTienLenPlay([card("Q", "spades"), card("K", "clubs"), card("A", "hearts"), card("2", "diamonds")]), null);
});

test("chặt heo theo hàng phổ biến", () => {
  const two = evaluateTienLenPlay([card("2", "spades")])!;
  const threePairs = evaluateTienLenPlay([
    card("5", "spades"), card("5", "hearts"),
    card("6", "clubs"), card("6", "diamonds"),
    card("7", "spades"), card("7", "hearts"),
  ])!;
  const fourPairs = evaluateTienLenPlay([
    card("8", "spades"), card("8", "hearts"),
    card("9", "clubs"), card("9", "diamonds"),
    card("10", "spades"), card("10", "hearts"),
    card("J", "clubs"), card("J", "diamonds"),
  ])!;
  const pairTwo = evaluateTienLenPlay([card("2", "spades"), card("2", "hearts")])!;

  assert.equal(canBeat(threePairs, two), true);
  assert.equal(canBeat(fourPairs, pairTwo), true);
  assert.equal(canBeat(threePairs, pairTwo), false);
});

test("xác định người giữ 3 bích đi trước", () => {
  const hands = [
    [card("A", "hearts")],
    [card("3", "spades")],
    [card("9", "clubs")],
    [card("2", "diamonds")],
  ];
  assert.equal(findFirstPlayer(hands), 1);
});

test("tới trắng ván đầu với tứ quý 3", () => {
  const hand = [
    card("3", "spades"), card("3", "clubs"), card("3", "diamonds"), card("3", "hearts"),
  ];
  assert.equal(getWhiteWinReason(hand, true), "Tứ quý 3");
});
