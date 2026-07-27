/**
 * Ván đấu online + ghép cặp trên kiến trúc serverless (Vercel).
 *
 * Khác backend Python cũ (WebSocket + GameSession trong RAM + watchdog nền):
 * ở đây KHÔNG có tiến trình thường trực. Toàn bộ trạng thái sống trong DB,
 * client poll qua HTTP, và mọi phán quyết theo thời gian được thực hiện
 * "lazy" ngay đầu mỗi request đọc/ghi ván:
 *
 *   1. Huỷ ván  — ply 0 quá 30s mà một bên chưa từng vào ván, hoặc quá 120s.
 *   2. Hết giờ  — đồng hồ suy từ turn_started_at; bên còn lại thiếu lực → hoà.
 *   3. Xử thua rớt mạng — heartbeat = lần poll cuối; quá 60s không poll → thua.
 *
 * Ghép cặp cũng không có vòng lặp nền: mỗi lần join/poll status đều thử ghép
 * trong transaction; entry không poll quá 15s bị dọn khỏi hàng đợi.
 * Server vẫn là trọng tài duy nhất: mọi nước đi được kiểm bằng bộ luật
 * trong lib/server/rules trước khi ghi.
 */

import { and, asc, eq, isNull, lt, or } from "drizzle-orm";

import { db, games, moves, queueEntries, ratingHistory, users } from "./db";
import type { GameRow, MoveRow, UserRow } from "./db";
import { eloChanges } from "./elo";
import { ApiError } from "./errors";
import { createRules, OTHER, type Color, type ServerRules } from "./rules";
import {
  isVariant,
  parseTimeControl,
  userVariantStats,
  VALID_TIME_CONTROLS,
  VARIANT_STATS,
  type Variant,
} from "./variants";

// Cấu hình — giữ nguyên giá trị backend cũ
const MM_BASE_BAND = 100;
const MM_BAND_STEP = 50;
const MM_STEP_MS = 5_000;
const MM_MAX_BAND = 400;
const QUEUE_STALE_MS = 15_000;
// 90s (backend cũ 60s): heartbeat giờ là setInterval phía client, tab nền bị
// browser bóp xuống ~1 nhịp/phút — ngưỡng phải lớn hơn hẳn 60s để không xử oan.
const DISCONNECT_FORFEIT_MS = 90_000;
const ABORT_MS = 30_000;
const HARD_ABORT_MS = 120_000;

// ---------------------------------------------------------------------------
// Ghép cặp
// ---------------------------------------------------------------------------

function band(joinedAt: number, now: number): number {
  const widened =
    MM_BASE_BAND + MM_BAND_STEP * Math.floor((now - joinedAt) / MM_STEP_MS);
  return Math.min(widened, MM_MAX_BAND);
}

