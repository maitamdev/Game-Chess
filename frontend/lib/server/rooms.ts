import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  lt,
} from "drizzle-orm";

import {
  applyUnoAction,
  createUnoGame,
  unoPublicView,
  type UnoAction,
  type UnoGameState,
} from "@/lib/cards/unoEngine";
import {
  cardRoomPlayers,
  cardRooms,
  db,
  games,
  players,
  type CardRoomRow,
  type PlayerRow,
} from "./db";
import { ApiError } from "./errors";
import {
  isVariant,
  parseTimeControl,
  VALID_TIME_CONTROLS,
  type Variant,
} from "./variants";

const ROOM_LIFETIME_MS = 6 * 60 * 60_000;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const BOARD_GAMES = ["chess", "xiangqi", "caro", "jungle", "oanquan"] as const;

export type RoomGameType = Variant | "uno";

export interface RoomPlayerDto {
  id: string;
  username: string;
  seat: number;
  is_host: boolean;
}

export interface RoomDto {
  code: string;
  title: string;
  game_type: RoomGameType;
  status: "waiting" | "playing" | "finished";
  is_public: boolean;
  max_players: number;
  player_count: number;
  host_name: string;
  is_host: boolean;
  me_seat: number;
  players: RoomPlayerDto[];
  time_control: string | null;
  game_id: string | null;
  version: number;
  updated_at: number;
  game?: ReturnType<typeof unoPublicView>;
}

export interface PublicRoomDto {
  code: string;
  title: string;
  game_type: RoomGameType;
  status: "waiting";
  max_players: number;
  player_count: number;
  host_name: string;
  time_control: string | null;
  updated_at: number;
}

interface CreateRoomOptions {
  gameType: RoomGameType;
  maxPlayers: number;
  timeControl?: string | null;
  title?: string;
  isPublic?: boolean;
}

export function isRoomGameType(value: string): value is RoomGameType {
  return value === "uno" || isVariant(value);
}

export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase();
}

export function normalizeRoomTitle(
  value: string | undefined,
  hostName: string,
): string {
  const title = value?.trim().replace(/\s+/g, " ").slice(0, 48);
  return title && title.length >= 2 ? title : `Phòng của ${hostName}`;
}

function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(
    bytes,
    (value) => CODE_ALPHABET[value % CODE_ALPHABET.length],
  ).join("");
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

async function cleanupExpiredRooms(now: number): Promise<void> {
  await db.delete(cardRooms).where(lt(cardRooms.expiresAt, now));
}

async function roomByCode(codeRaw: string): Promise<CardRoomRow | null> {
  const code = normalizeRoomCode(codeRaw);
  if (!/^[A-Z2-9]{6}$/.test(code)) return null;
  const rows = await db
    .select()
    .from(cardRooms)
    .where(eq(cardRooms.code, code))
    .limit(1);
  return rows[0] ?? null;
}

async function seatsWithNames(roomId: string) {
  const seats = await db
    .select()
    .from(cardRoomPlayers)
    .where(eq(cardRoomPlayers.roomId, roomId))
    .orderBy(asc(cardRoomPlayers.seat));
  const ids = seats.map((seat) => seat.userId);
  const playerRows =
    ids.length === 0
      ? []
      : await db
          .select({ id: players.id, username: players.username })
          .from(players)
          .where(inArray(players.id, ids));
  const names = new Map(playerRows.map((item) => [item.id, item.username]));
  return seats.map((seat) => ({
    ...seat,
    username: names.get(seat.userId) ?? "Người chơi",
  }));
}

async function roomDto(room: CardRoomRow, player: PlayerRow): Promise<RoomDto> {
  const seats = await seatsWithNames(room.id);
  const me = seats.find((seat) => seat.userId === player.id);
  if (!me) {
    throw new ApiError(403, "NOT_IN_ROOM", "Bạn không ở trong phòng này");
  }
  const hostName =
    seats.find((seat) => seat.userId === room.hostId)?.username ?? "Chủ phòng";
  const dto: RoomDto = {
    code: room.code,
    title: room.title,
    game_type: room.gameType as RoomGameType,
    status: room.status as RoomDto["status"],
    is_public: room.isPublic,
    max_players: room.maxPlayers,
    player_count: seats.length,
    host_name: hostName,
    is_host: room.hostId === player.id,
    me_seat: me.seat,
    players: seats.map((seat) => ({
      id: seat.userId,
      username: seat.username,
      seat: seat.seat,
      is_host: seat.userId === room.hostId,
    })),
    time_control: room.timeControl,
    game_id: room.gameId,
    version: room.version,
    updated_at: room.updatedAt,
  };
  if (room.gameType === "uno" && room.stateJson) {
    dto.game = unoPublicView(room.stateJson as UnoGameState, me.seat);
  }
  return dto;
}

