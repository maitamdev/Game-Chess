export type GanhColor = "red" | "blue";
export type GanhCell = GanhColor | null;
export type GanhBoard = GanhCell[][];
export interface GanhMove {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  captured: number;
}

export const GANH_SIZE = 5;
const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1],
] as const;

function other(color: GanhColor): GanhColor {
  return color === "red" ? "blue" : "red";
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < GANH_SIZE && col >= 0 && col < GANH_SIZE;
}

function emptyBoard(): GanhBoard {
  return Array.from({ length: GANH_SIZE }, () => Array<GanhCell>(GANH_SIZE).fill(null));
}

function perimeter(): Array<[number, number]> {
  const cells: Array<[number, number]> = [];
  for (let col = 0; col < GANH_SIZE; col += 1) cells.push([0, col]);
  for (let row = 1; row < GANH_SIZE; row += 1) cells.push([row, GANH_SIZE - 1]);
  for (let col = GANH_SIZE - 2; col >= 0; col -= 1) cells.push([GANH_SIZE - 1, col]);
  for (let row = GANH_SIZE - 2; row > 0; row -= 1) cells.push([row, 0]);
  return cells;
}

export function initialGanhBoard(): GanhBoard {
  const board = emptyBoard();
  perimeter().forEach(([row, col], index) => {
    board[row][col] = index % 2 === 0 ? "red" : "blue";
  });
  return board;
}

function neighbors(row: number, col: number): Array<[number, number]> {
  return DIRECTIONS.map(([dr, dc]) => [row + dr, col + dc] as [number, number]).filter(([r, c]) => inBounds(r, c));
}

export class GanhGame {
  readonly board: GanhBoard;
  readonly turn: GanhColor;
  readonly moveCount: number;

  constructor(board: GanhBoard = initialGanhBoard(), turn: GanhColor = "red", moveCount = 0) {
    this.board = board.map((row) => [...row]);
    this.turn = turn;
    this.moveCount = moveCount;
  }

  private legalTarget(row: number, col: number, color: GanhColor): boolean {
    return neighbors(row, col).some(([r, c]) => this.board[r][c] === color);
  }

  legalMoves(color: GanhColor = this.turn): GanhMove[] {
    const moves: GanhMove[] = [];
    for (let fromRow = 0; fromRow < GANH_SIZE; fromRow += 1) {
      for (let fromCol = 0; fromCol < GANH_SIZE; fromCol += 1) {
        if (this.board[fromRow][fromCol] !== color) continue;
        for (const [toRow, toCol] of neighbors(fromRow, fromCol)) {
          if (this.board[toRow][toCol] !== null) continue;
          moves.push({ fromRow, fromCol, toRow, toCol, captured: 0 });
        }
      }
    }
    return moves;
  }

  play(fromRow: number, fromCol: number, toRow: number, toCol: number): GanhGame | null {
    if (this.winner()) return null;
    if (this.board[fromRow]?.[fromCol] !== this.turn || this.board[toRow]?.[toCol] !== null) return null;
    if (!neighbors(fromRow, fromCol).some(([row, col]) => row === toRow && col === toCol)) return null;

    const next = this.board.map((row) => [...row]);
    next[fromRow][fromCol] = null;
    next[toRow][toCol] = this.turn;
    const opponent = other(this.turn);
    let captured = 0;

    for (const [dr, dc] of DIRECTIONS) {
      const left = [toRow - dr, toCol - dc] as const;
      const right = [toRow + dr, toCol + dc] as const;
      if (inBounds(left[0], left[1]) && inBounds(right[0], right[1]) && next[left[0]][left[1]] === opponent && next[right[0]][right[1]] === opponent) {
        next[left[0]][left[1]] = this.turn;
        next[right[0]][right[1]] = this.turn;
        captured += 2;
      }
    }

    // Phiên bản thu phục: quân đối phương bị vây kín sẽ đổi màu.
    for (let row = 0; row < GANH_SIZE; row += 1) {
      for (let col = 0; col < GANH_SIZE; col += 1) {
        if (next[row][col] !== opponent) continue;
        const around = neighbors(row, col);
        if (around.length > 0 && around.every(([r, c]) => next[r][c] === this.turn)) {
          next[row][col] = this.turn;
          captured += 1;
        }
      }
    }
    return new GanhGame(next, opponent, this.moveCount + 1);
  }

  score(): { red: number; blue: number } {
    let red = 0;
    let blue = 0;
    for (const row of this.board) for (const cell of row) {
      if (cell === "red") red += 1;
      if (cell === "blue") blue += 1;
    }
    return { red, blue };
  }

  winner(): GanhColor | "draw" | null {
    const { red, blue } = this.score();
    if (red === 0) return "blue";
    if (blue === 0) return "red";
    if (this.legalMoves().length === 0) return other(this.turn);
    return null;
  }
}

export function chooseGanhComputerMove(game: GanhGame): GanhMove | null {
  const moves = game.legalMoves();
  if (moves.length === 0) return null;
  return moves
    .map((move) => {
      const next = game.play(move.fromRow, move.fromCol, move.toRow, move.toCol);
      const before = game.score()[game.turn === "red" ? "blue" : "red"];
      const after = next?.score()[game.turn === "red" ? "blue" : "red"] ?? before;
      return { move, captured: before - after };
    })
    .sort((a, b) => b.captured - a.captured)[0].move;
}
