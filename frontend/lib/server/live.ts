/**
 * Ván đấu online trên kiến trúc serverless.
 *
 * Khác backend Python cũ (WebSocket + GameSession trong RAM + watchdog nền):
 * ở đây KHÔNG có tiến trình thường trực. Toàn bộ trạng thái sống trong DB,
 * client poll qua HTTP, và mọi phán quyết theo thời gian được thực hiện
 * "lazy" ngay đầu mỗi request đọc/ghi ván:
 *
 *   1. Huỷ ván  - ply 0 quá 30s mà một bên chưa từng vào ván, hoặc quá 120s.
 *   2. Hết giờ  - đồng hồ suy từ turn_started_at; bên còn lại thiếu lực → hoà.
 *   3. Xử thua rớt mạng - heartbeat = lần poll cuối; quá 60s không poll → thua.
 *
 * Server vẫn là trọng tài duy nhất: mọi nước đi được kiểm bằng bộ luật
 * trong lib/server/rules trước khi ghi.
 */

import { and, asc, eq } from "drizzle-orm";

import { db, games, moves, users } from "./db";
import type { GameRow, MoveRow, UserRow } from "./db";
import { ApiError } from "./errors";
import { createRules, OTHER, type Color, type ServerRules } from "./rules";
import { type Variant } from "./variants";

// 90s (backend cũ 60s): heartbeat giờ là setInterval phía client, tab nền bị
// browser bóp xuống ~1 nhịp/phút - ngưỡng phải lớn hơn hẳn 60s để không xử oan.
const DISCONNECT_FORFEIT_MS = 90_000;
const ABORT_MS = 30_000;
const HARD_ABORT_MS = 120_000;

// ---------------------------------------------------------------------------
// Trạng thái ván + phán quyết lazy
// ---------------------------------------------------------------------------

export interface LiveState {
  game_id: string;
  variant: Variant;
  time_control: string;
  status: "active" | "finished";
  white: { id: string; username: string };
  black: { id: string; username: string };
  your_color: Color | null;
  moves: { ply: number; san: string; uci: string }[];
  ply: number;
  turn: Color;
  white_time_ms: number;
  black_time_ms: number;
  clock_running: boolean;
  server_time: number;
  draw_offer_from: Color | null;
  /** null = đối thủ chưa từng vào ván hoặc ván đã xong */
  opponent_last_seen_ms: number | null;
  disconnect_forfeit_ms: number;
  // khi ván kết thúc:
  result: string | null;
  termination: string | null;
  /** riêng ô ăn quan khi kết thúc tự nhiên */
  score_a: number | null;
  score_b: number | null;
  /** nước bị từ chối của CHÍNH request này (chỉ có ở response move) */
  rejected?: string;
}

interface Loaded {
  game: GameRow;
  moveRows: MoveRow[];
  white: UserRow;
  black: UserRow;
  rules: ServerRules;
  /**
   * Snapshot "rách": games row và bảng moves đọc ở hai thời điểm, một nước đi
   * commit lọt vào giữa (lastPly ≠ số nước đọc được). Khi rách, TUYỆT ĐỐI
   * không phán quyết theo thời gian - đồng hồ trong row là của thế cờ cũ.
   */
  torn: boolean;
}

async function loadGame(gameId: string): Promise<Loaded> {
  for (let attempt = 0; ; attempt++) {
    const gameRows = await db
      .select()
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1);
    const game = gameRows[0];
    if (game === undefined) {
      throw new ApiError(404, "GAME_NOT_FOUND", "Không tìm thấy ván đấu");
    }
    const [moveRows, whiteRows, blackRows] = await Promise.all([
      db
        .select()
        .from(moves)
        .where(eq(moves.gameId, gameId))
        .orderBy(asc(moves.ply)),
      db.select().from(users).where(eq(users.id, game.whiteId)).limit(1),
      db.select().from(users).where(eq(users.id, game.blackId)).limit(1),
    ]);
    const torn = moveRows.length !== game.lastPly;
    if (torn && attempt < 2) continue; // đọc lại cho khớp
    const rules = createRules(
      game.variant as Variant,
      moveRows.map((m) => m.uci),
    );
    return {
      game,
      moveRows,
      white: whiteRows[0],
      black: blackRows[0],
      rules,
      torn,
    };
  }
}

function currentTimes(
  game: GameRow,
  turn: Color,
  now: number,
): { white: number; black: number } {
  let w = game.whiteMs;
  let b = game.blackMs;
  if (game.status === "active" && game.turnStartedAt !== null) {
    const elapsed = now - game.turnStartedAt;
    if (turn === "white") w -= elapsed;
    else b -= elapsed;
  }
  return { white: Math.max(0, Math.floor(w)), black: Math.max(0, Math.floor(b)) };
}

