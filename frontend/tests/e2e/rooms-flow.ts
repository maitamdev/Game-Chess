import assert from "node:assert/strict";

let baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";

type RoomGameType =
  | "chess"
  | "xiangqi"
  | "caro"
  | "jungle"
  | "oanquan"
  | "reversi"
  | "connect4"
  | "draughts"
  | "dots"
  | "uno"
  | "tienlen"
  | "ngua"
  | "xidach"
  | "baicao";

interface Room {
  code: string;
  game_type: RoomGameType;
  status: "waiting" | "playing" | "finished";
  is_public: boolean;
  max_players: number;
  time_control: string | null;
  player_count: number;
  is_host: boolean;
  me_seat: number;
  game_id: string | null;
  version: number;
  players: Array<{ id: string; username: string; seat: number }>;
  game?: {
    hand: Array<{ id: string | number }>;
    handCounts: number[];
    pieces?: Array<{ id: string; progress: number }>;
    legalPieceIds?: string[];
    currentSeat: number;
    winnerSeat?: number | null;
    winner?: string | null;
    dice?: number | null;
    rolled?: boolean;
    phase?: "players" | "dealer" | "finished" | "revealing";
    dealerVisible?: Array<{ id: string | number }>;
    dealerCount?: number;
    revealed?: boolean[];
    results?: Array<{ seat: number; outcome: string }>;
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

async function testPublicGameRoutes() {
  const routes = [
    "/",
    "/games",
    "/cards",
    "/minigames",
    "/reversi",
    "/connect4",
    "/coganh",
    "/covay",
    "/checkers",
    "/draughts",
    "/dots",
  ];
  for (const route of routes) {
    const response = await fetch(`${baseUrl}${route}`);
    assert.equal(response.status, 200, `${route}: route công khai phải trả 200`);
  }

  const manifest = await fetch(`${baseUrl}/manifest.webmanifest`);
  assert.equal(manifest.status, 200);
  assert.match(manifest.headers.get("content-type") ?? "", /manifest\+json/);
  assert.match(await manifest.text(), /Kỳ Đài/);

  const serviceWorker = await fetch(`${baseUrl}/sw.js`);
  assert.equal(serviceWorker.status, 200);
  assert.match(await serviceWorker.text(), /startsWith\("\/api\/"\)/);

  const robots = await fetch(`${baseUrl}/robots.txt`);
  assert.equal(robots.status, 200);
  assert.match(await robots.text(), /Disallow: \/api\//);

  const sitemap = await fetch(`${baseUrl}/sitemap.xml`);
  assert.equal(sitemap.status, 200);
  assert.match(await sitemap.text(), /<loc>.*\/tournaments<\/loc>/);
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
    "reversi",
    "connect4",
    "draughts",
    "dots",
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
    const spectator = new GuestClient();
    const spectatorLive = await spectator.request<{
      variant: string;
      your_color: "white" | "black" | null;
    }>(`/api/live/${joined.game_id}/state`);
    assert.equal(hostLive.variant, gameType);
    assert.notEqual(hostLive.your_color, guestLive.your_color);
    assert.equal(spectatorLive.variant, gameType);
    assert.equal(spectatorLive.your_color, null);
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
  const closed = await clients[1].request<Room>(
    `/api/card-rooms/status?code=${room.code}`,
  );
  assert.equal(closed.status, "finished");
}

async function testTienLenRoom() {
  const clients = Array.from({ length: 4 }, () => new GuestClient());
  await Promise.all(
    clients.map((client, index) => client.name(`Tiến Lên P${index + 1}`)),
  );

  const room = await clients[0].request<Room>("/api/rooms/create", {
    body: {
      game_type: "tienlen",
      max_players: 4,
      title: "Tiến Lên cuối tuần",
      is_public: true,
    },
  });
  assert.equal(room.status, "waiting");
  assert.equal(room.max_players, 4);
  assert.equal(room.time_control, null);

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

  const started = await clients[0].request<Room>("/api/card-rooms/start", {
    body: { code: room.code },
  });
  assert.equal(started.status, "playing");
  assert.equal(started.game?.hand.length, 13);
  assert.deepEqual(started.game?.handCounts, [13, 13, 13, 13]);
  assert.equal(started.game?.winnerSeat, null);

  const firstSeat = started.game?.currentSeat ?? 0;
  const firstClient = clients[firstSeat];
  const firstView = await firstClient.request<Room>(
    `/api/card-rooms/status?code=${room.code}`,
  );
  const firstCard = firstView.game?.hand.find((card) => card.id === "spades-3");
  assert.ok(firstCard, "người đi đầu phải giữ 3 bích");
  const afterPlay = await firstClient.request<Room>("/api/card-rooms/action", {
    body: {
      code: room.code,
      action: { type: "play_cards", cardIds: [firstCard.id] },
    },
  });
  assert.equal(afterPlay.game?.hand.length, 12);
  assert.equal(afterPlay.version, started.version + 1);

  const observer = await clients[(firstSeat + 1) % 4].request<Room>(
    `/api/card-rooms/status?code=${room.code}`,
  );
  assert.equal(observer.game?.hand.length, 13);
  assert.equal(observer.game?.handCounts[firstSeat], 12);
}

async function testNguaRoom() {
  const clients = Array.from({ length: 4 }, () => new GuestClient());
  await Promise.all(
    clients.map((client, index) => client.name(`Cá Ngựa P${index + 1}`)),
  );

  const room = await clients[0].request<Room>("/api/rooms/create", {
    body: {
      game_type: "ngua",
      max_players: 4,
      title: "Cá Ngựa cuối tuần",
      is_public: true,
    },
  });
  assert.equal(room.status, "waiting");
  assert.equal(room.max_players, 4);
  assert.equal(room.time_control, null);
  await clients[0].request("/api/card-rooms/start", {
    body: { code: room.code },
    expected: 409,
  });
  for (let index = 1; index < clients.length; index += 1) {
    await clients[index].request<Room>("/api/rooms/join", {
      body: { code: room.code },
    });
  }

  const started = await clients[0].request<Room>("/api/card-rooms/start", {
    body: { code: room.code },
  });
  assert.equal(started.status, "playing");
  assert.equal(started.game?.pieces?.length, 16);
  assert.equal(started.game?.currentSeat, 0);
  assert.equal(started.game?.dice, null);

  const afterRoll = await clients[0].request<Room>("/api/card-rooms/action", {
    body: { code: room.code, action: { type: "roll" } },
  });
  assert.equal(afterRoll.version, started.version + 1);
  assert.ok(
    afterRoll.game?.dice === null ||
      (afterRoll.game?.dice !== undefined && afterRoll.game.dice >= 1 && afterRoll.game.dice <= 6),
  );
  if (afterRoll.game?.rolled && afterRoll.game.legalPieceIds?.[0]) {
    const afterMove = await clients[0].request<Room>("/api/card-rooms/action", {
      body: {
        code: room.code,
        action: { type: "move_piece", pieceId: afterRoll.game.legalPieceIds[0] },
      },
    });
    assert.equal(afterMove.version, afterRoll.version + 1);
  }
}

async function testPartyCardRoom(gameType: "xidach" | "baicao") {
  const clients = [new GuestClient(), new GuestClient()];
  await Promise.all(clients.map((client, index) => client.name(`${gameType} P${index + 1}`)));
  const room = await clients[0].request<Room>("/api/rooms/create", {
    body: { game_type: gameType, max_players: 2, title: `${gameType} E2E`, is_public: true },
  });
  assert.equal(room.status, "waiting");
  assert.equal(room.time_control, null);
  const joined = await clients[1].request<Room>("/api/rooms/join", { body: { code: room.code } });
  assert.equal(joined.player_count, 2);
  let state = await clients[0].request<Room>("/api/card-rooms/start", { body: { code: room.code } });
  assert.equal(state.status, "playing");
  assert.equal(state.game?.hand.length, 2 + (gameType === "baicao" ? 1 : 0));
  assert.equal(state.game?.handCounts[0], gameType === "baicao" ? 3 : 2);

  let guard = 0;
  while (state.status === "playing" && guard < 12) {
    const currentSeat = state.game?.currentSeat ?? -1;
    if (currentSeat < 0) break;
    const action = gameType === "xidach" ? { type: "stand" } : { type: "reveal" };
    state = await clients[currentSeat].request<Room>("/api/card-rooms/action", {
      body: { code: room.code, action },
    });
    guard += 1;
  }
  assert.ok(guard > 0);
  assert.equal(state.status, "finished");
  assert.ok((state.game?.results?.length ?? 0) >= 2);

  const sent = await clients[0].request<{ id: number }>("/api/rooms/chat", {
    body: { code: room.code, message: `E2E ${gameType} chat` },
  });
  assert.ok(sent.id > 0);
  const chat = await clients[1].request<{ messages: Array<{ body: string }> }>(
    `/api/rooms/chat?code=${room.code}`,
  );
  assert.equal(chat.messages.some((message) => message.body === `E2E ${gameType} chat`), true);

  const rematched = await clients[0].request<Room>("/api/card-rooms/rematch", {
    body: { code: room.code },
  });
  assert.equal(rematched.status, "playing");
  await clients[0].request("/api/card-rooms/leave", { body: { code: room.code } });
}

async function testAccountsAndQueue() {
  const first = new GuestClient();
  const second = new GuestClient();
  const firstAccount = await first.request<{ player: { id: string }; account: { login: string } }>(
    "/api/auth/register",
    { body: { login: "e2e_player_one", password: "safe-password-1", display_name: "E2E Một" } },
  );
  assert.equal(firstAccount.account.login, "e2e_player_one");
  const profile = await first.request<{ player: { display_name: string }; account: { login: string } }>("/api/profile");
  assert.equal(profile.player.display_name, "E2E Một");
  assert.equal(profile.account.login, "e2e_player_one");
  await second.request("/api/session", { body: { display_name: "E2E Hai" } });

  const waiting = await first.request<{ status: string }>("/api/queue/join", {
    body: { game_type: "chess", time_control: "10+0" },
  });
  assert.equal(waiting.status, "waiting");
  const matched = await second.request<{ status: string; game_id: string; room_code: string }>("/api/queue/join", {
    body: { game_type: "chess", time_control: "10+0" },
  });
  assert.equal(matched.status, "matched");
  assert.ok(matched.game_id);
  assert.ok(matched.room_code);
  const firstStatus = await first.request<{ queue: { status: string; game_id: string } }>("/api/queue/status");
  assert.equal(firstStatus.queue.status, "matched");
  assert.equal(firstStatus.queue.game_id, matched.game_id);
  await first.request("/api/queue/leave", { method: "POST" });
  await second.request("/api/queue/leave", { method: "POST" });
  await first.request("/api/auth/logout", { method: "POST" });
}

async function testCompetitionPlatform() {
  const seasons = await new GuestClient().request<{
    seasons: Array<{ slug: string; status: string }>;
  }>("/api/seasons");
  assert.ok(seasons.seasons.some((season) => season.slug === "season-1"));

  const anonymous = new GuestClient();
  const list = await anonymous.request<{
    tournaments: Array<{ slug: string; game_type: string; status: string }>;
  }>("/api/tournaments");
  assert.ok(list.tournaments.length >= 3);
  assert.ok(list.tournaments.some((tournament) => tournament.slug === "reversi-mua-khai-ban"));

  const detail = await anonymous.request<{
    slug: string;
    participants: unknown[];
    viewer_registered: boolean;
  }>("/api/tournaments/reversi-mua-khai-ban");
  assert.equal(detail.slug, "reversi-mua-khai-ban");
  assert.equal(detail.viewer_registered, false);

  const player = new GuestClient();
  const other = new GuestClient();
  const playerSession = await player.name("Người Giải E2E");
  const otherSession = await other.name("Người Báo Cáo E2E");
  const joined = await player.request<{
    viewer_registered: boolean;
    participants: Array<{ player: { id: string } }>;
  }>("/api/tournaments/reversi-mua-khai-ban/join", { body: {} });
  assert.equal(joined.viewer_registered, true);
  assert.equal(joined.participants.some((entry) => entry.player.id === playerSession.player.id), true);
  await player.request("/api/tournaments/reversi-mua-khai-ban/join", { body: {}, expected: 409 });

  const achievements = await player.request<{
    achievements: Array<{ key: string; unlocked: boolean }>;
  }>("/api/achievements");
  assert.equal(achievements.achievements.find((achievement) => achievement.key === "tournament_entry")?.unlocked, true);

  const report = await other.request<{ id: number; status: string }>("/api/reports", {
    body: {
      reported_id: playerSession.player.id,
      reason: "Hành vi thử nghiệm",
      details: "Báo cáo E2E để kiểm tra pipeline moderation.",
    },
  });
  assert.ok(report.id > 0);
  assert.equal(report.status, "open");
  assert.equal(otherSession.player.display_name, "Người Báo Cáo E2E");
}

export async function runRoomFlows(
  targetBaseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000",
) {
  baseUrl = targetBaseUrl;
  await testReadiness();
  await testPublicGameRoutes();
  await testGuestSession();
  await testAccountsAndQueue();
  await testCompetitionPlatform();
  await testBoardRooms();
  await testTienLenRoom();
  await testNguaRoom();
  await testPartyCardRoom("xidach");
  await testPartyCardRoom("baicao");
  await testUnoRoom(2);
  await testUnoRoom(3);
  await testUnoRoom(4);
  console.log("E2E room, game board/card, chat phòng, rematch, tài khoản và matchmaking: đạt.");
}
