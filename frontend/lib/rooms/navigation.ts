import {
  BOARD_GAME_IDS,
  GAME_DEFINITIONS,
  type RoomGameType,
} from "@/lib/games/registry";

export type { RoomGameType } from "@/lib/games/registry";

const GAME_PATHS = Object.fromEntries(
  BOARD_GAME_IDS.map((game) => [game, GAME_DEFINITIONS[game].onlinePath]),
) as Record<Exclude<RoomGameType, "uno">, string>;

export function roomDestination(room: {
  code: string;
  game_type: RoomGameType;
  status: "waiting" | "playing" | "finished";
  game_id: string | null;
}): string | null {
  if (room.game_type === "uno") {
    return `/cards/uno/room/${room.code}`;
  }
  if (room.game_type === "tienlen") {
    return `/cards/tienlen/room/${room.code}`;
  }
  if (room.game_type === "ngua") {
    return `/ngua/room/${room.code}`;
  }
  if (room.game_type === "xidach" || room.game_type === "baicao") {
    return `/cards/${room.game_type}/room/${room.code}`;
  }
  if (room.status === "playing" && room.game_id) {
    return `${GAME_PATHS[room.game_type]}/${room.game_id}`;
  }
  return null;
}
