/**
 * Luật cờ caro (Gomoku) - bàn 200×200 giao điểm, X đi trước,
 * thắng khi có ≥5 quân liên tiếp (ngang/dọc/chéo). Không có luật cấm
 * (freestyle) - đúng kiểu caro giấy phổ thông.
 *
 * Toạ độ 0-based: uci = "x.y" (ví dụ "104.98"), san = "X104.98"/"O104.98".
 */

export const CARO_SIZE = 200;

export type CaroColor = "x" | "o"; // x đi trước

export interface CaroMove {
  x: number;
  y: number;
  color: CaroColor;
  uci: string;
  san: string;
}

export interface CaroEnd {
  winner: CaroColor | null; // null = hoà (bàn đầy - gần như không xảy ra)
  termination: string;
  /** 5+ ô tạo thành đường thắng, để tô sáng */
  line?: { x: number; y: number }[];
}

const DIRS: [number, number][] = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

export function caroUci(x: number, y: number): string {
  return `${x}.${y}`;
}

export function parseCaroUci(uci: string): { x: number; y: number } | null {
  const m = uci.match(/^(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const x = Number(m[1]);
  const y = Number(m[2]);
  if (x < 0 || x >= CARO_SIZE || y < 0 || y >= CARO_SIZE) return null;
  return { x, y };
}

export class Caro {
  /** 0 = trống, 1 = x, 2 = o */
  private grid = new Uint8Array(CARO_SIZE * CARO_SIZE);
  moves: CaroMove[] = [];
  private ended: CaroEnd | null = null;

  turn(): CaroColor {
    return this.moves.length % 2 === 0 ? "x" : "o";
  }

  get ply(): number {
    return this.moves.length;
  }

  at(x: number, y: number): CaroColor | null {
    const v = this.grid[y * CARO_SIZE + x];
    return v === 0 ? null : v === 1 ? "x" : "o";
  }

  /** Đặt quân; trả về nước đi hoặc null nếu không hợp lệ. */
  move(uci: string): CaroMove | null {
    if (this.ended) return null;
    const pt = parseCaroUci(uci);
    if (!pt) return null;
    const { x, y } = pt;
    if (this.grid[y * CARO_SIZE + x] !== 0) return null;
    const color = this.turn();
    this.grid[y * CARO_SIZE + x] = color === "x" ? 1 : 2;
    const mv: CaroMove = {
      x,
      y,
      color,
      uci: caroUci(x, y),
      san: `${color === "x" ? "X" : "O"}${caroUci(x, y)}`,
    };
    this.moves.push(mv);
    const line = this.winLineAt(x, y);
    if (line) {
      this.ended = { winner: color, termination: "five_in_row", line };
    } else if (this.moves.length === CARO_SIZE * CARO_SIZE) {
      this.ended = { winner: null, termination: "board_full" };
    }
    return mv;
  }

  undo(): CaroMove | null {
    const mv = this.moves.pop();
    if (!mv) return null;
    this.grid[mv.y * CARO_SIZE + mv.x] = 0;
    this.ended = null;
    return mv;
  }

  gameEnd(): CaroEnd | null {
    return this.ended;
  }

  /** Đường ≥5 quân cùng màu đi qua (x,y), nếu có. */
  private winLineAt(x: number, y: number): { x: number; y: number }[] | null {
    const v = this.grid[y * CARO_SIZE + x];
    for (const [dx, dy] of DIRS) {
      const cells: { x: number; y: number }[] = [{ x, y }];
      for (const sign of [1, -1]) {
        let cx = x + dx * sign;
        let cy = y + dy * sign;
        while (
          cx >= 0 &&
          cx < CARO_SIZE &&
          cy >= 0 &&
          cy < CARO_SIZE &&
          this.grid[cy * CARO_SIZE + cx] === v
        ) {
          if (sign === 1) cells.push({ x: cx, y: cy });
          else cells.unshift({ x: cx, y: cy });
          cx += dx * sign;
          cy += dy * sign;
        }
      }
      if (cells.length >= 5) return cells;
    }
    return null;
  }
}
