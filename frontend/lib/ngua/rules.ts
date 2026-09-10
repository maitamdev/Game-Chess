export type NguaColor = "red" | "blue" | "yellow" | "green";

export interface NguaPiece {
  id: string;
  color: NguaColor;
  slot: number;
  progress: number;
}

export const NGUA_COLORS: NguaColor[] = ["red", "blue", "yellow", "green"];
export const NGUA_NAMES: Record<NguaColor, string> = {
  red: "Đỏ",
  blue: "Xanh dương",
  yellow: "Vàng",
  green: "Xanh lá",
};

export const START_INDEX: Record<NguaColor, number> = {
  red: 0,
  blue: 13,
  yellow: 26,
  green: 39,
};

export const HOME_ORDER = [6, 5, 4, 3];
export const HOME_END = 55;
export const ENTRY_ROLLS = [1, 6];

export const TRACK_COORDS: Array<[number, number]> = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 7], [0, 8],
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], [7, 14], [8, 14],
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [14, 7], [14, 6],
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0], [6, 0],
];

export const HOME_LANES: Record<NguaColor, Array<[number, number]>> = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4]],
  blue: [[1, 7], [2, 7], [3, 7], [4, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10]],
  green: [[13, 7], [12, 7], [11, 7], [10, 7]],
};

export const YARD_SPOTS: Record<NguaColor, Array<[number, number]>> = {
  red: [[1, 1], [1, 3], [3, 1], [3, 3]],
  blue: [[1, 11], [1, 13], [3, 11], [3, 13]],
  yellow: [[11, 11], [11, 13], [13, 11], [13, 13]],
  green: [[11, 1], [11, 3], [13, 1], [13, 3]],
};

export function createNguaPieces(): NguaPiece[] {
  return NGUA_COLORS.flatMap((color) =>
    Array.from({ length: 4 }, (_, slot) => ({
      id: `${color}-${slot}`,
      color,
      slot,
      progress: -1,
    })),
  );
}

export function absolutePosition(piece: NguaPiece): number | null {
  if (piece.progress < 0 || piece.progress > 51) return null;
  return (START_INDEX[piece.color] + piece.progress) % TRACK_COORDS.length;
}

function canPass(piece: NguaPiece, dice: number, pieces: NguaPiece[]): boolean {
  if (piece.progress < 0 || piece.progress > 51) return true;
  for (let step = 1; step < dice; step += 1) {
    const index = (START_INDEX[piece.color] + piece.progress + step) % TRACK_COORDS.length;
    const blockers = pieces.filter((other) => other.id !== piece.id && absolutePosition(other) === index);
    if (blockers.length >= 2 || blockers.some((other) => other.color !== piece.color)) return false;
  }
  return true;
}

export function canMovePiece(piece: NguaPiece, dice: number, pieces: NguaPiece[]): boolean {
  if (piece.progress === HOME_END || dice < 1 || dice > 6) return false;
  if (piece.progress === -1) return ENTRY_ROLLS.includes(dice);
  const nextProgress = piece.progress + dice;
  return nextProgress <= HOME_END && canPass(piece, dice, pieces);
}

export function getLegalMoves(pieces: NguaPiece[], color: NguaColor, dice: number): NguaPiece[] {
  return pieces.filter((piece) => piece.color === color && canMovePiece(piece, dice, pieces));
}

export interface NguaMoveResult {
  pieces: NguaPiece[];
  kicked: NguaPiece[];
  extraTurn: boolean;
  winner: NguaColor | null;
}

export function applyNguaMove(pieces: NguaPiece[], pieceId: string, dice: number): NguaMoveResult | null {
  const piece = pieces.find((candidate) => candidate.id === pieceId);
  if (!piece || !canMovePiece(piece, dice, pieces)) return null;
  const nextProgress = piece.progress < 0 ? 0 : piece.progress + dice;
  let kicked: NguaPiece[] = [];
  let nextPieces = pieces.map((candidate) =>
    candidate.id === piece.id ? { ...candidate, progress: nextProgress } : candidate,
  );
  const landingPosition = absolutePosition({ ...piece, progress: nextProgress });
  if (landingPosition !== null) {
    kicked = nextPieces.filter((candidate) => candidate.color !== piece.color && absolutePosition(candidate) === landingPosition);
    if (kicked.length > 0) {
      const kickedIds = new Set(kicked.map((candidate) => candidate.id));
      nextPieces = nextPieces.map((candidate) => kickedIds.has(candidate.id) ? { ...candidate, progress: -1 } : candidate);
    }
  }
  const winner = nextPieces.filter((candidate) => candidate.color === piece.color).every((candidate) => candidate.progress === HOME_END) ? piece.color : null;
  return { pieces: nextPieces, kicked, extraTurn: dice === 6 || kicked.length > 0, winner };
}
