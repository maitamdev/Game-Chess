import assert from "node:assert/strict";

let baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";

type RoomGameType =
  | "chess"
  | "xiangqi"
  | "caro"
  | "jungle"
  | "oanquan"
  | "uno";

interface Room {
  code: string;
  game_type: RoomGameType;
  status: "waiting" | "playing" | "finished";
  is_public: boolean;
  max_players: number;
  player_count: number;
  is_host: boolean;
  me_seat: number;
  game_id: string | null;
  version: number;
  players: Array<{ id: string; username: string; seat: number }>;
  game?: {
    hand: Array<{ id: number }>;
    handCounts: number[];
    currentSeat: number;
    winnerSeat: number | null;
  };
}

class GuestClient {
  cookie = "";

  async request<T>(
    path: string,
    options: { method?: string; body?: unknown; expected?: number } = {},
  ): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? (options.body === undefined ? "GET" : "POST"),
      headers: {
        ...(options.body === undefined
          ? {}
          : { "content-type": "application/json" }),
        ...(this.cookie ? { cookie: this.cookie } : {}),
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) this.cookie = setCookie.split(";", 1)[0];

    const payload = (await response.json().catch(() => null)) as T;
    const expected = options.expected ?? 200;
    assert.equal(
      response.status,
      expected,
      `${path}: mong ${expected}, nhận ${response.status} ${JSON.stringify(payload)}`,
    );
    return payload;
  }

  async name(displayName: string) {
    return this.request<{ player: { id: string; display_name: string } }>(
      "/api/session",
      { body: { display_name: displayName } },
    );
  }
}

async function testGuestSession() {
  const guest = new GuestClient();
  const created = await guest.name("Khách E2E");
  const renamed = await guest.name("Khách Đổi Tên");
  assert.equal(renamed.player.id, created.player.id);
  assert.equal(renamed.player.display_name, "Khách Đổi Tên");

  const anonymous = new GuestClient();
  await anonymous.request("/api/rooms/create", {
    body: { game_type: "chess" },
    expected: 401,
  });
}

async function testReadiness() {
  const client = new GuestClient();
  const health = await client.request<{
    status: string;
    database: string;
  }>("/api/health");
  assert.deepEqual(health, {
    status: "ok",
    database: "connected",
  });
}

async function testBoardRooms() {
  const host = new GuestClient();
  const guest = new GuestClient();
  await host.name("Chủ Bàn Cờ");
  await guest.name("Khách Bàn Cờ");

  const variants: Exclude<RoomGameType, "uno">[] = [
    "chess",
    "xiangqi",
    "caro",
    "jungle",
    "oanquan",
  ];
  for (const gameType of variants) {
    const created = await host.request<Room>("/api/rooms/create", {
      body: {
        game_type: gameType,
        time_control: "10+0",
        title: `Bàn ${gameType}`,
        is_public: true,
      },
    });
    assert.equal(created.status, "waiting");
    assert.equal(created.player_count, 1);
    assert.match(created.code, /^[A-HJ-NP-Z2-9]{6}$/);

    const publicRooms = await guest.request<{ rooms: Room[] }>(
      `/api/rooms/public?game=${gameType}`,
    );
    assert.equal(
      publicRooms.rooms.some((room) => room.code === created.code),
      true,
    );

    const joined = await guest.request<Room>("/api/rooms/join", {
      body: { code: created.code.toLowerCase() },
    });
    assert.equal(joined.status, "playing");
    assert.equal(joined.player_count, 2);
    assert.ok(joined.game_id);

    const joinedAgain = await guest.request<Room>("/api/rooms/join", {
      body: { code: created.code },
    });
    assert.equal(joinedAgain.player_count, 2);
    assert.equal(joinedAgain.game_id, joined.game_id);

    const hostStatus = await host.request<Room>(
      `/api/rooms/status?code=${created.code}`,
    );
    assert.equal(hostStatus.game_id, joined.game_id);

    const hostLive = await host.request<{
      variant: string;
      your_color: "white" | "black";
      white: { id: string };
      black: { id: string };
    }>(`/api/live/${joined.game_id}/state`);
    const guestLive = await guest.request<{
      variant: string;
      your_color: "white" | "black";
    }>(`/api/live/${joined.game_id}/state`);
    assert.equal(hostLive.variant, gameType);
    assert.notEqual(hostLive.your_color, guestLive.your_color);
  }

  const privateRoom = await host.request<Room>("/api/rooms/create", {
    body: {
      game_type: "chess",
      time_control: "5+0",
      title: "Bàn kín",
      is_public: false,
    },
  });
  const publicRooms = await guest.request<{ rooms: Room[] }>(
    "/api/rooms/public?game=chess",
  );
  assert.equal(
    publicRooms.rooms.some((room) => room.code === privateRoom.code),
    false,
  );
  const joinedPrivate = await guest.request<Room>("/api/rooms/join", {
    body: { code: privateRoom.code },
  });
  assert.equal(joinedPrivate.status, "playing");
}

async function testUnoRoom(playerCount: 2 | 3 | 4) {
  const clients = Array.from({ length: playerCount }, () => new GuestClient());
  await Promise.all(
    clients.map((client, index) => client.name(`UNO ${playerCount} P${index + 1}`)),
  );

  const room = await clients[0].request<Room>("/api/rooms/create", {
    body: {
      game_type: "uno",
      max_players: playerCount,
      title: `UNO ${playerCount} người`,
      is_public: true,
    },
  });
  assert.equal(room.max_players, playerCount);

  await clients[0].request("/api/card-rooms/start", {
    body: { code: room.code },
    expected: 409,
  });

  for (let index = 1; index < clients.length; index += 1) {
    const joined = await clients[index].request<Room>("/api/rooms/join", {
      body: { code: room.code },
    });
    assert.equal(joined.player_count, index + 1);
  }

  if (playerCount === 2) {
    const extra = new GuestClient();
    await extra.name("UNO Người Dư");
    await extra.request("/api/rooms/join", {
      body: { code: room.code },
      expected: 409,
    });
    await clients[1].request("/api/card-rooms/start", {
      body: { code: room.code },
      expected: 403,
    });
  }

  const started = await clients[0].request<Room>("/api/card-rooms/start", {
    body: { code: room.code },
  });
  assert.equal(started.status, "playing");
  assert.equal(started.game?.hand.length, 7);
  assert.deepEqual(started.game?.handCounts, Array(playerCount).fill(7));

  const afterDraw = await clients[0].request<Room>("/api/card-rooms/action", {
    body: { code: room.code, action: { type: "draw" } },
  });
  assert.equal(afterDraw.game?.hand.length, 8);
  assert.equal(afterDraw.game?.currentSeat, 1);
  assert.equal(afterDraw.version, started.version + 1);

  const secondView = await clients[1].request<Room>(
    `/api/card-rooms/status?code=${room.code}`,
  );
  assert.equal(secondView.game?.hand.length, 7);
  assert.equal(secondView.game?.handCounts[0], 8);
  assert.equal(secondView.game?.currentSeat, 1);

  await clients[0].request("/api/card-rooms/leave", {
    body: { code: room.code },
  });
  await clients[1].request(`/api/card-rooms/status?code=${room.code}`, {
    expected: 404,
  });
}

export async function runRoomFlows(
  targetBaseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000",
) {
  baseUrl = targetBaseUrl;
  await testReadiness();
  await testGuestSession();
  await testBoardRooms();
  await testUnoRoom(2);
  await testUnoRoom(3);
  await testUnoRoom(4);
  console.log("E2E phòng khách, mã phòng, danh sách công khai và UNO: đạt.");
}
