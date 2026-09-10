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
  const prefixes: Record<Exclude<RoomGameType, "uno" | "tienlen" | "ngua" | "xidach" | "baicao">, string> = {
    chess: "/play/online",
    xiangqi: "/xiangqi/online",
    caro: "/caro/online",
    jungle: "/jungle/online",
    oanquan: "/oanquan/online",
    reversi: "/reversi/online",
    connect4: "/connect4/online",
    draughts: "/draughts/online",
    dots: "/dots/online",
  };
  for (const [game, prefix] of Object.entries(prefixes)) {
    assert.equal(
      roomDestination({
        code: "ABC234",
        game_type: game as Exclude<RoomGameType, "uno" | "tienlen" | "ngua" | "xidach" | "baicao">,
        status: "playing",
        game_id: "game-id",
      }),
      `${prefix}/game-id`,
    );
  }
});

test("phòng Tiến Lên mở đúng bàn bài nhiều người", () => {
  assert.equal(
    roomDestination({
      code: "TL2345",
      game_type: "tienlen",
      status: "waiting",
      game_id: null,
    }),
    "/cards/tienlen/room/TL2345",
  );
});

test("phòng Cá Ngựa mở đúng bàn xúc xắc nhiều người", () => {
  assert.equal(
    roomDestination({
      code: "NG2345",
      game_type: "ngua",
      status: "waiting",
      game_id: null,
    }),
    "/ngua/room/NG2345",
  );
});

test("phòng Xì Dách và Bài Cào mở đúng bàn bài", () => {
  for (const game of ["xidach", "baicao"] as const) {
    assert.equal(
      roomDestination({
        code: "CA2345",
        game_type: game,
        status: "waiting",
        game_id: null,
      }),
      `/cards/${game}/room/CA2345`,
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
