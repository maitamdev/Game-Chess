export type DraughtsColor = "red" | "black";

export interface DraughtsPiece {
  color: DraughtsColor;
  king: boolean;
}

export type DraughtsBoard = Array<Array<DraughtsPiece | null>>;
export interface DraughtsCoord { row: number; col: number; }
export interface DraughtsMove {
  from: DraughtsCoord;
  to: DraughtsCoord;
  jumped: DraughtsCoord | null;
}

export const DRAUGHTS_SIZE = 8;
const DIAGONALS = [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const;

function other(color: DraughtsColor): DraughtsColor {
  return color === "red" ? "black" : "red";
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < DRAUGHTS_SIZE && col >= 0 && col < DRAUGHTS_SIZE;
}

function playable(row: number, col: number): boolean {
  return (row + col) % 2 === 1;
}

function emptyBoard(): DraughtsBoard {
  return Array.from({ length: DRAUGHTS_SIZE }, () => Array<DraughtsPiece | null>(DRAUGHTS_SIZE).fill(null));
}

export function initialDraughtsBoard(): DraughtsBoard {
  const board = emptyBoard();
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < DRAUGHTS_SIZE; col += 1) {
      if (playable(row, col)) board[row][col] = { color: "black", king: false };
    }
  }
  for (let row = 5; row < DRAUGHTS_SIZE; row += 1) {
    for (let col = 0; col < DRAUGHTS_SIZE; col += 1) {
      if (playable(row, col)) board[row][col] = { color: "red", king: false };
    }
  }
  return board;
}

function key(coord: DraughtsCoord): string {
  return `${coord.row}:${coord.col}`;
}

function directionsFor(piece: DraughtsPiece): readonly (readonly [number, number])[] {
  if (piece.king) return DIAGONALS;
  const direction = piece.color === "red" ? -1 : 1;
  return DIAGONALS.filter(([dr]) => dr === direction);
}

export class DraughtsGame {
  readonly board: DraughtsBoard;
  readonly turn: DraughtsColor;
  readonly pendingCapture: DraughtsCoord | null;
  readonly moveCount: number;

  constructor(
    board: DraughtsBoard = initialDraughtsBoard(),
    turn: DraughtsColor = "red",
    pendingCapture: DraughtsCoord | null = null,
    moveCount = 0,
  ) {
    this.board = board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
    this.turn = turn;
    this.pendingCapture = pendingCapture ? { ...pendingCapture } : null;
    this.moveCount = moveCount;
  }

  private captureMovesFor(from: DraughtsCoord): DraughtsMove[] {
    const piece = this.board[from.row]?.[from.col];
    if (!piece || piece.color !== this.turn) return [];
    const moves: DraughtsMove[] = [];
    for (const [dr, dc] of directionsFor(piece)) {
      const jumped = { row: from.row + dr, col: from.col + dc };
      const to = { row: from.row + dr * 2, col: from.col + dc * 2 };
      const jumpedPiece = inBounds(jumped.row, jumped.col) ? this.board[jumped.row][jumped.col] : null;
      if (inBounds(to.row, to.col) && playable(to.row, to.col) && jumpedPiece && jumpedPiece.color !== piece.color && !this.board[to.row][to.col]) {
        moves.push({ from, to, jumped });
      }
    }
    return moves;
  }

  private stepMovesFor(from: DraughtsCoord): DraughtsMove[] {
    const piece = this.board[from.row]?.[from.col];
    if (!piece || piece.color !== this.turn) return [];
    return directionsFor(piece)
      .map(([dr, dc]) => ({ row: from.row + dr, col: from.col + dc }))
      .filter((to) => inBounds(to.row, to.col) && playable(to.row, to.col) && !this.board[to.row][to.col])
      .map((to) => ({ from, to, jumped: null }));
  }

  legalMoves(): DraughtsMove[] {
    const coords = this.pendingCapture
      ? [this.pendingCapture]
      : this.board.flatMap((row, rowIndex) => row.map((piece, col) => piece?.color === this.turn ? { row: rowIndex, col } : null).filter((coord): coord is DraughtsCoord => coord !== null));
    const captures = coords.flatMap((coord) => this.captureMovesFor(coord));
    if (captures.length > 0) return captures;
    if (this.pendingCapture) return [];
    return coords.flatMap((coord) => this.stepMovesFor(coord));
  }

  play(move: DraughtsMove): DraughtsGame | null {
    if (this.winner()) return null;
    const legal = this.legalMoves().find((candidate) => key(candidate.from) === key(move.from) && key(candidate.to) === key(move.to));
    if (!legal) return null;

    const next = this.board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
    const piece = next[legal.from.row][legal.from.col];
    if (!piece) return null;
    next[legal.from.row][legal.from.col] = null;
    next[legal.to.row][legal.to.col] = piece;
    if (legal.jumped) next[legal.jumped.row][legal.jumped.col] = null;
    if ((piece.color === "red" && legal.to.row === 0) || (piece.color === "black" && legal.to.row === DRAUGHTS_SIZE - 1)) piece.king = true;

    const continued = legal.jumped !== null
      ? new DraughtsGame(next, this.turn, legal.to, this.moveCount + 1)
      : null;
    if (continued && continued.captureMovesFor(legal.to).length > 0) return continued;
    return new DraughtsGame(next, other(this.turn), null, this.moveCount + 1);
  }

  winner(): DraughtsColor | null {
    const redCount = this.board.flat().filter((piece) => piece?.color === "red").length;
    const blackCount = this.board.flat().filter((piece) => piece?.color === "black").length;
    if (redCount === 0) return "black";
    if (blackCount === 0) return "red";
    if (this.legalMoves().length === 0) return other(this.turn);
    return null;
  }
}

export function chooseDraughtsMove(game: DraughtsGame): DraughtsMove | null {
  const moves = game.legalMoves();
  if (moves.length === 0) return null;
  const ranked = [...moves].sort((a, b) => {
    const captureScore = Number(b.jumped !== null) - Number(a.jumped !== null);
    if (captureScore !== 0) return captureScore;
    const aPiece = game.board[a.from.row][a.from.col];
    const bPiece = game.board[b.from.row][b.from.col];
    const promotionScore = Number(aPiece?.color === "black" && a.to.row === DRAUGHTS_SIZE - 1) - Number(bPiece?.color === "black" && b.to.row === DRAUGHTS_SIZE - 1);
    if (promotionScore !== 0) return promotionScore;
    return Number(Boolean(bPiece?.king)) - Number(Boolean(aPiece?.king));
  });
  return ranked[0];
}
