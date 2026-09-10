import assert from "node:assert/strict";
import test from "node:test";

import {
  isRoomGameType,
  normalizeRoomCode,
  normalizeRoomTitle,
} from "../lib/server/rooms";

test("mã phòng được chuẩn hóa để người chơi có thể nhập thường hoặc có khoảng trắng", () => {
  assert.equal(normalizeRoomCode("  ab3x9k  "), "AB3X9K");
});

test("tên phòng được dọn khoảng trắng và giới hạn 48 ký tự", () => {
  assert.equal(
    normalizeRoomTitle("  Bàn   cuối tuần  ", "Lan"),
    "Bàn cuối tuần",
  );
  assert.equal(normalizeRoomTitle("x".repeat(80), "Lan").length, 48);
});

test("tên phòng quá ngắn dùng tên chủ phòng làm phương án dự phòng", () => {
  assert.equal(normalizeRoomTitle(" ", "Minh"), "Phòng của Minh");
  assert.equal(normalizeRoomTitle("x", "Minh"), "Phòng của Minh");
});

test("danh sách game phòng chỉ nhận các game được hỗ trợ", () => {
  for (const game of [
    "chess",
    "xiangqi",
    "caro",
    "jungle",
    "oanquan",
    "reversi",
    "connect4",
    "draughts",
    "dots",
    "uno",
    "tienlen",
    "ngua",
    "xidach",
    "baicao",
  ]) {
    assert.equal(isRoomGameType(game), true);
  }
  assert.equal(isRoomGameType("blackjack"), false);
  assert.equal(isRoomGameType(""), false);
});
