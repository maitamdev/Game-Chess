export type ChineseCheckersColor = "red" | "yellow";
export type ChineseCheckersCell = ChineseCheckersColor | null;
export interface ChineseCheckersCoord { q: number; r: number; }
export interface ChineseCheckersMove { from: ChineseCheckersCoord; to: ChineseCheckersCoord; jumps: number; }
export type ChineseCheckersBoard = Record<string, ChineseCheckersCell>;

export const CHECKERS_RADIUS = 4;
const DIRECTIONS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]] as const;

function other(color: ChineseCheckersColor): ChineseCheckersColor { return color === "red" ? "yellow" : "red"; }
export function coordKey({ q, r }: ChineseCheckersCoord): string { return `${q}:${r}`; }
export function validCoord({ q, r }: ChineseCheckersCoord): boolean { const s = -q - r; return Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= CHECKERS_RADIUS; }
export function allCheckersCoords(): ChineseCheckersCoord[] { const cells: ChineseCheckersCoord[] = []; for (let q = -CHECKERS_RADIUS; q <= CHECKERS_RADIUS; q += 1) for (let r = -CHECKERS_RADIUS; r <= CHECKERS_RADIUS; r += 1) if (validCoord({ q, r })) cells.push({ q, r }); return cells; }

function topCamp(): ChineseCheckersCoord[] { const cells: ChineseCheckersCoord[] = []; for (let depth = 0; depth < 4; depth += 1) { const r = -CHECKERS_RADIUS + depth; for (let q = -depth; q <= 0; q += 1) cells.push({ q, r }); } return cells; }
export function campFor(color: ChineseCheckersColor): ChineseCheckersCoord[] { return color === "red" ? topCamp() : topCamp().map(({ q, r }) => ({ q: -q, r: -r })); }

function emptyBoard(): ChineseCheckersBoard { return Object.fromEntries(allCheckersCoords().map((coord) => [coordKey(coord), null])); }
export function initialChineseCheckersBoard(): ChineseCheckersBoard { const board = emptyBoard(); for (const coord of campFor("red")) board[coordKey(coord)] = "red"; for (const coord of campFor("yellow")) board[coordKey(coord)] = "yellow"; return board; }

function neighbors(coord: ChineseCheckersCoord): ChineseCheckersCoord[] { return DIRECTIONS.map(([dq, dr]) => ({ q: coord.q + dq, r: coord.r + dr })).filter(validCoord); }

export class ChineseCheckersGame {
  readonly board: ChineseCheckersBoard;
  readonly turn: ChineseCheckersColor;
  readonly moveCount: number;

  constructor(board: ChineseCheckersBoard = initialChineseCheckersBoard(), turn: ChineseCheckersColor = "red", moveCount = 0) {
    this.board = { ...board };
    this.turn = turn;
    this.moveCount = moveCount;
  }

  destinations(from: ChineseCheckersCoord): ChineseCheckersMove[] {
    if (!validCoord(from) || this.board[coordKey(from)] !== this.turn) return [];
    const moves: ChineseCheckersMove[] = [];
    for (const neighbor of neighbors(from)) if (this.board[coordKey(neighbor)] === null) moves.push({ from, to: neighbor, jumps: 0 });
    const visited = new Set<string>([coordKey(from)]);
    const queue: Array<{ coord: ChineseCheckersCoord; jumps: number }> = [{ coord: from, jumps: 0 }];
    while (queue.length) {
      const current = queue.shift()!;
      for (const [dq, dr] of DIRECTIONS) {
        const middle = { q: current.coord.q + dq, r: current.coord.r + dr };
        const landing = { q: current.coord.q + dq * 2, r: current.coord.r + dr * 2 };
        if (!validCoord(landing) || this.board[coordKey(middle)] === null || this.board[coordKey(landing)] !== null) continue;
        const key = coordKey(landing);
        if (visited.has(key)) continue;
        visited.add(key);
        const jump = current.jumps + 1;
        moves.push({ from, to: landing, jumps: jump });
        queue.push({ coord: landing, jumps: jump });
      }
    }
    return moves;
  }

  play(from: ChineseCheckersCoord, to: ChineseCheckersCoord): ChineseCheckersGame | null {
    if (this.winner()) return null;
    const move = this.destinations(from).find((candidate) => coordKey(candidate.to) === coordKey(to));
    if (!move) return null;
    const next = { ...this.board, [coordKey(from)]: null, [coordKey(to)]: this.turn };
    return new ChineseCheckersGame(next, other(this.turn), this.moveCount + 1);
  }

  winner(): ChineseCheckersColor | null {
    for (const color of ["red", "yellow"] as const) {
      const goal = new Set(campFor(other(color)).map(coordKey));
      const pieces = Object.entries(this.board).filter(([, cell]) => cell === color).map(([key]) => key);
      if (pieces.length === 10 && pieces.every((key) => goal.has(key))) return color;
    }
    return null;
  }
}

export function chooseChineseCheckersMove(game: ChineseCheckersGame): ChineseCheckersMove | null {
  const moves: ChineseCheckersMove[] = [];
  for (const [key, cell] of Object.entries(game.board)) if (cell === game.turn) { const [q, r] = key.split(":").map(Number); moves.push(...game.destinations({ q, r })); }
  if (moves.length === 0) return null;
  const goal = campFor(other(game.turn));
  const distance = (coord: ChineseCheckersCoord) => Math.min(...goal.map((target) => Math.abs(coord.q - target.q) + Math.abs(coord.r - target.r)));
  return [...moves].sort((a, b) => b.jumps - a.jumps || distance(a.to) - distance(b.to))[0];
}
