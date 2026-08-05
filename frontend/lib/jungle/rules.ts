/**
 * Luật cờ thú (Jungle / Đấu thú kỳ) - bàn 7 cột (a-g) × 9 hàng (0-8),
 * Đỏ ở dưới đi trước.
 *
 * Cấp thú: Voi 8, Sư tử 7, Hổ 6, Báo 5, Sói 4, Chó 3, Mèo 2, Chuột 1.
 * - Ăn được quân cấp ≤ mình; NGOẠI LỆ: Chuột ăn được Voi, Voi không ăn được Chuột.
 * - Sông: 2 vùng 2×3 (cột b-c và e-f, hàng 3-5). Chỉ Chuột được xuống nước.
 * - Chuột dưới nước: không bị quân trên cạn ăn, không được ăn/bị ăn khi
 *   băng ranh giới nước-cạn; hai chuột cùng dưới nước ăn nhau bình thường.
 * - Sư tử và Hổ nhảy thẳng qua sông (dọc hoặc ngang), bị chặn nếu có
 *   BẤT KỲ chuột nào (kể cả của mình) nằm trên đường nước.
 * - Bẫy: 3 ô quanh hang mỗi bên; quân ĐỊCH đứng trong bẫy của mình bị
 *   hạ cấp về 0 - quân nào của mình cũng ăn được.
 * - Hang: không được vào hang của chính mình; vào hang địch là THẮNG.
 * - Hết quân hoặc hết nước đi là THUA. Lặp thế 3 lần: hoà.
 *
 * uci = "a2a3". san = "Tên uci", ví dụ "Chuột a2a3".
 */

export type JgColor = "r" | "b"; // đỏ đi trước (ánh xạ "white" phía server)
export type JgRank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface JgPiece {
  rank: JgRank;
  color: JgColor;
}

export interface JgMove {
  from: string;
  to: string;
  rank: JgRank;
  color: JgColor;
  captured?: JgRank;
  san: string;
  uci: string;
}

export const JG_FILES = 7;
export const JG_RANKS = 9;

export const JG_NAMES: Record<JgRank, string> = {
  8: "Voi",
  7: "Sư tử",
  6: "Hổ",
  5: "Báo",
  4: "Sói",
  3: "Chó",
  2: "Mèo",
  1: "Chuột",
};

const FILES = "abcdefg";

export function jgSquare(rank: number, file: number): string {
  return `${FILES[file]}${rank}`;
}

export function jgCoords(square: string): { rank: number; file: number } {
  return { rank: Number(square[1]), file: square.charCodeAt(0) - 97 };
}

function idx(rank: number, file: number): number {
  return rank * JG_FILES + file;
}

// mặt bàn đặc biệt
const WATER = new Set<number>();
for (const r of [3, 4, 5]) {
  for (const f of [1, 2, 4, 5]) WATER.add(idx(r, f));
}
export const JG_WATER = WATER;
export const JG_DEN: Record<JgColor, number> = { r: idx(0, 3), b: idx(8, 3) };
export const JG_TRAPS: Record<JgColor, Set<number>> = {
  r: new Set([idx(0, 2), idx(0, 4), idx(1, 3)]),
  b: new Set([idx(8, 2), idx(8, 4), idx(7, 3)]),
};

const START: [JgColor, JgRank, number, number][] = [
  // đỏ (dưới)
  ["r", 7, 0, 0], ["r", 6, 0, 6],
  ["r", 3, 1, 1], ["r", 2, 1, 5],
  ["r", 1, 2, 0], ["r", 5, 2, 2], ["r", 4, 2, 4], ["r", 8, 2, 6],
  // đen (trên) - xoay 180°
  ["b", 7, 8, 6], ["b", 6, 8, 0],
  ["b", 3, 7, 5], ["b", 2, 7, 1],
  ["b", 1, 6, 6], ["b", 5, 6, 4], ["b", 4, 6, 2], ["b", 8, 6, 0],
];

const ORTHO: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const LETTERS: Record<JgRank, string> = {
  8: "E", 7: "L", 6: "T", 5: "P", 4: "W", 3: "D", 2: "C", 1: "R",
};

interface Undo {
  fromIdx: number;
  toIdx: number;
  captured: JgPiece | null;
}

export interface JgEnd {
  winner: JgColor | null;
  termination: string; // 'den' | 'no_pieces' | 'stalemate' | 'repetition'
}

export class Jungle {
  private squares: (JgPiece | null)[] = new Array(63).fill(null);
  private side: JgColor = "r";
  private plyCount = 0;
  private undoStack: Undo[] = [];
  historyMoves: JgMove[] = [];
  private positionCounts = new Map<string, number>();

