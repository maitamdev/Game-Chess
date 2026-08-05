/**
 * Bộ luật cờ tướng (Xiangqi) - tự viết, không phụ thuộc thư viện ngoài.
 *
 * Bàn 9 cột (file a-i, từ trái của bên Đỏ) × 10 hàng (rank 0-9, 0 là hàng
 * đáy bên Đỏ). Ô ký hiệu "e0" = vị trí Tướng đỏ ban đầu. idx = rank*9+file.
 *
 * Quân: k Tướng, a Sĩ, e Tượng, h Mã, r Xe, c Pháo, s Tốt.
 * Màu: 'r' Đỏ (đi trước), 'b' Đen.
 *
 * Luật: cản mã (chân mã), cản tượng (mắt tượng), Tượng không qua sông,
 * Sĩ/Tướng trong cung, Pháo ăn qua đúng một ngòi, Tốt qua sông đi ngang,
 * lộ mặt tướng (hai Tướng không được đối mặt trên cột trống), hết nước đi
 * là THUA (chiếu bí lẫn hết nước), hoà: lặp thế 3 lần, 60 nước không ăn
 * quân, hai bên không còn quân tấn công.
 */

export type XqColor = "r" | "b";
export type XqPieceType = "k" | "a" | "e" | "h" | "r" | "c" | "s";

export interface XqPiece {
  type: XqPieceType;
  color: XqColor;
}

export interface XqMove {
  from: string;
  to: string;
  piece: XqPieceType;
  color: XqColor;
  captured?: XqPieceType;
  /** ký hiệu hiển thị: chữ Hán + toạ độ, ví dụ "炮b2e2" */
  san: string;
  uci: string;
}

export const XQ_START_FEN =
  "rheakaehr/9/1c5c1/s1s1s1s1s/9/9/S1S1S1S1S/1C5C1/9/RHEAKAEHR r 0 0";

export const XQ_PIECE_CHARS: Record<XqColor, Record<XqPieceType, string>> = {
  r: { k: "帥", a: "仕", e: "相", h: "傌", r: "俥", c: "炮", s: "兵" },
  b: { k: "將", a: "士", e: "象", h: "馬", r: "車", c: "砲", s: "卒" },
};

export const XQ_PIECE_NAMES: Record<XqPieceType, string> = {
  k: "Tướng",
  a: "Sĩ",
  e: "Tượng",
  h: "Mã",
  r: "Xe",
  c: "Pháo",
  s: "Tốt",
};

const FILES = "abcdefghi";

export function xqSquare(rank: number, file: number): string {
  return `${FILES[file]}${rank}`;
}

export function xqCoords(square: string): { rank: number; file: number } {
  return { rank: Number(square[1]), file: square.charCodeAt(0) - 97 };
}

function idx(rank: number, file: number): number {
  return rank * 9 + file;
}

const HORSE_DELTAS: [number, number, number, number][] = [
  // [dr, df, legDr, legDf]
  [2, 1, 1, 0],
  [2, -1, 1, 0],
  [-2, 1, -1, 0],
  [-2, -1, -1, 0],
  [1, 2, 0, 1],
  [1, -2, 0, -1],
  [-1, 2, 0, 1],
  [-1, -2, 0, -1],
];

const ORTHO: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

interface Undo {
  move: { fromIdx: number; toIdx: number };
  captured: XqPiece | null;
  halfmove: number;
}

export class Xiangqi {
  private squares: (XqPiece | null)[] = new Array(90).fill(null);
  private side: XqColor = "r";
  private halfmove = 0; // số ply không ăn quân (luật 60 nước = 120 ply)
  private plyCount = 0;
  private undoStack: Undo[] = [];
  private positionCounts = new Map<string, number>();
  historyMoves: XqMove[] = [];
  /** key thế cờ SAU từng nước - phục vụ phát hiện chu kỳ lặp */
  private keyHistory: string[] = [];
  /** nước thứ i có chiếu tướng không - phục vụ luật chiếu dai */
  private checkHistory: boolean[] = [];

  constructor(fen: string = XQ_START_FEN) {
    this.load(fen);
  }