export async function listPublicRooms(
  gameTypeRaw?: string | null,
): Promise<PublicRoomDto[]> {
  const now = Date.now();
  await cleanupExpiredRooms(now);
  const gameType =
    gameTypeRaw && isRoomGameType(gameTypeRaw) ? gameTypeRaw : null;
  const conditions = [
    eq(cardRooms.isPublic, true),
    eq(cardRooms.status, "waiting"),
    gt(cardRooms.expiresAt, now),
  ];
  if (gameType) conditions.push(eq(cardRooms.gameType, gameType));
  const rooms = await db
    .select()
    .from(cardRooms)
    .where(and(...conditions))
    .orderBy(desc(cardRooms.updatedAt))
    .limit(40);

  if (rooms.length === 0) return [];

  const roomIds = rooms.map((room) => room.id);
  const seats = await db
    .select({
      roomId: cardRoomPlayers.roomId,
      userId: cardRoomPlayers.userId,
      username: players.username,
    })
    .from(cardRoomPlayers)
    .innerJoin(players, eq(players.id, cardRoomPlayers.userId))
    .where(inArray(cardRoomPlayers.roomId, roomIds));
  const seatsByRoom = new Map<
    string,
    Array<{ userId: string; username: string }>
  >();
  for (const seat of seats) {
    const current = seatsByRoom.get(seat.roomId) ?? [];
    current.push({ userId: seat.userId, username: seat.username });
    seatsByRoom.set(seat.roomId, current);
  }

  return rooms.map((room) => {
    const roomSeats = seatsByRoom.get(room.id) ?? [];
    return {
      code: room.code,
      title: room.title,
      game_type: room.gameType as RoomGameType,
      status: "waiting" as const,
      max_players: room.maxPlayers,
      player_count: roomSeats.length,
      host_name:
        roomSeats.find((seat) => seat.userId === room.hostId)?.username ??
        "Chủ phòng",
      time_control: room.timeControl,
      updated_at: room.updatedAt,
    };
  });
}

export async function createGameRoom(
  player: PlayerRow,
  options: CreateRoomOptions,
): Promise<RoomDto> {
  if (!isRoomGameType(options.gameType)) {
    throw new ApiError(422, "INVALID_GAME", "Game không được hỗ trợ");
  }
  const isUno = options.gameType === "uno";
  const maxPlayers = isUno ? options.maxPlayers : 2;
  if (isUno && ![2, 3, 4].includes(maxPlayers)) {
    throw new ApiError(
      422,
      "INVALID_PLAYER_COUNT",
      "UNO chỉ hỗ trợ 2, 3 hoặc 4 người",
    );
  }
  const timeControl = isUno ? null : (options.timeControl ?? "10+0");
  if (
    !isUno &&
    !(VALID_TIME_CONTROLS as readonly string[]).includes(timeControl ?? "")
  ) {
    throw new ApiError(422, "INVALID_TIME_CONTROL", "Thời gian không hợp lệ");
  }

  const now = Date.now();
  await cleanupExpiredRooms(now);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = randomCode();
    const roomId = crypto.randomUUID();
    try {
      await db.transaction(async (tx) => {
        await tx.insert(cardRooms).values({
          id: roomId,
          code,
          gameType: options.gameType,
          title: normalizeRoomTitle(options.title, player.username),
          isPublic: options.isPublic ?? true,
          hostId: player.id,
          maxPlayers,
          status: "waiting",
          timeControl,
          createdAt: now,
          updatedAt: now,
          expiresAt: now + ROOM_LIFETIME_MS,
        });
        await tx.insert(cardRoomPlayers).values({
          roomId,
          userId: player.id,
          seat: 0,
          joinedAt: now,
          lastSeen: now,
        });
      });
    } catch (error) {
      if (isUniqueViolation(error)) continue;
      throw error;
    }

    const room = await roomByCode(code);
    if (!room) {
      throw new ApiError(500, "ROOM_CREATE_FAILED", "Phòng vừa tạo không đọc lại được");
    }
    return roomDto(room, player);
  }
  throw new ApiError(503, "ROOM_CODE_UNAVAILABLE", "Chưa tạo được mã phòng");
}

