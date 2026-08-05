/**
 * Luật Ô Ăn Quan - bàn 12 ô xếp vòng: 2 ô quan ở hai đầu + mỗi bên 5 ô dân.
 * Bên A (hàng dưới) đi trước, ánh xạ "white" phía server.
 *
 * Chỉ số ô trong vòng (đi theo chiều +1):
 *   0 = ô quan trái; 1-5 = ô dân bên A (trái→phải theo hướng nhìn của A);
 *   6 = ô quan phải; 7-11 = ô dân bên B (7 đối diện ô 5, 11 đối diện ô 1).
 *
 * Khởi đầu: mỗi ô dân 5 dân, mỗi ô quan 1 quan (không dân). Quan = 10 điểm,
 * dân = 1 điểm (theo cách tính phổ biến).
 *
 * Một lượt: chọn ô dân CỦA MÌNH còn dân, chọn chiều (+1/−1), bốc hết dân
 * trong ô rải mỗi ô kế tiếp 1 dân (rải cả vào ô quan). Rải hết tay, xét ô
 * liền sau ô vừa rải quân cuối:
 *   1. Là ô quan → dừng lượt.
 *   2. Là ô dân còn quân → bốc hết ô đó, rải tiếp.
 *   3. Là ô dân trống → nếu ô kế tiếp có quân (dân, hoặc ô quan còn
 *      quan/dân) thì ĂN toàn bộ ô đó; sau ô vừa ăn nếu lại gặp
 *      "ô dân trống + ô có quân" thì ăn tiếp (chuỗi); hết chuỗi thì dừng.
 *      Nếu ô kế tiếp cũng trống → dừng, không ăn.
 *
 * Rải lại: đến lượt mà cả 5 ô dân của mình trống → tự động lấy 5 dân từ kho
 * đặt mỗi ô 1 dân; thiếu thì vay (ghi nợ, trừ điểm khi tính sổ). Nhờ vậy
 * không bao giờ hết nước đi.
 *
 * Kết thúc: cả hai ô quan bị ăn hết ("hết quan tàn dân") → mỗi bên thu dân
 * còn lại trên 5 ô phía mình, điểm = dân + 10×quan − nợ, ai hơn thắng, bằng
 * thì hoà. Lưới an toàn: đạt OQ_MAX_PLY nửa nước → tính sổ ngay (quan còn
 * trên bàn không thuộc về ai).
 *
 * Bất biến (dùng cho fuzz): dân trên bàn + kho dân hai bên = 50 + tổng nợ;
 * quan trên bàn + kho quan hai bên = 2.
 *
 * uci = "<ô><chiều>" với chiều r = +1, l = −1 (vd "3r", "9l").
 * san = "Ô<ô>▸/◂" kèm "×<điểm ăn được>" nếu có ăn (vd "Ô3▸×12").
 */

export type OqColor = "a" | "b"; // a đi trước (ánh xạ "white" phía server)
export type OqDir = "r" | "l"; // r = +1 quanh vòng, l = −1

export const OQ_CELLS = 12;
export const OQ_QUAN_CELLS = [0, 6] as const;
export const OQ_QUAN_VALUE = 10;
export const OQ_MAX_PLY = 400;

export const OQ_OWN_CELLS: Record<OqColor, number[]> = {
  a: [1, 2, 3, 4, 5],
  b: [7, 8, 9, 10, 11],
};

export function oqIsQuanCell(i: number): boolean {
  return i === 0 || i === 6;
}

export function oqOwner(i: number): OqColor | null {
  if (i >= 1 && i <= 5) return "a";
  if (i >= 7 && i <= 11) return "b";
  return null;
}

export interface OqCapture {
  cell: number;
  dan: number;
  quan: boolean;
}

export interface OqMove {
  cell: number;
  dir: OqDir;
  color: OqColor;
  /** Các ô đã rải theo thứ tự (để hoạt ảnh), gồm cả các vòng bốc-rải-tiếp. */
  sowPath: number[];
  captures: OqCapture[];
  /** Tổng điểm ăn được trong nước này (dân + 10×quan). */
  gained: number;
  /** Nước này có kích hoạt rải lại cho bên kia ngay sau đó không. */
  reseeded: boolean;
  san: string;
  uci: string;
}

export interface OqStore {
  dan: number;
  quan: number;
  /** Dân đã vay để rải lại, trừ vào điểm khi tính sổ. */
  debt: number;
}

export interface OqEnd {
  winner: OqColor | null;
  termination: string; // 'quan_out' | 'move_limit'
  scoreA: number;
  scoreB: number;
}

export function oqUci(cell: number, dir: OqDir): string {
  return `${cell}${dir}`;
}

