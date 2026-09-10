/**
 * Danh mục game dùng chung cho UI, room và các mốc phát triển tiếp theo.
 *
 * Registry này chỉ mô tả capability và route; luật cụ thể vẫn nằm trong
 * module tương ứng của từng game. Nhờ vậy các màn hình không phải tự khai báo
 * lại tên, số người và trạng thái online ở nhiều nơi.
 */

export const BOARD_GAME_IDS = [
  "chess",
  "xiangqi",
  "caro",
  "jungle",
  "oanquan",
  "reversi",
  "connect4",
  "draughts",
  "dots",
] as const;

export type BoardGameId = (typeof BOARD_GAME_IDS)[number];
export type RoomGameType =
  | BoardGameId
  | "uno"
  | "tienlen"
  | "ngua"
  | "xidach"
  | "baicao";
export type CatalogGameId =
  | RoomGameType
  | "tienlen"
  | "xidach"
  | "baicao"
  | "ngua"
  | "2048"
  | "minesweeper"
  | "memory"
  | "reversi"
  | "connect4"
  | "coganh"
  | "covay"
  | "checkers"
  | "draughts"
  | "dots";

export type GameMode = "local" | "computer" | "online";
export type OnlineStatus = "ready" | "planned" | "not-available";

export interface GameDefinition {
  id: CatalogGameId;
  title: string;
  shortTitle: string;
  category: "board" | "cards" | "dice" | "minigame";
  players: { min: number; max: number };
  modes: readonly GameMode[];
  online: OnlineStatus;
  route: string;
  onlinePath?: string;
}