export async function joinGameRoom(
  player: PlayerRow,
  codeRaw: string,
  expectedGameType?: string,
): Promise<RoomDto> {
  const code = normalizeRoomCode(codeRaw);
  const now = Date.now();
  await cleanupExpiredRooms(now);

  await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(cardRooms)
      .where(eq(cardRooms.code, code))
      .limit(1)
      .for("update");
    const room = rows[0];
    if (!room) {
      throw new ApiError(404, "ROOM_NOT_FOUND", "Không tìm thấy phòng");
    }
    if (expectedGameType && room.gameType !== expectedGameType) {
      throw new ApiError(409, "WRONG_GAME", "Mã này thuộc một game khác");
    }
    if (room.status !== "waiting") {
      const existing = await tx
        .select()
        .from(cardRoomPlayers)
        .where(
          and(
            eq(cardRoomPlayers.roomId, room.id),
            eq(cardRoomPlayers.userId, player.id),
          ),
        )
        .limit(1);
      if (existing.length > 0) return;
      throw new ApiError(409, "ROOM_STARTED", "Phòng này đã bắt đầu");
    }

    const seats = await tx
      .select()
      .from(cardRoomPlayers)
      .where(eq(cardRoomPlayers.roomId, room.id))
      .orderBy(asc(cardRoomPlayers.seat));
    const existing = seats.find((seat) => seat.userId === player.id);
    if (existing) {
      await tx
        .update(cardRoomPlayers)
        .set({ lastSeen: now })
        .where(eq(cardRoomPlayers.id, existing.id));
      return;
    }
    if (seats.length >= room.maxPlayers) {
      throw new ApiError(409, "ROOM_FULL", "Phòng đã đủ người");
    }
    const occupied = new Set(seats.map((seat) => seat.seat));
    const seat = Array.from({ length: room.maxPlayers }, (_, index) => index).find(
      (index) => !occupied.has(index),
    );
    if (seat === undefined) {
      throw new ApiError(409, "ROOM_FULL", "Phòng đã đủ người");
    }
    await tx.insert(cardRoomPlayers).values({
      roomId: room.id,
      userId: player.id,
      seat,
      joinedAt: now,
      lastSeen: now,
    });

    const playerCount = seats.length + 1;
    if (room.gameType !== "uno" && playerCount === 2) {
      const participantIds = [...seats.map((item) => item.userId), player.id];
      const [whiteId, blackId] =
        Math.random() < 0.5
          ? participantIds
          : [participantIds[1], participantIds[0]];
      const { initialMs, incrementMs } = parseTimeControl(
        room.timeControl ?? "10+0",
      );
      const gameId = crypto.randomUUID();
      await tx.insert(games).values({
        id: gameId,
        whiteId,
        blackId,
        variant: room.gameType,
        timeControl: room.timeControl ?? "10+0",
        startedAt: now,
        status: "active",
        whiteMs: initialMs,
        blackMs: initialMs,
        incrementMs,
        lastPly: 0,
      });
      await tx
        .update(cardRooms)
        .set({
          status: "playing",
          gameId,
          version: room.version + 1,
          updatedAt: now,
          expiresAt: now + ROOM_LIFETIME_MS,
        })
        .where(eq(cardRooms.id, room.id));
      return;
    }

    await tx
      .update(cardRooms)
      .set({ updatedAt: now, expiresAt: now + ROOM_LIFETIME_MS })
      .where(eq(cardRooms.id, room.id));
  });

  return roomDto((await roomByCode(code)) as CardRoomRow, player);
}

export async function getRoomStatus(
  player: PlayerRow,
  codeRaw: string,
): Promise<RoomDto> {
  const room = await roomByCode(codeRaw);
  if (!room || room.expiresAt < Date.now()) {
    throw new ApiError(404, "ROOM_NOT_FOUND", "Phòng đã đóng hoặc hết hạn");
  }
  await db
    .update(cardRoomPlayers)
    .set({ lastSeen: Date.now() })
    .where(
      and(
        eq(cardRoomPlayers.roomId, room.id),
        eq(cardRoomPlayers.userId, player.id),
      ),
    );
  return roomDto(room, player);
}

export async function leaveRoom(
  player: PlayerRow,
  codeRaw: string,
): Promise<void> {
  const room = await roomByCode(codeRaw);
  if (!room) return;
  if (room.hostId === player.id || room.status !== "waiting") {
    await db.delete(cardRooms).where(eq(cardRooms.id, room.id));
    return;
  }
  await db
    .delete(cardRoomPlayers)
    .where(
      and(
        eq(cardRoomPlayers.roomId, room.id),
        eq(cardRoomPlayers.userId, player.id),
      ),
    );
}

