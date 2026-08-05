export type RoomGameType =
  | "chess"
  | "xiangqi"
  | "caro"
  | "jungle"
  | "oanquan"
  | "uno";

const GAME_PATHS: Record<Exclude<RoomGameType, "uno">, string> = {
  chess: "/play/online",
  xiangqi: "/xiangqi/online",
  caro: "/caro/online",
  jungle: "/jungle/online",
  oanquan: "/oanquan/online",
};

export function roomDestination(room: {
  code: string;
  game_type: RoomGameType;
  status: "waiting" | "playing" | "finished";
  game_id: string | null;
}): string | null {
  if (room.game_type === "uno") {
    return `/cards/uno/room/${room.code}`;
  }
  if (room.status === "playing" && room.game_id) {
    return `${GAME_PATHS[room.game_type]}/${room.game_id}`;
  }
  return null;
}
