export type ReversiColor = "black" | "white";
export type ReversiCell = ReversiColor | null;
export type ReversiBoard = ReversiCell[][];
export interface ReversiMove {
  row: number;
  col: number;
  flips: number;
}

export const REVERSI_SIZE = 8;
const DIRECTIONS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
] as const;

function other(color: ReversiColor): ReversiColor {
  return color === "black" ? "white" : "black";
}

function emptyBoard(): ReversiBoard {
  return Array.from({ length: REVERSI_SIZE }, () =>
    Array<ReversiCell>(REVERSI_SIZE).fill(null),
  );
}

export function initialReversiBoard(): ReversiBoard {
  const board = emptyBoard();
  board[3][3] = "white";
  board[3][4] = "black";
  board[4][3] = "black";
  board[4][4] = "white";
  return board;
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < REVERSI_SIZE && col >= 0 && col < REVERSI_SIZE;
}

export class ReversiGame {
  readonly board: ReversiBoard;
  readonly turn: ReversiColor;
  readonly consecutivePasses: number;
  readonly moveCount: number;

  constructor(
    board: ReversiBoard = initialReversiBoard(),
    turn: ReversiColor = "black",
    consecutivePasses = 0,
    moveCount = 0,
  ) {
    this.board = board.map((row) => [...row]);
    this.turn = turn;
    this.consecutivePasses = consecutivePasses;
    this.moveCount = moveCount;
  }

  clone(): ReversiGame {
    return new ReversiGame(
      this.board,
      this.turn,
      this.consecutivePasses,
      this.moveCount,
    );
  }

  private flipsFor(row: number, col: number, color: ReversiColor): Array<[number, number]> {
    if (!inBounds(row, col) || this.board[row][col] !== null) return [];
    const opponent = other(color);
    const flips: Array<[number, number]> = [];
    for (const [dr, dc] of DIRECTIONS) {
      const line: Array<[number, number]> = [];
      let nextRow = row + dr;
      let nextCol = col + dc;
      while (inBounds(nextRow, nextCol) && this.board[nextRow][nextCol] === opponent) {
        line.push([nextRow, nextCol]);
        nextRow += dr;
        nextCol += dc;
      }
      if (line.length > 0 && inBounds(nextRow, nextCol) && this.board[nextRow][nextCol] === color) {
        flips.push(...line);
      }
    }
    return flips;
  }

  legalMoves(color: ReversiColor = this.turn): ReversiMove[] {
    if (this.isGameOver()) return [];
    const moves: ReversiMove[] = [];
    for (let row = 0; row < REVERSI_SIZE; row += 1) {
      for (let col = 0; col < REVERSI_SIZE; col += 1) {
        const flips = this.flipsFor(row, col, color);
        if (flips.length > 0) moves.push({ row, col, flips: flips.length });
      }
    }
    return moves;
  }

  play(row: number, col: number): ReversiGame | null {
    if (this.isGameOver()) return null;
    const flips = this.flipsFor(row, col, this.turn);
    if (flips.length === 0) return null;
    const next = this.board.map((line) => [...line]);
    next[row][col] = this.turn;
    for (const [flipRow, flipCol] of flips) next[flipRow][flipCol] = this.turn;
    return new ReversiGame(next, other(this.turn), 0, this.moveCount + 1);
  }

  pass(): ReversiGame | null {
    if (this.isGameOver() || this.legalMoves().length > 0) return null;
    return new ReversiGame(
      this.board,
      other(this.turn),
      this.consecutivePasses + 1,
      this.moveCount + 1,
    );
  }

  score(): { black: number; white: number } {
    let black = 0;
    let white = 0;
    for (const row of this.board) {
      for (const cell of row) {
        if (cell === "black") black += 1;
        if (cell === "white") white += 1;
      }
    }
    return { black, white };
  }

  isGameOver(): boolean {
    if (this.consecutivePasses >= 2) return true;
    const { black, white } = this.score();
    return black + white === REVERSI_SIZE * REVERSI_SIZE;
  }

  winner(): ReversiColor | "draw" | null {
    if (!this.isGameOver()) return null;
    const { black, white } = this.score();
    if (black === white) return "draw";
    return black > white ? "black" : "white";
  }
}

const CORNER_SET = new Set(["0:0", "0:7", "7:0", "7:7"]);

export function chooseReversiComputerMove(game: ReversiGame): ReversiMove | null {
  const moves = game.legalMoves();
  if (moves.length === 0) return null;
  return [...moves].sort((a, b) => {
    const aCorner = CORNER_SET.has(`${a.row}:${a.col}`) ? 1 : 0;
    const bCorner = CORNER_SET.has(`${b.row}:${b.col}`) ? 1 : 0;
    return bCorner - aCorner || b.flips - a.flips;
  })[0];
}
