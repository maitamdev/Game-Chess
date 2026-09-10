import assert from "node:assert/strict";
import test from "node:test";

import {
  BOARD_GAME_IDS,
  GAME_DEFINITIONS,
  ROOM_GAME_TYPES,
  getGameDefinition,
  isCatalogGameId,
} from "../lib/games/registry";

test("registry liệt kê đủ game bàn cờ và room hiện tại", () => {
  assert.deepEqual(BOARD_GAME_IDS, [
    "chess",
    "xiangqi",
    "caro",
    "jungle",
    "oanquan",
    "reversi",
    "connect4",
    "draughts",
    "dots",
  ]);
  assert.deepEqual(ROOM_GAME_TYPES, [
    ...BOARD_GAME_IDS,
    "uno",
    "tienlen",
    "ngua",
    "xidach",
    "baicao",
  ]);
});

test("registry mô tả đúng capability của game local và online", () => {
  assert.equal(getGameDefinition("tienlen").online, "ready");
  assert.equal(getGameDefinition("chess").online, "ready");
  assert.equal(getGameDefinition("ngua").players.max, 4);
  assert.equal(getGameDefinition("2048").modes.includes("local"), true);
  assert.equal(isCatalogGameId("not-a-game"), false);
  assert.equal(getGameDefinition("reversi").modes.includes("computer"), true);
  assert.equal(getGameDefinition("connect4").route, "/connect4");
  assert.equal(getGameDefinition("draughts").online, "ready");
  assert.equal(getGameDefinition("dots").onlinePath, "/dots/online");
  assert.equal(getGameDefinition("coganh").players.max, 2);
  assert.equal(getGameDefinition("covay").route, "/covay");
  assert.equal(getGameDefinition("checkers").route, "/checkers");
  assert.equal(getGameDefinition("draughts").route, "/draughts");
  assert.equal(getGameDefinition("dots").route, "/dots");
  assert.equal(Object.keys(GAME_DEFINITIONS).length, 20);
});