export const GAME_DEFINITIONS: Record<CatalogGameId, GameDefinition> = {
  chess: {
    id: "chess",
    title: "Cờ vua",
    shortTitle: "Vua",
    category: "board",
    players: { min: 2, max: 2 },
    modes: ["local", "computer", "online"],
    online: "ready",
    route: "/chess",
    onlinePath: "/play/online",
  },
  xiangqi: {
    id: "xiangqi",
    title: "Cờ tướng",
    shortTitle: "Tướng",
    category: "board",
    players: { min: 2, max: 2 },
    modes: ["local", "computer", "online"],
    online: "ready",
    route: "/xiangqi",
    onlinePath: "/xiangqi/online",
  },
  caro: {
    id: "caro",
    title: "Caro",
    shortTitle: "Caro",
    category: "board",
    players: { min: 2, max: 2 },
    modes: ["local", "computer", "online"],
    online: "ready",
    route: "/caro",
    onlinePath: "/caro/online",
  },
  jungle: {
    id: "jungle",
    title: "Cờ thú",
    shortTitle: "Cờ thú",
    category: "board",
    players: { min: 2, max: 2 },
    modes: ["local", "computer", "online"],
    online: "ready",
    route: "/jungle",
    onlinePath: "/jungle/online",
  },
  oanquan: {
    id: "oanquan",
    title: "Ô ăn quan",
    shortTitle: "Ô quan",
    category: "board",
    players: { min: 2, max: 2 },
    modes: ["local", "computer", "online"],
    online: "ready",
    route: "/oanquan",
    onlinePath: "/oanquan/online",
  },
  uno: {
    id: "uno",
    title: "UNO",
    shortTitle: "UNO",
    category: "cards",
    players: { min: 2, max: 4 },
    modes: ["computer", "online"],
    online: "ready",
    route: "/cards/uno",
  },
  tienlen: {
    id: "tienlen",
    title: "Tiến Lên Miền Nam",
    shortTitle: "Tiến Lên",
    category: "cards",
    players: { min: 2, max: 4 },
    modes: ["local", "computer", "online"],
    online: "ready",
    route: "/cards/tienlen",
  },
  xidach: {
    id: "xidach",
    title: "Xì Dách",
    shortTitle: "Xì Dách",
    category: "cards",
    players: { min: 1, max: 4 },
    modes: ["local", "online"],
    online: "ready",
    route: "/cards/xidach",
  },
  baicao: {
    id: "baicao",
    title: "Bài Cào",
    shortTitle: "Bài Cào",
    category: "cards",
    players: { min: 2, max: 4 },
    modes: ["local", "online"],
    online: "ready",
    route: "/cards/baicao",
  },
  ngua: {
    id: "ngua",
    title: "Cá Ngựa",
    shortTitle: "Cá Ngựa",
    category: "dice",
    players: { min: 2, max: 4 },
    modes: ["local", "online"],
    online: "ready",
    route: "/ngua",
  },
  "2048": {
    id: "2048",
    title: "2048",
    shortTitle: "2048",
    category: "minigame",
    players: { min: 1, max: 1 },
    modes: ["local"],
    online: "not-available",
    route: "/minigames/2048",
  },
  minesweeper: {
    id: "minesweeper",
    title: "Dò mìn",
    shortTitle: "Dò mìn",
    category: "minigame",
    players: { min: 1, max: 1 },
    modes: ["local"],
    online: "not-available",
    route: "/minigames/domin",
  },
  memory: {
    id: "memory",
    title: "Lật thẻ",
    shortTitle: "Lật thẻ",
    category: "minigame",
    players: { min: 1, max: 1 },
    modes: ["local"],
    online: "not-available",
    route: "/minigames/latthe",
  },
  reversi: {
    id: "reversi",
    title: "Reversi / Othello",
    shortTitle: "Reversi",
    category: "board",
    players: { min: 2, max: 2 },
    modes: ["local", "computer", "online"],
    online: "ready",
    route: "/reversi",
    onlinePath: "/reversi/online",
  },
  connect4: {
    id: "connect4",
    title: "Connect Four",
    shortTitle: "Connect Four",
    category: "board",
    players: { min: 2, max: 2 },
    modes: ["local", "computer", "online"],
    online: "ready",
    route: "/connect4",
    onlinePath: "/connect4/online",
  },
  draughts: {
    id: "draughts",
    title: "Cờ Đam 8×8",
    shortTitle: "Cờ Đam",
    category: "board",
    players: { min: 2, max: 2 },
    modes: ["local", "computer", "online"],
    online: "ready",
    route: "/draughts",
    onlinePath: "/draughts/online",
  },
  dots: {
    id: "dots",
    title: "Dots & Boxes",
    shortTitle: "Dots",
    category: "board",
    players: { min: 2, max: 2 },
    modes: ["local", "computer", "online"],
    online: "ready",
    route: "/dots",
    onlinePath: "/dots/online",
  },
  coganh: {
    id: "coganh",
    title: "Cờ Gánh",
    shortTitle: "Gánh",
    category: "board",
    players: { min: 2, max: 2 },
    modes: ["local", "computer"],
    online: "planned",
    route: "/coganh",
  },
  covay: {
    id: "covay",
    title: "Cờ Vây 9×9",
    shortTitle: "Cờ Vây",
    category: "board",
    players: { min: 2, max: 2 },
    modes: ["local", "computer"],
    online: "planned",
    route: "/covay",
  },
  checkers: {
    id: "checkers",
    title: "Chinese Checkers",
    shortTitle: "Checkers",
    category: "board",
    players: { min: 2, max: 2 },
    modes: ["local", "computer"],
    online: "planned",
    route: "/checkers",
  },
};

export const ROOM_GAME_TYPES = [
  ...BOARD_GAME_IDS,
  "uno",
  "tienlen",
  "ngua",
  "xidach",
  "baicao",
] as const satisfies readonly RoomGameType[];

export function isCatalogGameId(value: string): value is CatalogGameId {
  return value in GAME_DEFINITIONS;
}

export function getGameDefinition(game: CatalogGameId): GameDefinition {
  return GAME_DEFINITIONS[game];
}

export function getGameTitle(game: CatalogGameId): string {
  return GAME_DEFINITIONS[game].title;
}