/**
 * Chốt ván trong transaction. Guard kép WHERE status='active' AND
 * lastPly = <ply của snapshot>: hai request cùng phát hiện kết thúc thì chỉ
 * một bên ghi kết quả, và một phán quyết tính trên snapshot CŨ (một nước
 * vừa commit song song) sẽ trượt guard thay vì vô hiệu nước đi hợp lệ.
 * Trả về true nếu chính request này chốt được ván.
 */
async function finalize(
  loaded: Loaded,
  result: "white" | "black" | "draw" | "aborted",
  termination: string,
  clockOverride?: Partial<Pick<GameRow, "whiteMs" | "blackMs">>,
): Promise<boolean> {
  const { game, moveRows, white, black, rules } = loaded;
  const now = Date.now();

  const pgn =
    moveRows.length > 0 || rules.ply() > 0
      ? rules.buildPgn(
          white.username,
          black.username,
          result === "aborted" ? "draw" : result,
          game.timeControl,
          game.startedAt,
        )
      : null;

  let won = false;
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(games)
      .set({
        status: "finished",
        result,
        termination,
        finalFen: rules.fen(),
        endedAt: now,
        pgn,
        drawOfferFrom: null,
        ...clockOverride,
      })
      .where(
        and(
          eq(games.id, game.id),
          eq(games.status, "active"),
          eq(games.lastPly, game.lastPly),
        ),
      )
      .returning({ id: games.id });
    if (updated.length === 0) return; // request khác đã chốt / có nước mới
    won = true;
  });

  if (!won) return false;

  // cập nhật bản sao trong bộ nhớ để build response ngay sau finalize
  game.status = "finished";
  game.result = result;
  game.termination = termination;
  game.endedAt = now;
  game.drawOfferFrom = null;
  if (clockOverride?.whiteMs !== undefined) game.whiteMs = clockOverride.whiteMs;
  if (clockOverride?.blackMs !== undefined) game.blackMs = clockOverride.blackMs;
  return true;
}

/** Hết giờ / xử thua rớt mạng: `loser` thua trừ khi bên kia thiếu lực → hoà. */
async function finishByClock(loaded: Loaded, loser: Color): Promise<void> {
  const winner = OTHER[loser];
  const zeroed =
    loser === "white" ? { whiteMs: 0 as number } : { blackMs: 0 as number };
  if (!loaded.rules.hasMatingMaterial(winner)) {
    await finalize(loaded, "draw", "timeout", zeroed);
  } else {
    await finalize(loaded, winner, "timeout", zeroed);
  }
}

/**
 * Các phán quyết lazy - PHẢI gọi TRƯỚC heartbeat của người request: phán xử
 * dựa trên lastSeen đọc từ DB, nếu heartbeat trước thì người bỏ ván lâu quay
 * lại poll sẽ tự "tẩy trắng" mình và đảo ngược kết quả forfeit/huỷ ván.
 */
async function applyLazyRulings(loaded: Loaded, now: number): Promise<void> {
  const { game, rules } = loaded;
  if (game.status !== "active") return;
  if (loaded.torn) return; // snapshot rách - không phán quyết trên đồng hồ cũ

  // 0. Ván đã kết thúc tự nhiên nhưng finalize trước đó hụt (process chết
  // giữa transaction ghi nước và transaction chốt ván) → chốt lại tại đây,
  // TRƯỚC mọi phán quyết đồng hồ để kết quả không bị lật thành 'timeout'.
  const naturalEnd = rules.detectEnd();
  if (naturalEnd !== null) {
    await finalize(loaded, naturalEnd.result, naturalEnd.termination);
    return;
  }

  // 1. Huỷ ván chưa bắt đầu
  if (rules.ply() === 0) {
    const bothSeen = game.whiteLastSeen !== null && game.blackLastSeen !== null;
    if (
      (now - game.startedAt > ABORT_MS && !bothSeen) ||
      now - game.startedAt > HARD_ABORT_MS
    ) {
      await finalize(loaded, "aborted", "aborted");
      return;
    }
  }

  // 2. Hết giờ theo đồng hồ
  if (game.turnStartedAt !== null) {
    const turn = rules.turnColor();
    const times = currentTimes(game, turn, now);
    if ((turn === "white" ? times.white : times.black) <= 0) {
      await finishByClock(loaded, turn);
      return;
    }
  }

  // 3. Xử thua rớt mạng (chỉ khi ván đã có nước đi; trước đó luật huỷ lo)
  if (rules.ply() >= 1) {
    const stale: [Color, number][] = [];
    if (
      game.whiteLastSeen !== null &&
      now - game.whiteLastSeen > DISCONNECT_FORFEIT_MS
    ) {
      stale.push(["white", game.whiteLastSeen]);
    }
    if (
      game.blackLastSeen !== null &&
      now - game.blackLastSeen > DISCONNECT_FORFEIT_MS
    ) {
      stale.push(["black", game.blackLastSeen]);
    }
    if (stale.length > 0) {
      // cả hai cùng rớt: bên rớt lâu hơn thua
      stale.sort((a, b) => a[1] - b[1]);
      await finishByClock(loaded, stale[0][0]);
    }
  }
}

