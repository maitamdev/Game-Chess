import { and, asc, eq, gt } from "drizzle-orm";

import {
  cardRoomPlayers,
  cardRooms,
  db,
  players,
  roomMessages,
  type PlayerRow,
} from "./db";
import { ApiError } from "./errors";
import { normalizeRoomCode } from "./rooms";

const ROOM_LIFETIME_MS = 6 * 60 * 60_000;

export interface RoomMessageDto {
  id: number;
  player_id: string;
  username: string;
  body: string;
  created_at: number;
}

async function roomAndMembership(player: PlayerRow, codeRaw: string) {
  const code = normalizeRoomCode(codeRaw);
  const rows = await db
    .select({
      room: cardRooms,
      membership: cardRoomPlayers,
    })
    .from(cardRooms)
    .innerJoin(
      cardRoomPlayers,
      and(
        eq(cardRoomPlayers.roomId, cardRooms.id),
        eq(cardRoomPlayers.userId, player.id),
      ),
    )
    .where(eq(cardRooms.code, code))
    .limit(1);
  const row = rows[0];
  if (!row || row.room.expiresAt < Date.now()) {
    throw new ApiError(404, "ROOM_NOT_FOUND", "Phòng đã đóng hoặc hết hạn");
  }
  return row;
}

function normalizeMessage(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim();
}

export async function listRoomMessages(
  player: PlayerRow,
  code: string,
  afterRaw?: string | null,
): Promise<{ messages: RoomMessageDto[]; next_after: number }> {
  const { room } = await roomAndMembership(player, code);
  const after = Number.isFinite(Number(afterRaw)) ? Math.max(0, Number(afterRaw)) : 0;
  const rows = await db
    .select({
      id: roomMessages.id,
      player_id: roomMessages.playerId,
      username: players.username,
      body: roomMessages.body,
      created_at: roomMessages.createdAt,
    })
    .from(roomMessages)
    .innerJoin(players, eq(players.id, roomMessages.playerId))
    .where(and(eq(roomMessages.roomId, room.id), gt(roomMessages.id, after)))
    .orderBy(asc(roomMessages.id))
    .limit(50);
  return {
    messages: rows,
    next_after: rows.at(-1)?.id ?? after,
  };
}

export async function postRoomMessage(
  player: PlayerRow,
  code: string,
  rawBody: string,
): Promise<RoomMessageDto> {
  const { room } = await roomAndMembership(player, code);
  const body = normalizeMessage(rawBody);
  if (body.length < 1 || body.length > 280) {
    throw new ApiError(422, "INVALID_MESSAGE", "Tin nhắn phải dài từ 1 đến 280 ký tự");
  }
  const now = Date.now();
  const rows = await db
    .insert(roomMessages)
    .values({ roomId: room.id, playerId: player.id, body, createdAt: now })
    .returning({ id: roomMessages.id, body: roomMessages.body, createdAt: roomMessages.createdAt });
  await db
    .update(cardRooms)
    .set({ updatedAt: now, expiresAt: now + ROOM_LIFETIME_MS })
    .where(eq(cardRooms.id, room.id));
  const message = rows[0];
  return {
    id: message.id,
    player_id: player.id,
    username: player.username,
    body: message.body,
    created_at: message.createdAt,
  };
}
