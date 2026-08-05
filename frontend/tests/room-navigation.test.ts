import assert from "node:assert/strict";
import test from "node:test";

import {
  roomDestination,
  type RoomGameType,
} from "../lib/rooms/navigation";

test("phòng bàn cờ đang chờ ở lại sảnh", () => {
  assert.equal(
    roomDestination({
      code: "ABC234",
      game_type: "chess",
      status: "waiting",
      game_id: null,
    }),
    null,
  );
});

test("ván bàn cờ đang chơi mở đúng trang của từng game", () => {
  const prefixes: Record<Exclude<RoomGameType, "uno">, string> = {
    chess: "/play/online",
    xiangqi: "/xiangqi/online",
    caro: "/caro/online",
    jungle: "/jungle/online",
    oanquan: "/oanquan/online",
  };
  for (const [game, prefix] of Object.entries(prefixes)) {
    assert.equal(
      roomDestination({
        code: "ABC234",
        game_type: game as Exclude<RoomGameType, "uno">,
        status: "playing",
        game_id: "game-id",
      }),
      `${prefix}/game-id`,
    );
  }
});

test("phòng UNO luôn mở bằng mã phòng", () => {
  assert.equal(
    roomDestination({
      code: "UNO234",
      game_type: "uno",
      status: "waiting",
      game_id: null,
    }),
    "/cards/uno/room/UNO234",
  );
});