async function activeGameOf(userId: string): Promise<GameRow | null> {
  const rows = await db
    .select()
    .from(games)
    .where(
      and(
        eq(games.status, "active"),
        or(eq(games.whiteId, userId), eq(games.blackId, userId)),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Thử ghép các entry chưa matched trong một bucket (variant, tc). */
async function tryMatchBucket(
  variant: Variant,
  timeControl: string,
  now: number,
): Promise<void> {
  await db.transaction(async (tx) => {
    // dọn entry chết (không poll quá hạn) trước khi ghép
    await tx
      .delete(queueEntries)
      .where(
        and(
          eq(queueEntries.variant, variant),
          eq(queueEntries.timeControl, timeControl),
          isNull(queueEntries.matchedGameId),
          lt(queueEntries.lastSeen, now - QUEUE_STALE_MS),
        ),
      );

    const entries = await tx
      .select()
      .from(queueEntries)
      .where(
        and(
          eq(queueEntries.variant, variant),
          eq(queueEntries.timeControl, timeControl),
          isNull(queueEntries.matchedGameId),
        ),
      )
      .orderBy(asc(queueEntries.joinedAt));

    const taken = new Set<number>();
    for (let i = 0; i < entries.length - 1; i++) {
      if (taken.has(i)) continue;
      const a = entries[i];
      for (let j = i + 1; j < entries.length; j++) {
        if (taken.has(j)) continue;
        const b = entries[j];
        const diff = Math.abs(a.elo - b.elo);
        if (diff > band(a.joinedAt, now) || diff > band(b.joinedAt, now)) {
          continue;
        }
        taken.add(i);
        taken.add(j);

        // Bốc màu 50/50 rồi tạo ván
        const [w, bl] = Math.random() < 0.5 ? [a, b] : [b, a];
        const { initialMs, incrementMs } = parseTimeControl(timeControl);
        const gameId = crypto.randomUUID();
        await tx.insert(games).values({
          id: gameId,
          whiteId: w.userId,
          blackId: bl.userId,
          variant,
          timeControl,
          whiteEloBefore: w.elo,
          blackEloBefore: bl.elo,
          startedAt: now,
          status: "active",
          whiteMs: initialMs,
          blackMs: initialMs,
          incrementMs,
          lastPly: 0,
        });
        await tx
          .update(queueEntries)
          .set({ matchedGameId: gameId })
          .where(eq(queueEntries.id, a.id));
        await tx
          .update(queueEntries)
          .set({ matchedGameId: gameId })
          .where(eq(queueEntries.id, b.id));
        break;
      }
    }
  });
}

export interface QueueStatus {
  status: "idle" | "waiting" | "matched";
  position?: number;
  game_id?: string;
  variant?: Variant;
  time_control?: string;
}

export async function joinQueue(
  user: UserRow,
  variantRaw: string,
  timeControl: string,
): Promise<QueueStatus> {
  if (
    !isVariant(variantRaw) ||
    !(VALID_TIME_CONTROLS as readonly string[]).includes(timeControl)
  ) {
    throw new ApiError(
      400,
      "INVALID_TIME_CONTROL",
      "Thể thức hoặc loại cờ không hợp lệ",
    );
  }
  const variant = variantRaw;

  // Entry cũ đã được ghép mà chưa nhận? — giao ván đó thay vì xếp hàng lại
  // (xoá mù entry matched sẽ đẩy user vào hai ván active cùng lúc). Chỉ giao
  // khi ván CÒN active — entry mồ côi trỏ tới ván đã xong thì dọn đi.
  const mine = await db
    .select()
    .from(queueEntries)
    .where(eq(queueEntries.userId, user.id))
    .limit(1);
  if (mine[0]?.matchedGameId != null) {
    const entry = mine[0];
    await db.delete(queueEntries).where(eq(queueEntries.id, entry.id));
    const matchedRows = await db
      .select({ status: games.status })
      .from(games)
      .where(eq(games.id, entry.matchedGameId!))
      .limit(1);
    if (matchedRows[0]?.status === "active") {
      return {
        status: "matched",
        game_id: entry.matchedGameId!,
        variant: entry.variant as Variant,
        time_control: entry.timeControl,
      };
    }
    // ván đã kết thúc/huỷ — rơi xuống xếp hàng bình thường
  }

  const active = await activeGameOf(user.id);
  if (active !== null) {
    throw new ApiError(409, "ALREADY_IN_GAME", "Bạn đang có ván đấu chưa kết thúc");
  }

  const now = Date.now();
  const { elo } = userVariantStats(user, variant);
  // chỉ xoá entry CHƯA ghép — entry matched trong khe cửa sổ trên được giữ lại
  await db
    .delete(queueEntries)
    .where(
      and(eq(queueEntries.userId, user.id), isNull(queueEntries.matchedGameId)),
    );
  try {
    await db.insert(queueEntries).values({
      userId: user.id,
      variant,
      timeControl,
      elo,
      joinedAt: now,
      lastSeen: now,
    });
  } catch {
    // vi phạm unique(user_id): entry vừa được matcher gắn game trong khe này
    return queueStatus(user);
  }
  await tryMatchBucket(variant, timeControl, now);
  return queueStatus(user);
}

export async function leaveQueue(user: UserRow): Promise<void> {
  await db
    .delete(queueEntries)
    .where(
      and(eq(queueEntries.userId, user.id), isNull(queueEntries.matchedGameId)),
    );
}

export async function queueStatus(user: UserRow): Promise<QueueStatus> {
  const now = Date.now();
  const rows = await db
    .select()
    .from(queueEntries)
    .where(eq(queueEntries.userId, user.id))
    .limit(1);
  let entry = rows[0];
  if (entry === undefined) {
    // Có thể entry đã bị dọn nhưng ván vừa được tạo — kiểm tra ván active
    const active = await activeGameOf(user.id);
    if (active !== null) {
      return {
        status: "matched",
        game_id: active.id,
        variant: active.variant as Variant,
        time_control: active.timeControl,
      };
    }
    return { status: "idle" };
  }

  if (entry.matchedGameId === null) {
    await db
      .update(queueEntries)
      .set({ lastSeen: now })
      .where(eq(queueEntries.id, entry.id));
    await tryMatchBucket(entry.variant as Variant, entry.timeControl, now);
    const after = await db
      .select()
      .from(queueEntries)
      .where(eq(queueEntries.id, entry.id))
      .limit(1);
    entry = after[0] ?? entry;
  }

  if (entry.matchedGameId !== null) {
    await db.delete(queueEntries).where(eq(queueEntries.id, entry.id));
    const matchedRows = await db
      .select({ status: games.status })
      .from(games)
      .where(eq(games.id, entry.matchedGameId))
      .limit(1);
    if (matchedRows[0]?.status === "active") {
      return {
        status: "matched",
        game_id: entry.matchedGameId,
        variant: entry.variant as Variant,
        time_control: entry.timeControl,
      };
    }
    return { status: "idle" }; // entry mồ côi — ván đã xong từ lâu
  }

  const bucket = await db
    .select({ joinedAt: queueEntries.joinedAt })
    .from(queueEntries)
    .where(
      and(
        eq(queueEntries.variant, entry.variant),
        eq(queueEntries.timeControl, entry.timeControl),
        isNull(queueEntries.matchedGameId),
      ),
    );
  const position =
    bucket.filter((e) => e.joinedAt <= entry.joinedAt).length || 1;
  return { status: "waiting", position };
}

// ---------------------------------------------------------------------------
// Trạng thái ván + phán quyết lazy
// ---------------------------------------------------------------------------

export interface LiveState {
  game_id: string;
  variant: Variant;
  time_control: string;
  status: "active" | "finished";
  white: { id: string; username: string; elo: number };
  black: { id: string; username: string; elo: number };
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
  white_elo_change: number | null;
  black_elo_change: number | null;
  white_new_elo: number | null;
  black_new_elo: number | null;
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
   * không phán quyết theo thời gian — đồng hồ trong row là của thế cờ cũ.
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
 * một bên ghi Elo/stats, và một phán quyết tính trên snapshot CŨ (một nước
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
  const rated = result === "white" || result === "black" || result === "draw";
  const variant = game.variant as Variant;

  let whiteDelta = 0;
  let blackDelta = 0;
  if (rated) {
    const wStats = userVariantStats(white, variant);
    const bStats = userVariantStats(black, variant);
    ({ whiteDelta, blackDelta } = eloChanges(
      game.whiteEloBefore ?? wStats.elo,
      game.blackEloBefore ?? bStats.elo,
      wStats.gamesPlayed,
      bStats.gamesPlayed,
      result,
    ));
  }

  const pgn =
    moveRows.length > 0 || rules.ply() > 0
      ? rules.buildPgn(
          white.username,
          black.username,
          rated ? result : "draw",
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
        eloChange: rated ? whiteDelta : 0,
        blackEloChange: rated ? blackDelta : 0,
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
      );
    if (updated.rowsAffected === 0) return; // request khác đã chốt / có nước mới
    won = true;

    if (rated) {
      const sides: [UserRow, number, "white" | "black"][] = [
        [white, whiteDelta, "white"],
        [black, blackDelta, "black"],
      ];
      for (const [u, delta, winRes] of sides) {
        const keys = VARIANT_STATS[variant];
        const stats = userVariantStats(u, variant);
        const outcome =
          result === "draw" ? "draws" : result === winRes ? "wins" : "losses";
        await tx
          .update(users)
          .set({
            [keys.elo]: stats.elo + delta,
            [keys.games]: stats.gamesPlayed + 1,
            [keys[outcome]]: (u[keys[outcome]] as number) + 1,
          })
          .where(eq(users.id, u.id));
        await tx.insert(ratingHistory).values({
          userId: u.id,
          elo: stats.elo + delta,
          variant,
          gameId: game.id,
          createdAt: now,
        });
      }
    }
  });

  if (!won) return false;

  // cập nhật bản sao trong bộ nhớ để build response ngay sau finalize
  game.status = "finished";
  game.result = result;
  game.termination = termination;
  game.endedAt = now;
  game.eloChange = rated ? whiteDelta : 0;
  game.blackEloChange = rated ? blackDelta : 0;
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
 * Các phán quyết lazy — PHẢI gọi TRƯỚC heartbeat của người request: phán xử
 * dựa trên lastSeen đọc từ DB, nếu heartbeat trước thì người bỏ ván lâu quay
 * lại poll sẽ tự "tẩy trắng" mình và đảo ngược kết quả forfeit/huỷ ván.
 */
async function applyLazyRulings(loaded: Loaded, now: number): Promise<void> {
  const { game, rules } = loaded;
  if (game.status !== "active") return;
  if (loaded.torn) return; // snapshot rách — không phán quyết trên đồng hồ cũ

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

  const rated = finished && game.result !== "aborted" && game.result !== null;
  return {
    game_id: game.id,
    variant: game.variant as Variant,
    time_control: game.timeControl,
    status: finished ? "finished" : "active",
    white: {
      id: white.id,
      username: white.username,
      elo: game.whiteEloBefore ?? 1200,
    },
    black: {
      id: black.id,
      username: black.username,
      elo: game.blackEloBefore ?? 1200,
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
    white_elo_change: rated ? game.eloChange : finished ? 0 : null,
    black_elo_change: rated ? game.blackEloChange : finished ? 0 : null,
    white_new_elo: rated
      ? (game.whiteEloBefore ?? 1200) + (game.eloChange ?? 0)
      : null,
    black_new_elo: rated
      ? (game.blackEloBefore ?? 1200) + (game.blackEloChange ?? 0)
      : null,
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
  // snapshot rách: đồng hồ trong row thuộc thế cờ cũ — không được trừ giờ
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
    // không trừ giờ cho nước bất hợp lệ — turn_started_at giữ nguyên
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
      );
    if (updated.rowsAffected === 0) {
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
  // finalize có guard lastPly — nếu trượt vì một nước vừa commit song song,
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
    // accept — finalize trượt guard lastPly (nước vừa commit song song, offer
    // có thể đã bị nước của bên nhận vô hiệu) → nạp lại và xét lại từ đầu.
    if (loaded.torn) continue;
    if (await finalize(loaded, "draw", "agreement")) {
      return buildState(loaded, user.id, now);
    }
  }
  return getLiveState(gameId, user.id);
}