export function parseOqUci(uci: string): { cell: number; dir: OqDir } | null {
  const m = uci.match(/^(\d{1,2})([rl])$/);
  if (!m) return null;
  const cell = Number(m[1]);
  if (cell >= OQ_CELLS || oqIsQuanCell(cell)) return null;
  return { cell, dir: m[2] as OqDir };
}

function next(pos: number, step: 1 | -1): number {
  return (pos + step + OQ_CELLS) % OQ_CELLS;
}

/** Kết quả thuần của phần rải + ăn, chưa đụng đến lượt/kho/kết cục. */
interface SowResult {
  dan: number[];
  quan: [boolean, boolean];
  sowPath: number[];
  captures: OqCapture[];
}

interface Snapshot {
  dan: number[];
  quan: [boolean, boolean];
  stores: Record<OqColor, OqStore>;
  side: OqColor;
  ended: OqEnd | null;
}

export class OAnQuan {
  /** Số dân trong từng ô (ô quan cũng chứa dân được rải vào). */
  private dan: number[];
  /** Quan còn nằm trong ô 0 / ô 6 không. */
  private quan: [boolean, boolean] = [true, true];
  private stores: Record<OqColor, OqStore> = {
    a: { dan: 0, quan: 0, debt: 0 },
    b: { dan: 0, quan: 0, debt: 0 },
  };
  private side: OqColor = "a";
  private ended: OqEnd | null = null;
  private undoStack: Snapshot[] = [];
  historyMoves: OqMove[] = [];

  constructor(uciMoves?: string[]) {
    this.dan = new Array(OQ_CELLS).fill(5);
    this.dan[0] = 0;
    this.dan[6] = 0;
    for (const uci of uciMoves ?? []) {
      if (!this.move(uci)) throw new Error(`Nước ô ăn quan không hợp lệ: ${uci}`);
    }
  }

  turn(): OqColor {
    return this.side;
  }

  get ply(): number {
    return this.historyMoves.length;
  }

  /** Số dân trong ô i. */
  danAt(i: number): number {
    return this.dan[i];
  }

  /** Ô quan i (0 hoặc 6) còn quan không. */
  quanAt(i: number): boolean {
    return i === 0 ? this.quan[0] : i === 6 ? this.quan[1] : false;
  }

  store(color: OqColor): OqStore {
    return { ...this.stores[color] };
  }

  /** Điểm hiện tại trong kho (chưa gồm dân còn trên bàn). */
  score(color: OqColor): number {
    const s = this.stores[color];
    return s.dan + s.quan * OQ_QUAN_VALUE - s.debt;
  }

  fen(): string {
    return [
      this.dan.join(","),
      `${this.quan[0] ? 1 : 0}${this.quan[1] ? 1 : 0}`,
      `${this.stores.a.dan}.${this.stores.a.quan}.${this.stores.a.debt}`,
      `${this.stores.b.dan}.${this.stores.b.quan}.${this.stores.b.debt}`,
      this.side,
      this.ply,
    ].join(" ");
  }

  /**
   * Lõi luật: rải từ ô `cell` theo `step` trên bản sao trạng thái bàn.
   * Mọi đường (moves/move/pushMove) đều đi qua đây - không lặp logic.
   */
  private sow(cell: number, step: 1 | -1): SowResult {
    const dan = this.dan.slice();
    const quan: [boolean, boolean] = [this.quan[0], this.quan[1]];
    const sowPath: number[] = [];
    const captures: OqCapture[] = [];

    let hand = dan[cell];
    dan[cell] = 0;
    let pos = cell;
    for (;;) {
      while (hand > 0) {
        pos = next(pos, step);
        dan[pos] += 1;
        hand -= 1;
        sowPath.push(pos);
      }
      const nxt = next(pos, step);
      if (oqIsQuanCell(nxt)) break; // gặp ô quan → dừng lượt
      if (dan[nxt] > 0) {
        hand = dan[nxt]; // ô dân còn quân → bốc rải tiếp
        dan[nxt] = 0;
        pos = nxt;
        continue;
      }
      // ô dân trống → chuỗi ăn cách ô
      let cur = nxt;
      for (;;) {
        const target = next(cur, step);
        const hasQuan = target === 0 ? quan[0] : target === 6 ? quan[1] : false;
        if (dan[target] === 0 && !hasQuan) break; // không có gì để ăn
        captures.push({ cell: target, dan: dan[target], quan: hasQuan });
        dan[target] = 0;
        if (target === 0) quan[0] = false;
        if (target === 6) quan[1] = false;
        const link = next(target, step);
        if (oqIsQuanCell(link) || dan[link] > 0) break; // link phải là ô dân trống
        cur = link;
      }
      break;
    }
    return { dan, quan, sowPath, captures };
  }