  constructor(uciMoves?: string[]) {
    for (const [color, rank, r, f] of START) {
      this.squares[idx(r, f)] = { rank, color };
    }
    this.positionCounts.set(this.positionKey(), 1);
    for (const uci of uciMoves ?? []) {
      if (!this.move(uci)) throw new Error(`Nước cờ thú không hợp lệ: ${uci}`);
    }
  }

  turn(): JgColor {
    return this.side;
  }

  get ply(): number {
    return this.plyCount;
  }

  fen(): string {
    const rows: string[] = [];
    for (let r = 8; r >= 0; r--) {
      let row = "";
      let empty = 0;
      for (let f = 0; f < JG_FILES; f++) {
        const p = this.squares[idx(r, f)];
        if (!p) {
          empty++;
          continue;
        }
        if (empty) {
          row += empty;
          empty = 0;
        }
        const ch = LETTERS[p.rank];
        row += p.color === "r" ? ch : ch.toLowerCase();
      }
      if (empty) row += empty;
      rows.push(row);
    }
    return `${rows.join("/")} ${this.side} ${this.plyCount}`;
  }

  positionKey(): string {
    return this.fen().split(" ").slice(0, 2).join(" ");
  }

  pieces(): { rank: JgRank; color: JgColor; square: string }[] {
    const out: { rank: JgRank; color: JgColor; square: string }[] = [];
    for (let i = 0; i < 63; i++) {
      const p = this.squares[i];
      if (p) {
        out.push({
          rank: p.rank,
          color: p.color,
          square: jgSquare(Math.floor(i / JG_FILES), i % JG_FILES),
        });
      }
    }
    return out;
  }

  get(square: string): JgPiece | null {
    const { rank, file } = jgCoords(square);
    return this.squares[idx(rank, file)];
  }

  /** attacker tại ô fromI ăn được defender tại ô toI không? */
  private canCapture(att: JgPiece, fromI: number, def: JgPiece, toI: number): boolean {
    const attInWater = WATER.has(fromI);
    const defInWater = WATER.has(toI);
    // băng ranh giới nước-cạn: cấm ăn
    if (attInWater !== defInWater) return false;
    // quân địch đứng trong bẫy CỦA MÌNH → cấp 0
    if (JG_TRAPS[att.color].has(toI)) return true;
    if (att.rank === 1 && def.rank === 8) return true; // chuột ăn voi
    if (att.rank === 8 && def.rank === 1) return false; // voi không ăn chuột
    return att.rank >= def.rank;
  }

  /** Đích nhảy sông của Sư tử/Hổ theo hướng (dr,df), null nếu bị chặn. */
  private jumpTarget(fromI: number, dr: number, df: number): number | null {
    let r = Math.floor(fromI / JG_FILES) + dr;
    let f = (fromI % JG_FILES) + df;
    if (r < 0 || r >= JG_RANKS || f < 0 || f >= JG_FILES) return null;
    if (!WATER.has(idx(r, f))) return null; // không phải mép sông hướng này
    while (r >= 0 && r < JG_RANKS && f >= 0 && f < JG_FILES && WATER.has(idx(r, f))) {
      if (this.squares[idx(r, f)]) return null; // chuột chặn đường nhảy
      r += dr;
      f += df;
    }
    if (r < 0 || r >= JG_RANKS || f < 0 || f >= JG_FILES) return null;
    return idx(r, f);
  }

  private pseudoTargets(fromI: number): number[] {
    const p = this.squares[fromI]!;
    const r0 = Math.floor(fromI / JG_FILES);
    const f0 = fromI % JG_FILES;
    const out: number[] = [];
    for (const [dr, df] of ORTHO) {
      const r = r0 + dr;
      const f = f0 + df;
      if (r < 0 || r >= JG_RANKS || f < 0 || f >= JG_FILES) continue;
      const toI = idx(r, f);
      if (toI === JG_DEN[p.color]) continue; // không vào hang mình
      if (WATER.has(toI)) {
        if (p.rank === 1) out.push(toI); // chỉ chuột xuống nước
        else if (p.rank === 7 || p.rank === 6) {
          const jump = this.jumpTarget(fromI, dr, df);
          if (jump !== null && jump !== JG_DEN[p.color]) out.push(jump);
        }
        continue;
      }
      out.push(toI);
    }
    return out;
  }