export async function startUnoRoom(
  player: PlayerRow,
  codeRaw: string,
): Promise<RoomDto> {
  const code = normalizeRoomCode(codeRaw);
  await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(cardRooms)
      .where(eq(cardRooms.code, code))
      .limit(1)
      .for("update");
    const room = rows[0];
    if (!room) {
      throw new ApiError(404, "ROOM_NOT_FOUND", "Không tìm thấy phòng");
    }
    if (room.gameType !== "uno") {
      throw new ApiError(409, "WRONG_GAME", "Phòng này không phải UNO");
    }
    if (room.hostId !== player.id) {
      throw new ApiError(403, "HOST_ONLY", "Chỉ chủ phòng được bắt đầu");
    }
    if (room.status !== "waiting") return;

    const seats = await tx
      .select()
      .from(cardRoomPlayers)
      .where(eq(cardRoomPlayers.roomId, room.id))
      .orderBy(asc(cardRoomPlayers.seat));
    if (seats.length < 2) {
      throw new ApiError(409, "NEED_PLAYERS", "Cần ít nhất 2 người để bắt đầu");
    }
    const now = Date.now();
    await tx
      .update(cardRooms)
      .set({
        status: "playing",
        stateJson: createUnoGame(seats.length),
        version: room.version + 1,
        updatedAt: now,
        expiresAt: now + ROOM_LIFETIME_MS,
      })
      .where(eq(cardRooms.id, room.id));
  });

  const room = await roomByCode(code);
  if (!room) throw new ApiError(404, "ROOM_NOT_FOUND", "Không tìm thấy phòng");
  return roomDto(room, player);
}

export async function actInUnoRoom(
  player: PlayerRow,
  codeRaw: string,
  action: UnoAction,
): Promise<RoomDto> {
  const roomCode = normalizeRoomCode(codeRaw);
  await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(cardRooms)
      .where(eq(cardRooms.code, roomCode))
      .limit(1)
      .for("update");
    const room = rows[0];
    if (
      !room ||
      room.gameType !== "uno" ||
      room.status !== "playing" ||
      !room.stateJson
    ) {
      throw new ApiError(409, "ROOM_NOT_PLAYING", "Ván bài chưa bắt đầu");
    }
    const seats = await tx
      .select()
      .from(cardRoomPlayers)
      .where(
        and(
          eq(cardRoomPlayers.roomId, room.id),
          eq(cardRoomPlayers.userId, player.id),
        ),
      )
      .limit(1);
    const seat = seats[0];
    if (!seat) {
      throw new ApiError(403, "NOT_IN_ROOM", "Bạn không ở trong phòng này");
    }

    let next: UnoGameState;
    try {
      next = applyUnoAction(
        room.stateJson as UnoGameState,
        seat.seat,
        action,
      );
    } catch (error) {
      const code = error instanceof Error ? error.message : "INVALID_ACTION";
      const messages: Record<string, string> = {
        NOT_YOUR_TURN: "Chưa tới lượt của bạn",
        INVALID_CARD: "Lá bài này không hợp lệ",
        COLOR_REQUIRED: "Bạn cần chọn màu",
        GAME_FINISHED: "Ván bài đã kết thúc",
      };
      throw new ApiError(409, code, messages[code] ?? "Nước đi không hợp lệ");
    }

    const now = Date.now();
    await tx
      .update(cardRooms)
      .set({
        stateJson: next,
        status: next.winnerSeat === null ? "playing" : "finished",
        version: room.version + 1,
        updatedAt: now,
        expiresAt: now + ROOM_LIFETIME_MS,
      })
      .where(eq(cardRooms.id, room.id));
  });

  const room = await roomByCode(roomCode);
  if (!room) throw new ApiError(404, "ROOM_NOT_FOUND", "Không tìm thấy phòng");
  return roomDto(room, player);
}

export function createRoom(
  player: PlayerRow,
  variantRaw: string,
  timeControl: string,
  options?: { title?: string; isPublic?: boolean },
) {
  if (!isVariant(variantRaw)) {
    throw new ApiError(422, "INVALID_GAME", "Game không được hỗ trợ");
  }
  return createGameRoom(player, {
    gameType: variantRaw,
    maxPlayers: 2,
    timeControl,
    title: options?.title,
    isPublic: options?.isPublic,
  });
}

export function joinRoom(
  player: PlayerRow,
  codeRaw: string,
  variantRaw?: string,
) {
  return joinGameRoom(player, codeRaw, variantRaw);
}

export function createCardRoom(
  player: PlayerRow,
  maxPlayers: number,
  options?: { title?: string; isPublic?: boolean },
) {
  return createGameRoom(player, {
    gameType: "uno",
    maxPlayers,
    title: options?.title,
    isPublic: options?.isPublic,
  });
}

export const joinCardRoom = (player: PlayerRow, code: string) =>
  joinGameRoom(player, code, "uno");
export const getCardRoom = getRoomStatus;
export const startCardRoom = startUnoRoom;
export const actInCardRoom = actInUnoRoom;
export const leaveCardRoom = leaveRoom;

export const ROOM_GAME_TYPES = ["uno", ...BOARD_GAMES] as const;