  load(fen: string): void {
    const [boardPart, side, halfmove, ply] = fen.trim().split(/\s+/);
    this.squares.fill(null);
    const ranks = boardPart.split("/");
    if (ranks.length !== 10) throw new Error("FEN cờ tướng phải có 10 hàng");
    for (let i = 0; i < 10; i++) {
      const rank = 9 - i; // FEN viết từ hàng trên (đen) xuống
      let file = 0;
      for (const ch of ranks[i]) {
        if (/\d/.test(ch)) {
          file += Number(ch);
        } else {
          const color: XqColor = ch === ch.toUpperCase() ? "r" : "b";
          const type = ch.toLowerCase() as XqPieceType;
          if (!"kaehrcs".includes(type)) throw new Error(`Quân lạ: ${ch}`);
          this.squares[idx(rank, file)] = { type, color };
          file++;
        }
      }
      if (file !== 9) throw new Error(`Hàng FEN sai độ dài: ${ranks[i]}`);
    }
    this.side = side === "b" ? "b" : "r";
    this.halfmove = Number(halfmove ?? 0) || 0;
    this.plyCount = Number(ply ?? 0) || 0;
    this.undoStack = [];
    this.historyMoves = [];
    this.keyHistory = [];
    this.checkHistory = [];
    this.positionCounts = new Map([[this.positionKey(), 1]]);
  }

  fen(): string {
    const rows: string[] = [];
    for (let rank = 9; rank >= 0; rank--) {
      let row = "";
      let empty = 0;
      for (let file = 0; file < 9; file++) {
        const p = this.squares[idx(rank, file)];
        if (!p) {
          empty++;
          continue;
        }
        if (empty > 0) {
          row += empty;
          empty = 0;
        }
        row += p.color === "r" ? p.type.toUpperCase() : p.type;
      }
      if (empty > 0) row += empty;
      rows.push(row);
    }
    return `${rows.join("/")} ${this.side} ${this.halfmove} ${this.plyCount}`;
  }

  /** Khoá thế cờ (bàn + bên đi) - dùng cho lặp thế và engine. */
  positionKey(): string {
    return this.fen().split(" ").slice(0, 2).join(" ");
  }

  turn(): XqColor {
    return this.side;
  }

  get ply(): number {
    return this.plyCount;
  }

  pieces(): { type: XqPieceType; color: XqColor; square: string }[] {
    const out: { type: XqPieceType; color: XqColor; square: string }[] = [];
    for (let i = 0; i < 90; i++) {
      const p = this.squares[i];
      if (p) out.push({ type: p.type, color: p.color, square: xqSquare(Math.floor(i / 9), i % 9) });
    }
    return out;
  }

  get(square: string): XqPiece | null {
    const { rank, file } = xqCoords(square);
    return this.squares[idx(rank, file)];
  }

  // ---------- sinh nước đi ----------

  private inPalace(color: XqColor, rank: number, file: number): boolean {
    if (file < 3 || file > 5) return false;
    return color === "r" ? rank <= 2 : rank >= 7;
  }

  private ownSide(color: XqColor, rank: number): boolean {
    return color === "r" ? rank <= 4 : rank >= 5;
  }

  private kingIndex(color: XqColor): number {
    for (let i = 0; i < 90; i++) {
      const p = this.squares[i];
      if (p && p.type === "k" && p.color === color) return i;
    }
    return -1;
  }