function colorOf(game: GameRow, userId: string | null): Color | null {
  if (userId === null) return null;
  if (game.whiteId === userId) return "white";
  if (game.blackId === userId) return "black";
  return null;
}

function buildState(
  loaded: Loaded,
  viewerId: string | null,
  now: number,
): LiveState {
  const { game, moveRows, white, black, rules } = loaded;
  const turn = rules.turnColor();
  const times = currentTimes(game, turn, now);
  const yourColor = colorOf(game, viewerId);
  const finished = game.status === "finished";

  let scoreA: number | null = null;
  let scoreB: number | null = null;
  if (finished && game.variant === "oanquan") {
    const end = rules.detectEnd();
    scoreA = end?.scoreA ?? null;
    scoreB = end?.scoreB ?? null;
  }

  const opponent: Color | null = yourColor === null ? null : OTHER[yourColor];
  const opponentLastSeen =
    opponent === null || finished
      ? null
      : opponent === "white"
        ? game.whiteLastSeen
        : game.blackLastSeen;

  return {
    game_id: game.id,
    variant: game.variant as Variant,
    time_control: game.timeControl,
    status: finished ? "finished" : "active",
    white: {
      id: white.id,
      username: white.username,
    },
    black: {
      id: black.id,
      username: black.username,
    },
    your_color: yourColor,
    moves: moveRows.map((m) => ({ ply: m.ply, san: m.san, uci: m.uci })),
    ply: rules.ply(),
    turn,
    white_time_ms: times.white,
    black_time_ms: times.black,
    clock_running: game.status === "active" && game.turnStartedAt !== null,
    server_time: now,
    draw_offer_from: (game.drawOfferFrom as Color | null) ?? null,
    opponent_last_seen_ms: opponentLastSeen,
    disconnect_forfeit_ms: DISCONNECT_FORFEIT_MS,
    result: game.result,
    termination: game.termination,
    score_a: scoreA,
    score_b: scoreB,
  };
}

async function heartbeat(
  game: GameRow,
  color: Color | null,
  now: number,
): Promise<void> {
  if (color === null || game.status !== "active") return;
  const patch =
    color === "white" ? { whiteLastSeen: now } : { blackLastSeen: now };
  await db.update(games).set(patch).where(eq(games.id, game.id));
  if (color === "white") game.whiteLastSeen = now;
  else game.blackLastSeen = now;
}

/** GET state: phán quyết lazy (trên lastSeen cũ) → heartbeat → trạng thái. */
export async function getLiveState(
  gameId: string,
  viewerId: string | null,
): Promise<LiveState> {
  const loaded = await loadGame(gameId);
  const now = Date.now();
  await applyLazyRulings(loaded, now);
  await heartbeat(loaded.game, colorOf(loaded.game, viewerId), now);
  return buildState(loaded, viewerId, now);
}

// ---------------------------------------------------------------------------
// Hành động của người chơi
// ---------------------------------------------------------------------------

function rejected(
  loaded: Loaded,
  viewerId: string,
  reason: string,
  now: number,
): LiveState {
  return { ...buildState(loaded, viewerId, now), rejected: reason };
}