  moves(opts: { square?: string } = {}): JgMove[] {
    const out: JgMove[] = [];
    for (let i = 0; i < 63; i++) {
      const p = this.squares[i];
      if (!p || p.color !== this.side) continue;
      const from = jgSquare(Math.floor(i / JG_FILES), i % JG_FILES);
      if (opts.square && from !== opts.square) continue;
      for (const t of this.pseudoTargets(i)) {
        const occ = this.squares[t];
        if (occ) {
          if (occ.color === p.color) continue;
          if (!this.canCapture(p, i, occ, t)) continue;
        }
        const to = jgSquare(Math.floor(t / JG_FILES), t % JG_FILES);
        out.push({
          from,
          to,
          rank: p.rank,
          color: p.color,
          captured: occ?.rank,
          san: `${JG_NAMES[p.rank]} ${from}${to}`,
          uci: `${from}${to}`,
        });
      }
    }
    return out;
  }

  move(input: string | { from: string; to: string }): JgMove | null {
    const from = typeof input === "string" ? input.slice(0, 2) : input.from;
    const to = typeof input === "string" ? input.slice(2, 4) : input.to;
    const legal = this.moves({ square: from }).find((m) => m.to === to);
    if (!legal) return null;
    const { rank: fr, file: ff } = jgCoords(from);
    const { rank: tr, file: tf } = jgCoords(to);
    const fromI = idx(fr, ff);
    const toI = idx(tr, tf);
    this.undoStack.push({ fromIdx: fromI, toIdx: toI, captured: this.squares[toI] });
    this.squares[toI] = this.squares[fromI];
    this.squares[fromI] = null;
    this.side = this.side === "r" ? "b" : "r";
    this.plyCount++;
    this.historyMoves.push(legal);
    const key = this.positionKey();
    this.positionCounts.set(key, (this.positionCounts.get(key) ?? 0) + 1);
    return legal;
  }

  undo(): JgMove | null {
    const u = this.undoStack.pop();
    if (!u) return null;
    const key = this.positionKey();
    const count = this.positionCounts.get(key) ?? 0;
    if (count <= 1) this.positionCounts.delete(key);
    else this.positionCounts.set(key, count - 1);
    this.squares[u.fromIdx] = this.squares[u.toIdx];
    this.squares[u.toIdx] = u.captured;
    this.side = this.side === "r" ? "b" : "r";
    this.plyCount--;
    return this.historyMoves.pop() ?? null;
  }

  gameEnd(): JgEnd | null {
    // vào hang địch (kiểm cả hai hang - quân đứng trên hang địch)
    const onRedDen = this.squares[JG_DEN.r];
    if (onRedDen && onRedDen.color === "b") return { winner: "b", termination: "den" };
    const onBlackDen = this.squares[JG_DEN.b];
    if (onBlackDen && onBlackDen.color === "r") {
      return { winner: "r", termination: "den" };
    }
    // hết quân
    let redCount = 0;
    let blackCount = 0;
    for (const p of this.squares) {
      if (!p) continue;
      if (p.color === "r") redCount++;
      else blackCount++;
    }
    if (redCount === 0) return { winner: "b", termination: "no_pieces" };
    if (blackCount === 0) return { winner: "r", termination: "no_pieces" };
    // bên đến lượt hết nước đi → thua
    if (this.moves().length === 0) {
      return { winner: this.side === "r" ? "b" : "r", termination: "stalemate" };
    }
    if ((this.positionCounts.get(this.positionKey()) ?? 0) >= 3) {
      return { winner: null, termination: "repetition" };
    }
    return null;
  }

  hasPieces(color: JgColor): boolean {
    return this.squares.some((p) => p !== null && p.color === color);
  }

  private searchStack: Undo[] = [];

  /** Đường nhanh cho engine: áp nước ĐÃ xác minh, không cập nhật lịch sử. */
  pushMove(m: JgMove): void {
    const { rank: fr, file: ff } = jgCoords(m.from);
    const { rank: tr, file: tf } = jgCoords(m.to);
    const fromI = idx(fr, ff);
    const toI = idx(tr, tf);
    this.searchStack.push({ fromIdx: fromI, toIdx: toI, captured: this.squares[toI] });
    this.squares[toI] = this.squares[fromI];
    this.squares[fromI] = null;
    this.side = this.side === "r" ? "b" : "r";
  }

  popMove(): void {
    const u = this.searchStack.pop();
    if (!u) return;
    this.squares[u.fromIdx] = this.squares[u.toIdx];
    this.squares[u.toIdx] = u.captured;
    this.side = this.side === "r" ? "b" : "r";
  }

  /** Mảng 63 ô chỉ đọc cho hàm lượng giá. */
  boardArray(): readonly (JgPiece | null)[] {
    return this.squares;
  }
}