  /** Sinh nước đi giả (chưa lọc chiếu / lộ mặt tướng). */
  private pseudoMovesFrom(rank: number, file: number): number[] {
    const p = this.squares[idx(rank, file)];
    if (!p) return [];
    const targets: number[] = [];
    const push = (r: number, f: number) => {
      if (r < 0 || r > 9 || f < 0 || f > 8) return;
      const occ = this.squares[idx(r, f)];
      if (occ && occ.color === p.color) return;
      targets.push(idx(r, f));
    };

    switch (p.type) {
      case "k":
        for (const [dr, df] of ORTHO) {
          const r = rank + dr;
          const f = file + df;
          if (this.inPalace(p.color, r, f)) push(r, f);
        }
        break;
      case "a":
        for (const dr of [1, -1]) {
          for (const df of [1, -1]) {
            const r = rank + dr;
            const f = file + df;
            if (this.inPalace(p.color, r, f)) push(r, f);
          }
        }
        break;
      case "e":
        for (const dr of [2, -2]) {
          for (const df of [2, -2]) {
            const r = rank + dr;
            const f = file + df;
            if (r < 0 || r > 9 || f < 0 || f > 8) continue;
            if (!this.ownSide(p.color, r)) continue; // không qua sông
            const eye = this.squares[idx(rank + dr / 2, file + df / 2)];
            if (eye) continue; // cản mắt tượng
            push(r, f);
          }
        }
        break;
      case "h":
        for (const [dr, df, legDr, legDf] of HORSE_DELTAS) {
          const r = rank + dr;
          const f = file + df;
          if (r < 0 || r > 9 || f < 0 || f > 8) continue;
          const leg = this.squares[idx(rank + legDr, file + legDf)];
          if (leg) continue; // cản chân mã
          push(r, f);
        }
        break;
      case "r":
        for (const [dr, df] of ORTHO) {
          let r = rank + dr;
          let f = file + df;
          while (r >= 0 && r <= 9 && f >= 0 && f <= 8) {
            const occ = this.squares[idx(r, f)];
            if (!occ) {
              targets.push(idx(r, f));
            } else {
              if (occ.color !== p.color) targets.push(idx(r, f));
              break;
            }
            r += dr;
            f += df;
          }
        }
        break;
      case "c":
        for (const [dr, df] of ORTHO) {
          let r = rank + dr;
          let f = file + df;
          let screen = false;
          while (r >= 0 && r <= 9 && f >= 0 && f <= 8) {
            const occ = this.squares[idx(r, f)];
            if (!screen) {
              if (!occ) targets.push(idx(r, f));
              else screen = true; // gặp ngòi
            } else if (occ) {
              if (occ.color !== p.color) targets.push(idx(r, f)); // ăn qua ngòi
              break;
            }
            r += dr;
            f += df;
          }
        }
        break;
      case "s": {
        const forward = p.color === "r" ? 1 : -1;
        push(rank + forward, file);
        const crossed = p.color === "r" ? rank >= 5 : rank <= 4;
        if (crossed) {
          push(rank, file - 1);
          push(rank, file + 1);
        }
        break;
      }
    }
    return targets;
  }

  /** Ô (rank,file) có bị màu `by` tấn công không (phục vụ kiểm tra chiếu).
   *  Bao gồm luật lộ mặt tướng: Tướng địch trên cùng cột trống = tấn công. */
  private isAttacked(rank: number, file: number, by: XqColor): boolean {
    // Xe + Tướng đối mặt (quét 4 hướng thẳng)
    for (const [dr, df] of ORTHO) {
      let r = rank + dr;
      let f = file + df;
      while (r >= 0 && r <= 9 && f >= 0 && f <= 8) {
        const occ = this.squares[idx(r, f)];
        if (occ) {
          if (occ.color === by && (occ.type === "r" || occ.type === "k")) return true;
          break;
        }
        r += dr;
        f += df;
      }
    }
    // Pháo: quân đầu tiên là ngòi, quân thứ hai nếu là pháo địch thì bị tấn công
    for (const [dr, df] of ORTHO) {
      let r = rank + dr;
      let f = file + df;
      let screen = false;
      while (r >= 0 && r <= 9 && f >= 0 && f <= 8) {
        const occ = this.squares[idx(r, f)];
        if (occ) {
          if (!screen) {
            screen = true;
          } else {
            if (occ.color === by && occ.type === "c") return true;
            break;
          }
        }
        r += dr;
        f += df;
      }
    }
    // Mã: chân mã tính từ vị trí CON MÃ (đứng cạnh chéo ô đích)
    for (const [dr, df] of HORSE_DELTAS) {
      const r = rank + dr;
      const f = file + df;
      if (r < 0 || r > 9 || f < 0 || f > 8) continue;
      const occ = this.squares[idx(r, f)];
      if (!occ || occ.color !== by || occ.type !== "h") continue;
      // chân của mã tấn công nằm giữa mã và ô đích, cạnh chéo ô đích
      const leg = this.squares[idx(r - dr + (dr > 0 ? 1 : dr < 0 ? -1 : 0), f - df + (df > 0 ? 1 : df < 0 ? -1 : 0))];
      if (!leg) return true;
    }
    // Tốt: tấn công ô phía trước nó và (khi đã qua sông) hai bên
    const back = by === "r" ? -1 : 1; // tốt của `by` đứng sau ô đích theo hướng tiến
    {
      const r = rank + back;
      if (r >= 0 && r <= 9) {
        const occ = this.squares[idx(r, file)];
        if (occ && occ.color === by && occ.type === "s") return true;
      }
      for (const df of [-1, 1]) {
        const f = file + df;
        if (f < 0 || f > 8) continue;
        const occ = this.squares[idx(rank, f)];
        if (occ && occ.color === by && occ.type === "s") {
          const crossed = by === "r" ? rank >= 5 : rank <= 4;
          if (crossed) return true;
        }
      }
    }
    return false;
  }

