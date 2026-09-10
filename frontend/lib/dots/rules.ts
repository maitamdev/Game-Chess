export type DotsColor = "red" | "blue";
export type DotsOrientation = "h" | "v";
export interface DotsEdge { orientation: DotsOrientation; row: number; col: number; }

export const DOTS_BOX_ROWS = 4;
export const DOTS_BOX_COLS = 4;

function other(color: DotsColor): DotsColor {
  return color === "red" ? "blue" : "red";
}

function emptyEdges(rows: number, cols: number): boolean[][] {
  return Array.from({ length: rows }, () => Array<boolean>(cols).fill(false));
}

function edgeKey(edge: DotsEdge): string {
  return `${edge.orientation}:${edge.row}:${edge.col}`;
}

function validEdge(edge: DotsEdge): boolean {
  if (edge.orientation === "h") return edge.row >= 0 && edge.row <= DOTS_BOX_ROWS && edge.col >= 0 && edge.col < DOTS_BOX_COLS;
  return edge.row >= 0 && edge.row < DOTS_BOX_ROWS && edge.col >= 0 && edge.col <= DOTS_BOX_COLS;
}

export class DotsGame {
  readonly horizontal: boolean[][];
  readonly vertical: boolean[][];
  readonly boxes: Array<Array<DotsColor | null>>;
  readonly turn: DotsColor;
  readonly moveCount: number;

  constructor(
    horizontal = emptyEdges(DOTS_BOX_ROWS + 1, DOTS_BOX_COLS),
    vertical = emptyEdges(DOTS_BOX_ROWS, DOTS_BOX_COLS + 1),
    boxes: Array<Array<DotsColor | null>> = Array.from({ length: DOTS_BOX_ROWS }, () => Array<DotsColor | null>(DOTS_BOX_COLS).fill(null)),
    turn: DotsColor = "red",
    moveCount = 0,
  ) {
    this.horizontal = horizontal.map((row) => [...row]);
    this.vertical = vertical.map((row) => [...row]);
    this.boxes = boxes.map((row) => [...row]);
    this.turn = turn;
    this.moveCount = moveCount;
  }

  private boxComplete(row: number, col: number, horizontal: boolean[][], vertical: boolean[][]): boolean {
    return horizontal[row][col] && horizontal[row + 1][col] && vertical[row][col] && vertical[row][col + 1];
  }

  private adjacentBoxes(edge: DotsEdge): Array<[number, number]> {
    if (edge.orientation === "h") {
      return [
        ...(edge.row > 0 ? [[edge.row - 1, edge.col] as [number, number]] : []),
        ...(edge.row < DOTS_BOX_ROWS ? [[edge.row, edge.col] as [number, number]] : []),
      ];
    }
    return [
      ...(edge.col > 0 ? [[edge.row, edge.col - 1] as [number, number]] : []),
      ...(edge.col < DOTS_BOX_COLS ? [[edge.row, edge.col] as [number, number]] : []),
    ];
  }

  legalMoves(): DotsEdge[] {
    const moves: DotsEdge[] = [];
    for (let row = 0; row <= DOTS_BOX_ROWS; row += 1) for (let col = 0; col < DOTS_BOX_COLS; col += 1) if (!this.horizontal[row][col]) moves.push({ orientation: "h", row, col });
    for (let row = 0; row < DOTS_BOX_ROWS; row += 1) for (let col = 0; col <= DOTS_BOX_COLS; col += 1) if (!this.vertical[row][col]) moves.push({ orientation: "v", row, col });
    return moves;
  }

  play(edge: DotsEdge): DotsGame | null {
    if (!validEdge(edge) || (edge.orientation === "h" ? this.horizontal[edge.row][edge.col] : this.vertical[edge.row][edge.col])) return null;
    const horizontal = this.horizontal.map((row) => [...row]);
    const vertical = this.vertical.map((row) => [...row]);
    if (edge.orientation === "h") horizontal[edge.row][edge.col] = true;
    else vertical[edge.row][edge.col] = true;
    const boxes = this.boxes.map((row) => [...row]);
    let completed = 0;
    for (const [row, col] of this.adjacentBoxes(edge)) {
      if (!boxes[row][col] && this.boxComplete(row, col, horizontal, vertical)) {
        boxes[row][col] = this.turn;
        completed += 1;
      }
    }
    return new DotsGame(horizontal, vertical, boxes, completed > 0 ? this.turn : other(this.turn), this.moveCount + 1);
  }

  score(): Record<DotsColor, number> {
    return {
      red: this.boxes.flat().filter((color) => color === "red").length,
      blue: this.boxes.flat().filter((color) => color === "blue").length,
    };
  }

  winner(): DotsColor | "draw" | null {
    if (this.boxes.flat().some((box) => box === null)) return null;
    const score = this.score();
    if (score.red === score.blue) return "draw";
    return score.red > score.blue ? "red" : "blue";
  }
}

export function chooseDotsMove(game: DotsGame): DotsEdge | null {
  const moves = game.legalMoves();
  if (moves.length === 0) return null;
  const currentScore = game.score()[game.turn];
  const scoringMove = moves.find((move) => (game.play(move)?.score()[game.turn] ?? currentScore) > currentScore);
  return scoringMove ?? moves[Math.floor(moves.length / 2)];
}

export function dotsEdgeKey(edge: DotsEdge): string {
  return edgeKey(edge);
}
