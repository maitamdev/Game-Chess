import assert from "node:assert/strict";
import test from "node:test";
import {
  absolutePosition,
  applyNguaMove,
  canMovePiece,
  type NguaPiece,
} from "@/lib/ngua/rules";

function piece(id: string, color: NguaPiece["color"], progress: number): NguaPiece {
  return { id, color, progress, slot: Number(id.split("-")[1] ?? 0) };
}

test("quân trong chuồng chỉ ra với 1 hoặc 6", () => {
  const horse = piece("red-0", "red", -1);
  assert.equal(canMovePiece(horse, 1, [horse]), true);
  assert.equal(canMovePiece(horse, 6, [horse]), true);
  assert.equal(canMovePiece(horse, 4, [horse]), false);
});

test("đi đúng số và không được vượt ô chuồng cuối", () => {
  const horse = piece("red-0", "red", 50);
  assert.equal(canMovePiece(horse, 5, [horse]), true);
  assert.equal(canMovePiece(horse, 6, [horse]), false);
});

test("đá quân đối thủ về chuồng và được thêm lượt", () => {
  const red = piece("red-0", "red", 4);
  const blue = piece("blue-0", "blue", 44);
  assert.equal((absolutePosition(red)! + 1) % 52, absolutePosition(blue));
  const result = applyNguaMove([red, blue], red.id, 1);
  assert.ok(result);
  assert.equal(result.kicked.length, 1);
  assert.equal(result.pieces.find((item) => item.id === blue.id)?.progress, -1);
  assert.equal(result.extraTurn, true);
});

test("không được nhảy qua cụm quân chặn đường", () => {
  const red = piece("red-0", "red", 0);
  const blueA = piece("blue-0", "blue", 40);
  const blueB = piece("blue-1", "blue", 40);
  assert.equal(canMovePiece(red, 3, [red, blueA, blueB]), false);
});