  inCheck(color: XqColor = this.side): boolean {
    const k = this.kingIndex(color);
    if (k < 0) return false;
    return this.isAttacked(Math.floor(k / 9), k % 9, color === "r" ? "b" : "r");
  }

  private makeRaw(fromIdx: number, toIdx: number): Undo {
    const undo: Undo = {
      move: { fromIdx, toIdx },
      captured: this.squares[toIdx],
      halfmove: this.halfmove,
    };
    this.squares[toIdx] = this.squares[fromIdx];
    this.squares[fromIdx] = null;
    this.side = this.side === "r" ? "b" : "r";
    return undo;
  }

  private unmakeRaw(undo: Undo): void {
    this.squares[undo.move.fromIdx] = this.squares[undo.move.toIdx];
    this.squares[undo.move.toIdx] = undo.captured;
    this.side = this.side === "r" ? "b" : "r";
    this.halfmove = undo.halfmove;
  }

  /** Nước đi hợp lệ cho một ô hoặc toàn bàn. */
  moves(opts: { square?: string } = {}): XqMove[] {
    const out: XqMove[] = [];
    const color = this.side;
    for (let i = 0; i < 90; i++) {
      const p = this.squares[i];
      if (!p || p.color !== color) continue;
      const rank = Math.floor(i / 9);
      const file = i % 9;
      const from = xqSquare(rank, file);
      if (opts.square && from !== opts.square) continue;
      for (const t of this.pseudoMovesFrom(rank, file)) {
        const captured = this.squares[t];
        const undo = this.makeRaw(i, t);
        const legal = !this.inCheck(color);
        this.unmakeRaw(undo);
        if (!legal) continue;
        const to = xqSquare(Math.floor(t / 9), t % 9);
        out.push({
          from,
          to,
          piece: p.type,
          color,
          captured: captured?.type,
          san: `${XQ_PIECE_CHARS[color][p.type]}${from}${to}`,
          uci: `${from}${to}`,
        });
      }
    }
    return out;
  }

  /** Áp một nước; trả về nước đã đi hoặc null nếu không hợp lệ. */
  move(input: string | { from: string; to: string }): XqMove | null {
    const from = typeof input === "string" ? input.slice(0, 2) : input.from;
    const to = typeof input === "string" ? input.slice(2, 4) : input.to;
    const legal = this.moves({ square: from }).find((m) => m.to === to);
    if (!legal) return null;

    const { rank: fr, file: ff } = xqCoords(from);
    const { rank: tr, file: tf } = xqCoords(to);
    const undo = this.makeRaw(idx(fr, ff), idx(tr, tf));
    this.halfmove = legal.captured ? 0 : this.halfmove + 1;
    this.plyCount++;
    this.undoStack.push(undo);
    this.historyMoves.push(legal);
    const key = this.positionKey();
    this.positionCounts.set(key, (this.positionCounts.get(key) ?? 0) + 1);
    this.keyHistory.push(key);
    this.checkHistory.push(this.inCheck(this.side)); // nước vừa đi có chiếu không
    return legal;
  }