export async function playMove(
  gameId: string,
  user: UserRow,
  uci: string,
  ply: number,
): Promise<LiveState> {
  const loaded = await loadGame(gameId);
  const now = Date.now();
  const color = colorOf(loaded.game, user.id);
  await applyLazyRulings(loaded, now);
  await heartbeat(loaded.game, color, now);
  const { game, moveRows, rules } = loaded;

  if (game.status !== "active") return rejected(loaded, user.id, "game_over", now);
  // snapshot rách: đồng hồ trong row thuộc thế cờ cũ - không được trừ giờ
  // trên đó; từ chối để client sync lại nhịp sau
  if (loaded.torn) return rejected(loaded, user.id, "ply_mismatch", now);
  if (color === null) return rejected(loaded, user.id, "not_in_game", now);
  if (rules.turnColor() !== color) {
    return rejected(loaded, user.id, "not_your_turn", now);
  }
  if (ply !== rules.ply() + 1) {
    return rejected(loaded, user.id, "ply_mismatch", now);
  }

  const clockRunning = game.turnStartedAt !== null;
  const elapsed = clockRunning ? now - (game.turnStartedAt ?? now) : 0;
  const sideMs = color === "white" ? game.whiteMs : game.blackMs;

  // Hết giờ ngay tại thời điểm nhận nước đi
  if (clockRunning && sideMs - elapsed <= 0) {
    await finishByClock(loaded, color);
    return buildState(loaded, user.id, now);
  }

  const applied = rules.tryMove(uci);
  if (applied === null) {
    // không trừ giờ cho nước bất hợp lệ - turn_started_at giữ nguyên
    return rejected(loaded, user.id, "illegal", now);
  }

  const newSideMs = clockRunning ? sideMs - elapsed + game.incrementMs : sideMs;
  const newPly = rules.ply(); // đã gồm nước vừa áp
  const clearDrawOffer =
    game.drawOfferFrom !== null && game.drawOfferFrom !== color;

  await db.transaction(async (tx) => {
    const patch: Partial<GameRow> = {
      lastPly: newPly,
      turnStartedAt: now, // đồng hồ chạy từ sau nước đi đầu tiên
      ...(color === "white" ? { whiteMs: newSideMs } : { blackMs: newSideMs }),
      ...(clearDrawOffer ? { drawOfferFrom: null } : {}),
    };
    const updated = await tx
      .update(games)
      .set(patch)
      .where(
        and(
          eq(games.id, game.id),
          eq(games.status, "active"),
          eq(games.lastPly, ply - 1), // guard chống double-submit song song
        ),
      )
      .returning({ id: games.id });
    if (updated.length === 0) {
      throw new ApiError(409, "PLY_CONFLICT", "Nước đi bị trùng");
    }
    await tx.insert(moves).values({
      gameId: game.id,
      ply: newPly,
      san: applied.san,
      uci: applied.uci,
      fenAfter: applied.fenAfter,
      timeLeftMs: Math.max(0, Math.floor(newSideMs)),
    });
  });

  // đồng bộ bản sao trong bộ nhớ
  game.lastPly = newPly;
  game.turnStartedAt = now;
  if (color === "white") game.whiteMs = newSideMs;
  else game.blackMs = newSideMs;
  if (clearDrawOffer) game.drawOfferFrom = null;
  moveRows.push({
    id: 0,
    gameId: game.id,
    ply: newPly,
    san: applied.san,
    uci: applied.uci,
    fenAfter: applied.fenAfter,
    timeLeftMs: Math.max(0, Math.floor(newSideMs)),
    evaluation: null,
  });

  const end = rules.detectEnd();
  if (end !== null) {
    await finalize(loaded, end.result, end.termination);
  }
  return buildState(loaded, user.id, now);
}

export async function resign(gameId: string, user: UserRow): Promise<LiveState> {
  // finalize có guard lastPly - nếu trượt vì một nước vừa commit song song,
  // nạp lại snapshot mới và đầu hàng lại (đầu hàng vẫn hợp lệ sau nước đó).
  for (let attempt = 0; attempt < 3; attempt++) {
    const loaded = await loadGame(gameId);
    const now = Date.now();
    const color = colorOf(loaded.game, user.id);
    await applyLazyRulings(loaded, now);
    await heartbeat(loaded.game, color, now);
    if (loaded.game.status !== "active" || color === null || loaded.torn) {
      return buildState(loaded, user.id, now);
    }
    if (await finalize(loaded, OTHER[color], "resignation")) {
      return buildState(loaded, user.id, now);
    }
  }
  return getLiveState(gameId, user.id);
}

export async function drawAction(
  gameId: string,
  user: UserRow,
  action: "offer" | "accept" | "decline",
): Promise<LiveState> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const loaded = await loadGame(gameId);
    const now = Date.now();
    const color = colorOf(loaded.game, user.id);
    await applyLazyRulings(loaded, now);
    await heartbeat(loaded.game, color, now);
    const { game } = loaded;

    if (game.status !== "active" || color === null) {
      return buildState(loaded, user.id, now);
    }
    if (action === "offer") {
      await db
        .update(games)
        .set({ drawOfferFrom: color })
        .where(and(eq(games.id, game.id), eq(games.status, "active")));
      game.drawOfferFrom = color;
      return buildState(loaded, user.id, now);
    }
    if (game.drawOfferFrom === null || game.drawOfferFrom === color) {
      return buildState(loaded, user.id, now);
    }
    if (action === "decline") {
      await db
        .update(games)
        .set({ drawOfferFrom: null })
        .where(eq(games.id, game.id));
      game.drawOfferFrom = null;
      return buildState(loaded, user.id, now);
    }
    // accept - finalize trượt guard lastPly (nước vừa commit song song, offer
    // có thể đã bị nước của bên nhận vô hiệu) → nạp lại và xét lại từ đầu.
    if (loaded.torn) continue;
    if (await finalize(loaded, "draw", "agreement")) {
      return buildState(loaded, user.id, now);
    }
  }
  return getLiveState(gameId, user.id);
}
