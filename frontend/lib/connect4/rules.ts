export type Connect4Color = "red" | "yellow";
export type Connect4Cell = Connect4Color | null;
export type Connect4Board = Connect4Cell[][];

export const CONNECT4_ROWS = 6;
export const CONNECT4_COLS = 7;

function other(color: Connect4Color): Connect4Color {
  return color === "red" ? "yellow" : "red";
}

function emptyBoard(): Connect4Board {
  return Array.from({ length: CONNECT4_ROWS }, () =>
    Array<Connect4Cell>(CONNECT4_COLS).fill(null),
  );
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < CONNECT4_ROWS && col >= 0 && col < CONNECT4_COLS;
}

export class Connect4Game {
  readonly board: Connect4Board;
  readonly turn: Connect4Color;
  readonly moveCount: number;

  constructor(
    board: Connect4Board = emptyBoard(),
    turn: Connect4Color = "red",
    moveCount = 0,
  ) {
    this.board = board.map((row) => [...row]);
    this.turn = turn;
    this.moveCount = moveCount;
  }

  clone(): Connect4Game {
    return new Connect4Game(this.board, this.turn, this.moveCount);
  }

  validColumns(): number[] {
    return this.board[0]
      .map((cell, col) => (cell === null ? col : -1))
      .filter((col) => col >= 0);
  }

  play(column: number): Connect4Game | null {
    if (this.winner() || column < 0 || column >= CONNECT4_COLS) return null;
    let row = CONNECT4_ROWS - 1;
    while (row >= 0 && this.board[row][column] !== null) row -= 1;
    if (row < 0) return null;
    const next = this.board.map((line) => [...line]);
    next[row][column] = this.turn;
    return new Connect4Game(next, other(this.turn), this.moveCount + 1);
  }

  private hasFour(color: Connect4Color): boolean {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]] as const;
    for (let row = 0; row < CONNECT4_ROWS; row += 1) {
      for (let col = 0; col < CONNECT4_COLS; col += 1) {
        if (this.board[row][col] !== color) continue;
        for (const [dr, dc] of directions) {
          let count = 1;
          for (let step = 1; step < 4; step += 1) {
            if (inBounds(row + dr * step, col + dc * step) && this.board[row + dr * step][col + dc * step] === color) count += 1;
            else break;
          }
          if (count === 4) return true;
        }
      }
    }
    return false;
  }

  winner(): Connect4Color | "draw" | null {
    if (this.hasFour("red")) return "red";
    if (this.hasFour("yellow")) return "yellow";
    return this.validColumns().length === 0 ? "draw" : null;
  }
}

export function chooseConnect4ComputerColumn(game: Connect4Game): number | null {
  const columns = game.validColumns();
  if (columns.length === 0) return null;
  const center = (CONNECT4_COLS - 1) / 2;
  return [...columns].sort((a, b) => Math.abs(a - center) - Math.abs(b - center))[0];
}