  undo(): XqMove | null {
    const undo = this.undoStack.pop();
    if (!undo) return null;
    const key = this.positionKey();
    const count = this.positionCounts.get(key) ?? 0;
    if (count <= 1) this.positionCounts.delete(key);
    else this.positionCounts.set(key, count - 1);
    this.unmakeRaw(undo);
    this.plyCount--;
    this.keyHistory.pop();
    this.checkHistory.pop();
    return this.historyMoves.pop() ?? null;
  }

  /** Kết thúc ván? Hết nước đi trong cờ tướng là THUA (kể cả không bị chiếu). */
  gameEnd(): { winner: XqColor | null; termination: string } | null {
    if (this.moves().length === 0) {
      return {
        winner: this.side === "r" ? "b" : "r",
        termination: this.inCheck() ? "checkmate" : "stalemate",
      };
    }
    if ((this.positionCounts.get(this.positionKey()) ?? 0) >= 3) {
      // Luật chiếu dai: trong chu kỳ lặp, bên nào MỌI nước đều chiếu
      // (một chiều) thì bên đó THUA; ngược lại là hoà lặp thế.
      const key = this.positionKey();
      const last = this.keyHistory.length - 1;
      let prev = -1;
      for (let i = last - 1; i >= 0; i--) {
        if (this.keyHistory[i] === key) {
          prev = i;
          break;
        }
      }
      if (prev >= 0) {
        const allChecks: Record<XqColor, boolean> = { r: true, b: true };
        const seen: Record<XqColor, boolean> = { r: false, b: false };
        for (let i = prev + 1; i <= last; i++) {
          const color = this.historyMoves[i].color;
          seen[color] = true;
          if (!this.checkHistory[i]) allChecks[color] = false;
        }
        const redPerp = seen.r && allChecks.r;
        const blackPerp = seen.b && allChecks.b;
        if (redPerp && !blackPerp) {
          return { winner: "b", termination: "perpetual_check" };
        }
        if (blackPerp && !redPerp) {
          return { winner: "r", termination: "perpetual_check" };
        }
      }
      return { winner: null, termination: "repetition" };
    }
    if (this.halfmove >= 120) {
      return { winner: null, termination: "fifty_move" }; // luật 60 nước của cờ tướng
    }
    let attackers = 0;
    for (let i = 0; i < 90; i++) {
      const p = this.squares[i];
      if (p && (p.type === "r" || p.type === "c" || p.type === "h" || p.type === "s")) {
        attackers++;
      }
    }
    if (attackers === 0) return { winner: null, termination: "insufficient" };
    return null;
  }

  /** Bên `color` còn quân tấn công không (dùng khi đối thủ hết giờ). */
  hasAttackingMaterial(color: XqColor): boolean {
    for (let i = 0; i < 90; i++) {
      const p = this.squares[i];
      if (
        p &&
        p.color === color &&
        (p.type === "r" || p.type === "c" || p.type === "h" || p.type === "s")
      ) {
        return true;
      }
    }
    return false;
  }

  private searchStack: Undo[] = [];

  /** Áp nước ĐÃ được xác minh (lấy từ moves()) - đường nhanh cho engine
   *  tìm kiếm, không cập nhật lịch sử/lặp thế. Phải gỡ bằng popMove(). */
  pushMove(m: XqMove): void {
    const { rank: fr, file: ff } = xqCoords(m.from);
    const { rank: tr, file: tf } = xqCoords(m.to);
    this.searchStack.push(this.makeRaw(idx(fr, ff), idx(tr, tf)));
  }

  popMove(): void {
    const undo = this.searchStack.pop();
    if (undo) this.unmakeRaw(undo);
  }

  /** Mảng 90 ô (rank*9+file) - chỉ đọc, phục vụ hàm lượng giá. */
  boardArray(): readonly (XqPiece | null)[] {
    return this.squares;
  }

  /** Đếm nút perft phục vụ kiểm chứng luật. */
  perft(depth: number): number {
    if (depth === 0) return 1;
    let nodes = 0;
    for (const m of this.moves()) {
      const { rank: fr, file: ff } = xqCoords(m.from);
      const { rank: tr, file: tf } = xqCoords(m.to);
      const undo = this.makeRaw(idx(fr, ff), idx(tr, tf));
      nodes += this.perft(depth - 1);
      this.unmakeRaw(undo);
    }
    return nodes;
  }
}