  private toMove(cell: number, dir: OqDir, r: SowResult): OqMove {
    const gained = r.captures.reduce(
      (sum, c) => sum + c.dan + (c.quan ? OQ_QUAN_VALUE : 0),
      0,
    );
    const arrow = dir === "r" ? "▸" : "◂";
    return {
      cell,
      dir,
      color: this.side,
      sowPath: r.sowPath,
      captures: r.captures,
      gained,
      reseeded: false,
      san: `Ô${cell}${arrow}${gained > 0 ? `×${gained}` : ""}`,
      uci: oqUci(cell, dir),
    };
  }

  moves(opts: { cell?: number } = {}): OqMove[] {
    if (this.ended) return [];
    const out: OqMove[] = [];
    for (const cell of OQ_OWN_CELLS[this.side]) {
      if (opts.cell !== undefined && cell !== opts.cell) continue;
      if (this.dan[cell] === 0) continue;
      for (const dir of ["r", "l"] as OqDir[]) {
        out.push(this.toMove(cell, dir, this.sow(cell, dir === "r" ? 1 : -1)));
      }
    }
    return out;
  }

  /** Áp kết quả sow + chuyển lượt/kho/rải lại/kết cục. Trả về mv đã điền cờ reseeded. */
  private commit(cell: number, dir: OqDir): OqMove {
    const step: 1 | -1 = dir === "r" ? 1 : -1;
    const r = this.sow(cell, step);
    const mv = this.toMove(cell, dir, r);
    this.dan = r.dan;
    this.quan = r.quan;
    const s = this.stores[this.side];
    for (const c of r.captures) {
      s.dan += c.dan;
      if (c.quan) s.quan += 1;
    }

    if (!this.quan[0] && !this.quan[1]) {
      this.finish("quan_out");
      return mv;
    }
    if (this.historyMoves.length + 1 >= OQ_MAX_PLY) {
      this.finish("move_limit");
      return mv;
    }
    this.side = this.side === "a" ? "b" : "a";
    // rải lại cho bên sắp đi nếu 5 ô của họ trống
    if (OQ_OWN_CELLS[this.side].every((i) => this.dan[i] === 0)) {
      const ns = this.stores[this.side];
      const fromStore = Math.min(5, ns.dan);
      ns.dan -= fromStore;
      ns.debt += 5 - fromStore;
      for (const i of OQ_OWN_CELLS[this.side]) this.dan[i] = 1;
      mv.reseeded = true;
    }
    return mv;
  }

  move(input: string | { cell: number; dir: OqDir }): OqMove | null {
    if (this.ended) return null;
    const parsed =
      typeof input === "string"
        ? parseOqUci(input)
        : { cell: input.cell, dir: input.dir };
    if (!parsed) return null;
    const { cell, dir } = parsed;
    if (oqOwner(cell) !== this.side || this.dan[cell] === 0) return null;

    this.undoStack.push(this.snapshot());
    const mv = this.commit(cell, dir);
    this.historyMoves.push(mv);
    return mv;
  }

  undo(): OqMove | null {
    const snap = this.undoStack.pop();
    if (!snap) return null;
    this.restore(snap);
    return this.historyMoves.pop() ?? null;
  }

  gameEnd(): OqEnd | null {
    return this.ended;
  }

  /** Tính sổ: thu dân trên 5 ô mỗi bên về kho rồi chốt điểm. */
  private finish(termination: string): void {
    for (const color of ["a", "b"] as OqColor[]) {
      for (const i of OQ_OWN_CELLS[color]) {
        this.stores[color].dan += this.dan[i];
        this.dan[i] = 0;
      }
    }
    const scoreA = this.score("a");
    const scoreB = this.score("b");
    this.ended = {
      winner: scoreA === scoreB ? null : scoreA > scoreB ? "a" : "b",
      termination,
      scoreA,
      scoreB,
    };
  }

  private snapshot(): Snapshot {
    return {
      dan: this.dan.slice(),
      quan: [this.quan[0], this.quan[1]],
      stores: { a: { ...this.stores.a }, b: { ...this.stores.b } },
      side: this.side,
      ended: this.ended,
    };
  }

  private restore(snap: Snapshot): void {
    this.dan = snap.dan.slice();
    this.quan = [snap.quan[0], snap.quan[1]];
    this.stores = { a: { ...snap.stores.a }, b: { ...snap.stores.b } };
    this.side = snap.side;
    this.ended = snap.ended;
  }

  private searchStack: Snapshot[] = [];

  /** Đường nhanh cho engine: áp nước ĐÃ xác minh, không ghi lịch sử. */
  pushMove(m: OqMove): void {
    this.searchStack.push(this.snapshot());
    this.commit(m.cell, m.dir);
  }

  popMove(): void {
    const snap = this.searchStack.pop();
    if (!snap) return;
    this.restore(snap);
  }

  /** Mảng dân 12 ô chỉ đọc cho hàm lượng giá. */
  boardArray(): readonly number[] {
    return this.dan;
  }
}
