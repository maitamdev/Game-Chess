export type GoColor = "black" | "white";
export type GoCell = GoColor | null;
export type GoBoard = GoCell[][];
export interface GoMove { row: number; col: number; }

export const GO_SIZE = 9;
const ORTHOGONAL = [[-1, 0], [0, -1], [0, 1], [1, 0]] as const;

function other(color: GoColor): GoColor { return color === "black" ? "white" : "black"; }
function inBounds(row: number, col: number): boolean { return row >= 0 && row < GO_SIZE && col >= 0 && col < GO_SIZE; }
function emptyBoard(): GoBoard { return Array.from({ length: GO_SIZE }, () => Array<GoCell>(GO_SIZE).fill(null)); }
function boardHash(board: GoBoard): string { return board.map((row) => row.map((cell) => cell?.[0] ?? ".").join("")).join("/"); }

function group(board: GoBoard, row: number, col: number): { stones: Array<[number, number]>; liberties: Set<string> } {
  const color = board[row][col];
  if (!color) return { stones: [], liberties: new Set() };
  const stones: Array<[number, number]> = [];
  const liberties = new Set<string>();
  const seen = new Set<string>();
  const queue: Array<[number, number]> = [[row, col]];
  while (queue.length) {
    const [r, c] = queue.pop()!;
    const key = `${r}:${c}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (board[r][c] !== color) continue;
    stones.push([r, c]);
    for (const [dr, dc] of ORTHOGONAL) {
      const nr = r + dr; const nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      if (board[nr][nc] === null) liberties.add(`${nr}:${nc}`);
      else if (board[nr][nc] === color && !seen.has(`${nr}:${nc}`)) queue.push([nr, nc]);
    }
  }
  return { stones, liberties };
}

export class GoGame {
  readonly board: GoBoard;
  readonly turn: GoColor;
  readonly previousHash: string | null;
  readonly consecutivePasses: number;
  readonly moveCount: number;

  constructor(board: GoBoard = emptyBoard(), turn: GoColor = "black", previousHash: string | null = null, consecutivePasses = 0, moveCount = 0) {
    this.board = board.map((row) => [...row]);
    this.turn = turn;
    this.previousHash = previousHash;
    this.consecutivePasses = consecutivePasses;
    this.moveCount = moveCount;
  }

  play(row: number, col: number): GoGame | null {
    if (this.isGameOver() || !inBounds(row, col) || this.board[row][col] !== null) return null;
    const next = this.board.map((line) => [...line]);
    next[row][col] = this.turn;
    const opponent = other(this.turn);
    for (const [dr, dc] of ORTHOGONAL) {
      const nr = row + dr; const nc = col + dc;
      if (!inBounds(nr, nc) || next[nr][nc] !== opponent) continue;
      const enemy = group(next, nr, nc);
      if (enemy.liberties.size === 0) for (const [sr, sc] of enemy.stones) next[sr][sc] = null;
    }
    const own = group(next, row, col);
    if (own.liberties.size === 0) return null;
    if (this.previousHash !== null && boardHash(next) === this.previousHash) return null;
    return new GoGame(next, opponent, boardHash(this.board), 0, this.moveCount + 1);
  }

  pass(): GoGame | null {
    if (this.isGameOver()) return null;
    return new GoGame(this.board, other(this.turn), null, this.consecutivePasses + 1, this.moveCount);
  }

  legalMoves(color: GoColor = this.turn): GoMove[] {
    if (color !== this.turn || this.isGameOver()) return [];
    const moves: GoMove[] = [];
    for (let row = 0; row < GO_SIZE; row += 1) for (let col = 0; col < GO_SIZE; col += 1) {
      if (this.play(row, col)) moves.push({ row, col });
    }
    return moves;
  }

  score(): { black: number; white: number } {
    const score = { black: 0, white: 0 };
    const seen = new Set<string>();
    for (let row = 0; row < GO_SIZE; row += 1) for (let col = 0; col < GO_SIZE; col += 1) {
      const cell = this.board[row][col];
      if (cell) { score[cell] += 1; continue; }
      const key = `${row}:${col}`;
      if (seen.has(key)) continue;
      const region: Array<[number, number]> = []; const borders = new Set<GoColor>(); const queue: Array<[number, number]> = [[row, col]];
      while (queue.length) {
        const [r, c] = queue.pop()!; const regionKey = `${r}:${c}`;
        if (seen.has(regionKey)) continue;
        seen.add(regionKey); if (this.board[r][c] !== null) continue;
        region.push([r, c]);
        for (const [dr, dc] of ORTHOGONAL) { const nr = r + dr; const nc = c + dc; if (!inBounds(nr, nc)) continue; const neighbor = this.board[nr][nc]; if (neighbor) borders.add(neighbor); else queue.push([nr, nc]); }
      }
      if (borders.size === 1) score[[...borders][0]] += region.length;
    }
    return score;
  }

  isGameOver(): boolean { return this.consecutivePasses >= 2 || this.moveCount >= GO_SIZE * GO_SIZE * 2; }
  winner(): GoColor | "draw" | null {
    if (!this.isGameOver()) return null;
    const score = this.score();
    if (score.black === score.white) return "draw";
    return score.black > score.white ? "black" : "white";
  }
}

export function chooseGoComputerMove(game: GoGame): GoMove | null {
  const moves = game.legalMoves();
  if (moves.length === 0) return null;
  const center = (GO_SIZE - 1) / 2;
  return [...moves].sort((a, b) => Math.abs(a.row - center) + Math.abs(a.col - center) - Math.abs(b.row - center) - Math.abs(b.col - center))[0];
}
