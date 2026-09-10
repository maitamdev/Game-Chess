/**
 * Engine Caro Siêu Cấp (Grandmaster God-Tier Unbeatable Gomoku Engine)
 *
 * Tính năng vượt trội:
 * 1. Precomputed Pattern Table (19.683 trạng thái O(1)) tra cứu tức thì mọi hình cờ & toạ độ phòng thủ.
 * 2. Nhận diện toàn diện: Ngũ, Tứ mở, Tứ đóng, Tứ nhảy (split), Tam mở, Tam nhảy, Tam đóng, Nhị mở.
 * 3. Đòn phối hợp sát thủ: Tứ-Tứ (4-4), Tứ-Tam (4-3), Song Tam (3-3), Tam-Nhị (3-2).
 * 4. Bộ giải VCF hai chiều (Bi-directional VCF):
 *    - Tấn công: Tìm chuỗi ép Tứ thắng tuyệt đối 16-24 nước.
 *    - Phòng ngự: Phát hiện chuỗi VCF của đối thủ và lập tức phá hủy điểm mấu chốt!
 * 5. Bộ giải VCT (Victory of Continuous Threes / Threat Space Search):
 *    - Tìm chuỗi ép Tam & Tứ dẫn tới Song Tam hoặc Tứ Tam không thể hóa giải.
 * 6. Đánh giá toàn cục tại lá (Global Focal & Multi-Threat Evaluation) thay vì chỉ đo cục bộ 1 ô.
 * 7. Cắt tỉa theo không gian đe doạ (Threat-Space Pruning) co cụm branching factor về 1-3 khi bị uy hiếp.
 * 8. Killer Moves Heuristic + History Table tăng tốc cắt tỉa Alpha-Beta gấp nhiều lần.
 * 9. Khai cuộc Gomoku chuẩn mực chủ động chiếm lĩnh tiên thủ.
 */

import { CARO_SIZE, caroUci, parseCaroUci } from "./rules";

export const CARO_MATE = 1_000_000;

export const DIRS: [number, number][] = [
  [1, 0],   // Ngang
  [0, 1],   // Dọc
  [1, 1],   // Chéo chính \
  [1, -1],  // Chéo phụ /
];

// Các cờ mẫu
export const PAT_NONE = 0;
export const PAT_FIVE = 1 << 0;
export const PAT_LIVE_FOUR = 1 << 1;
export const PAT_RUSH_FOUR = 1 << 2;
export const PAT_LIVE_THREE = 1 << 3;
export const PAT_SLEEP_THREE = 1 << 4;
export const PAT_LIVE_TWO = 1 << 5;
export const PAT_SLEEP_TWO = 1 << 6;

// Thang điểm chiến thuật chuẩn quốc tế
export const SCORE_FIVE = 10_000_000;
export const SCORE_LIVE_FOUR = 1_000_000;
export const SCORE_FOUR_FOUR = 950_000;
export const SCORE_FOUR_THREE = 900_000;
export const SCORE_DOUBLE_THREE = 800_000;
export const SCORE_RUSH_FOUR = 50_000;
export const SCORE_LIVE_THREE = 15_000;
export const SCORE_THREE_SLEEP = 5_000;
export const SCORE_DOUBLE_SLEEP = 2_000;
export const SCORE_SLEEP_THREE = 800;
export const SCORE_DOUBLE_TWO = 300;
export const SCORE_LIVE_TWO = 100;
export const SCORE_SLEEP_TWO = 15;

// Bảng tra mẫu 19.683 trạng thái (3^9)
const TABLE_FLAGS = new Uint16Array(19683);
const TABLE_RUSH_COUNT = new Uint8Array(19683);
const TABLE_DEF1 = new Int8Array(19683).fill(99);
const TABLE_DEF2 = new Int8Array(19683).fill(99);
const TABLE_KEY1 = new Int8Array(19683).fill(99);
const TABLE_KEY2 = new Int8Array(19683).fill(99);

function evalWindowDetail(arr: number[]): {
  five: number;
  liveFour: number;
  rushFour: number;
  liveThree: number;
  sleepThree: number;
  liveTwo: number;
  defOffsets: number[];
  keyOffsets: number[];
} {
  let five = 0;
  let liveFour = 0;
  let rushFour = 0;
  let liveThree = 0;
  let sleepThree = 0;
  let liveTwo = 0;
  const defOffsets: number[] = [];
  const keyOffsets: number[] = [];

  // 1. Kiểm tra Ngũ (5 liên tiếp)
  for (let k = 0; k <= 4; k++) {
    let ones = 0;
    for (let i = 0; i < 5; i++) {
      if (arr[k + i] === 1) ones++;
      else break;
    }
    if (ones === 5) five++;
  }
  if (five > 0) {
    return { five, liveFour, rushFour, liveThree, sleepThree, liveTwo, defOffsets, keyOffsets };
  }

  // 2. Kiểm tra Tứ (Tứ mở & Tứ đóng / Tứ nhảy)
  const fourZeros = new Set<number>();
  for (let k = 0; k <= 4; k++) {
    let ones = 0;
    let zeroIdx = -1;
    for (let i = 0; i < 5; i++) {
      const v = arr[k + i];
      if (v === 1) ones++;
      else if (v === 0) {
        if (zeroIdx === -1) zeroIdx = k + i;
        else { ones = -1; break; }
      } else {
        ones = -1;
        break;
      }
    }
    if (ones === 4 && zeroIdx !== -1 && !fourZeros.has(zeroIdx)) {
      fourZeros.add(zeroIdx);
      defOffsets.push(zeroIdx - 4);

      const isEndZero = (zeroIdx === k || zeroIdx === k + 4);
      if (isEndZero) {
        const start = zeroIdx === k ? k + 1 : k;
        if (start > 0 && arr[start - 1] === 0 && start + 4 <= 8 && arr[start + 4] === 0) {
          liveFour++;
        } else {
          rushFour++;
        }
      } else {
        rushFour++;
      }
    }
  }

  if (liveFour > 0 || rushFour > 0) {
    return { five, liveFour, rushFour, liveThree, sleepThree, liveTwo, defOffsets, keyOffsets };
  }

  // 3. Kiểm tra Tam mở (Live Three)
  const s = arr.join("");
  if (s.includes("001110")) {
    liveThree++;
    const idx = s.indexOf("001110");
    keyOffsets.push(idx + 1 - 4, idx + 5 - 4);
  } else if (s.includes("011100")) {
    liveThree++;
    const idx = s.indexOf("011100");
    keyOffsets.push(idx + 1 - 4, idx + 4 - 4);
  } else if (s.includes("011010")) {
    liveThree++;
    const idx = s.indexOf("011010");
    keyOffsets.push(idx + 3 - 4);
  } else if (s.includes("010110")) {
    liveThree++;
    const idx = s.indexOf("010110");
    keyOffsets.push(idx + 2 - 4);
  }

  if (liveThree > 0) {
    return { five, liveFour, rushFour, liveThree, sleepThree, liveTwo, defOffsets, keyOffsets };
  }

  // 4. Kiểm tra Tam đóng (Sleep Three)
  for (let k = 0; k <= 4; k++) {
    let ones = 0;
    let valid = true;
    for (let i = 0; i < 5; i++) {
      const v = arr[k + i];
      if (v === 1) ones++;
      else if (v === 2) { valid = false; break; }
    }
    if (valid && ones === 3) {
      sleepThree++;
      break;
    }
  }
  if (sleepThree > 0) {
    return { five, liveFour, rushFour, liveThree, sleepThree, liveTwo, defOffsets, keyOffsets };
  }

  // 5. Kiểm tra Nhị mở (Live Two)
  if (s.includes("001100") || s.includes("01010") || s.includes("010010")) {
    liveTwo++;
    return { five, liveFour, rushFour, liveThree, sleepThree, liveTwo, defOffsets, keyOffsets };
  }

  return { five, liveFour, rushFour, liveThree, sleepThree, liveTwo, defOffsets, keyOffsets };
}

// Khởi tạo bảng tra một lần duy nhất
(function initPatternTable() {
  for (let code = 0; code < 19683; code++) {
    const arr = new Array(9);
    let temp = code;
    for (let i = 0; i < 9; i++) {
      arr[i] = temp % 3;
      temp = Math.floor(temp / 3);
    }
    if (arr[4] !== 1) continue;

    const ev = evalWindowDetail(arr);
    let flags = 0;
    if (ev.five > 0) flags |= PAT_FIVE;
    if (ev.liveFour > 0) flags |= PAT_LIVE_FOUR;
    if (ev.rushFour > 0) flags |= PAT_RUSH_FOUR;
    if (ev.liveThree > 0) flags |= PAT_LIVE_THREE;
    if (ev.sleepThree > 0) flags |= PAT_SLEEP_THREE;
    if (ev.liveTwo > 0) flags |= PAT_LIVE_TWO;

    TABLE_FLAGS[code] = flags;
    TABLE_RUSH_COUNT[code] = Math.min(255, ev.rushFour);
    if (ev.defOffsets.length > 0) TABLE_DEF1[code] = ev.defOffsets[0];
    if (ev.defOffsets.length > 1) TABLE_DEF2[code] = ev.defOffsets[1];
    if (ev.keyOffsets.length > 0) TABLE_KEY1[code] = ev.keyOffsets[0];
    if (ev.keyOffsets.length > 1) TABLE_KEY2[code] = ev.keyOffsets[1];
  }
})();

export function scoreFromCounts(
  five: number,
  liveFour: number,
  rushFour: number,
  liveThree: number,
  sleepThree: number,
  liveTwo: number
): number {
  if (five > 0) return SCORE_FIVE;
  if (liveFour > 0) return SCORE_LIVE_FOUR;
  if (rushFour >= 2) return SCORE_FOUR_FOUR;
  if (rushFour >= 1 && liveThree >= 1) return SCORE_FOUR_THREE;
  if (liveThree >= 2) return SCORE_DOUBLE_THREE;
  if (rushFour >= 1) return SCORE_RUSH_FOUR + liveThree * 2000 + liveTwo * 100;
  if (liveThree >= 1 && liveTwo >= 1) return SCORE_LIVE_THREE + 5000 + liveTwo * 200;
  if (liveThree >= 1 && sleepThree >= 1) return SCORE_THREE_SLEEP + liveTwo * 100;
  if (liveThree >= 1) return SCORE_LIVE_THREE + liveTwo * 100;
  if (sleepThree >= 2) return SCORE_DOUBLE_SLEEP + liveTwo * 50;
  if (sleepThree >= 1) return SCORE_SLEEP_THREE + liveTwo * 50;
  if (liveTwo >= 2) return SCORE_DOUBLE_TWO;
  if (liveTwo >= 1) return SCORE_LIVE_TWO;
  return 5;
}

// Zobrist Hashing
const ZOBRIST_LOW = new Uint32Array(3 * CARO_SIZE * CARO_SIZE);
const ZOBRIST_HIGH = new Uint32Array(3 * CARO_SIZE * CARO_SIZE);

let prngSeed = 8821941;
function rand32(): number {
  prngSeed = (prngSeed ^ (prngSeed << 13)) >>> 0;
  prngSeed = (prngSeed ^ (prngSeed >> 17)) >>> 0;
  prngSeed = (prngSeed ^ (prngSeed << 5)) >>> 0;
  return prngSeed >>> 0;
}
for (let i = 0; i < 3 * CARO_SIZE * CARO_SIZE; i++) {
  ZOBRIST_LOW[i] = rand32();
  ZOBRIST_HIGH[i] = rand32();
}

// Transposition Table (1M entries)
const TT_SIZE = 1 << 20;
const TT_MASK = TT_SIZE - 1;
const ttKeyLow = new Uint32Array(TT_SIZE);
const ttKeyHigh = new Uint32Array(TT_SIZE);
const ttDepth = new Int8Array(TT_SIZE);
const ttScore = new Int32Array(TT_SIZE);
const ttFlag = new Uint8Array(TT_SIZE); // 1: EXACT, 2: LOWER, 3: UPPER
const ttBestIdx = new Int32Array(TT_SIZE);

export interface CaroRanked {
  uci: string;
  score: number;
}

export interface CaroSearchResult {
  ranked: CaroRanked[];
  depth: number;
  nodes: number;
}

export interface CaroSearchParams {
  maxDepth?: number;
  timeLimitMs?: number;
  useVcf?: boolean;
  useVct?: boolean;
  onIteration?: (depth: number, scoreForMover: number, bestUci: string) => void;
}

class TimeUp extends Error {}

export interface FastEvalResult {
  score: number;
  five: number;
  liveFour: number;
  rushFour: number;
  liveThree: number;
  sleepThree: number;
  liveTwo: number;
  rushDefs: { x: number; y: number }[];
  threeDefs: { x: number; y: number }[];
}

export interface Candidate {
  idx: number;
  score: number;
  isOwnFive: boolean;
  isOppFive: boolean;
  isOwnFour: boolean;
  isOppLiveFour: boolean;
  isOwnFork: boolean;
  isOppFork: boolean;
}

export class GodCaroEngine {
  grid = new Uint8Array(CARO_SIZE * CARO_SIZE);
  neighbor = new Int16Array(CARO_SIZE * CARO_SIZE);
  stones: number[] = [];
  side = 1; // 1 = X, 2 = O

  minX = CARO_SIZE;
  maxX = -1;
  minY = CARO_SIZE;
  maxY = -1;
  boxStack: [number, number, number, number][] = [];

  zobLow = 0;
  zobHigh = 0;

  nodes = 0;
  deadline = Infinity;

  // Killer Moves & History Table
  killerMoves = new Int32Array(64 * 2).fill(-1);
  historyTable = new Uint32Array(CARO_SIZE * CARO_SIZE);

  constructor(history: string[]) {
    ttKeyLow.fill(0);
    ttKeyHigh.fill(0);
    ttDepth.fill(-1);

    for (const uci of history) {
      const pt = parseCaroUci(uci);
      if (!pt) continue;
      const idx = pt.y * CARO_SIZE + pt.x;
      this.push(idx);
    }
  }

  push(idx: number) {
    const x = idx % CARO_SIZE;
    const y = Math.floor(idx / CARO_SIZE);
    const color = this.side;

    this.boxStack.push([this.minX, this.maxX, this.minY, this.maxY]);
    this.grid[idx] = color;
    this.stones.push(idx);

    if (x < this.minX) this.minX = x;
    if (x > this.maxX) this.maxX = x;
    if (y < this.minY) this.minY = y;
    if (y > this.maxY) this.maxY = y;

    const zIdx = color * (CARO_SIZE * CARO_SIZE) + idx;
    this.zobLow = (this.zobLow ^ ZOBRIST_LOW[zIdx]) >>> 0;
    this.zobHigh = (this.zobHigh ^ ZOBRIST_HIGH[zIdx]) >>> 0;

    for (let dy = -2; dy <= 2; dy++) {
      const cy = y + dy;
      if (cy < 0 || cy >= CARO_SIZE) continue;
      const row = cy * CARO_SIZE;
      for (let dx = -2; dx <= 2; dx++) {
        const cx = x + dx;
        if (cx < 0 || cx >= CARO_SIZE) continue;
        this.neighbor[row + cx]++;
      }
    }
    this.side = color === 1 ? 2 : 1;
  }

  pop() {
    const idx = this.stones.pop()!;
    const x = idx % CARO_SIZE;
    const y = Math.floor(idx / CARO_SIZE);
    const color = this.side === 1 ? 2 : 1;

    this.grid[idx] = 0;
    const [minX, maxX, minY, maxY] = this.boxStack.pop()!;
    this.minX = minX;
    this.maxX = maxX;
    this.minY = minY;
    this.maxY = maxY;

    const zIdx = color * (CARO_SIZE * CARO_SIZE) + idx;
    this.zobLow = (this.zobLow ^ ZOBRIST_LOW[zIdx]) >>> 0;
    this.zobHigh = (this.zobHigh ^ ZOBRIST_HIGH[zIdx]) >>> 0;

    for (let dy = -2; dy <= 2; dy++) {
      const cy = y + dy;
      if (cy < 0 || cy >= CARO_SIZE) continue;
      const row = cy * CARO_SIZE;
      for (let dx = -2; dx <= 2; dx++) {
        const cx = x + dx;
        if (cx < 0 || cx >= CARO_SIZE) continue;
        this.neighbor[row + cx]--;
      }
    }
    this.side = color;
  }

  evalMoveFast(x: number, y: number, color: number): FastEvalResult {
    let five = 0;
    let liveFour = 0;
    let rushFour = 0;
    let liveThree = 0;
    let sleepThree = 0;
    let liveTwo = 0;
    const rushDefs: { x: number; y: number }[] = [];
    const threeDefs: { x: number; y: number }[] = [];

    for (const [dx, dy] of DIRS) {
      let code = 81;
      let p = 1;
      for (let step = -4; step <= -1; step++) {
        const cx = x + step * dx;
        const cy = y + step * dy;
        let v = 2;
        if (cx >= 0 && cx < CARO_SIZE && cy >= 0 && cy < CARO_SIZE) {
          const g = this.grid[cy * CARO_SIZE + cx];
          v = g === 0 ? 0 : g === color ? 1 : 2;
        }
        code += v * p;
        p *= 3;
      }
      p = 243;
      for (let step = 1; step <= 4; step++) {
        const cx = x + step * dx;
        const cy = y + step * dy;
        let v = 2;
        if (cx >= 0 && cx < CARO_SIZE && cy >= 0 && cy < CARO_SIZE) {
          const g = this.grid[cy * CARO_SIZE + cx];
          v = g === 0 ? 0 : g === color ? 1 : 2;
        }
        code += v * p;
        p *= 3;
      }

      const flags = TABLE_FLAGS[code];
      if ((flags & PAT_FIVE) !== 0) five++;
      if ((flags & PAT_LIVE_FOUR) !== 0) {
        liveFour++;
        const d1 = TABLE_DEF1[code];
        if (d1 !== 99) {
          const defX = x + d1 * dx;
          const defY = y + d1 * dy;
          if (defX >= 0 && defX < CARO_SIZE && defY >= 0 && defY < CARO_SIZE && this.grid[defY * CARO_SIZE + defX] === 0) {
            rushDefs.push({ x: defX, y: defY });
          }
        }
        const d2 = TABLE_DEF2[code];
        if (d2 !== 99) {
          const defX = x + d2 * dx;
          const defY = y + d2 * dy;
          if (defX >= 0 && defX < CARO_SIZE && defY >= 0 && defY < CARO_SIZE && this.grid[defY * CARO_SIZE + defX] === 0) {
            rushDefs.push({ x: defX, y: defY });
          }
        }
      }
      if ((flags & PAT_RUSH_FOUR) !== 0) {
        rushFour += TABLE_RUSH_COUNT[code];
        const d1 = TABLE_DEF1[code];
        if (d1 !== 99) {
          const defX = x + d1 * dx;
          const defY = y + d1 * dy;
          if (defX >= 0 && defX < CARO_SIZE && defY >= 0 && defY < CARO_SIZE && this.grid[defY * CARO_SIZE + defX] === 0) {
            rushDefs.push({ x: defX, y: defY });
          }
        }
        const d2 = TABLE_DEF2[code];
        if (d2 !== 99) {
          const defX = x + d2 * dx;
          const defY = y + d2 * dy;
          if (defX >= 0 && defX < CARO_SIZE && defY >= 0 && defY < CARO_SIZE && this.grid[defY * CARO_SIZE + defX] === 0) {
            rushDefs.push({ x: defX, y: defY });
          }
        }
      }
      if ((flags & PAT_LIVE_THREE) !== 0) {
        liveThree++;
        const k1 = TABLE_KEY1[code];
        if (k1 !== 99) {
          const defX = x + k1 * dx;
          const defY = y + k1 * dy;
          if (defX >= 0 && defX < CARO_SIZE && defY >= 0 && defY < CARO_SIZE && this.grid[defY * CARO_SIZE + defX] === 0) {
            threeDefs.push({ x: defX, y: defY });
          }
        }
        const k2 = TABLE_KEY2[code];
        if (k2 !== 99) {
          const defX = x + k2 * dx;
          const defY = y + k2 * dy;
          if (defX >= 0 && defX < CARO_SIZE && defY >= 0 && defY < CARO_SIZE && this.grid[defY * CARO_SIZE + defX] === 0) {
            threeDefs.push({ x: defX, y: defY });
          }
        }
      }
      if ((flags & PAT_SLEEP_THREE) !== 0) sleepThree++;
      if ((flags & PAT_LIVE_TWO) !== 0) liveTwo++;
    }

    const score = scoreFromCounts(five, liveFour, rushFour, liveThree, sleepThree, liveTwo);
    return { score, five, liveFour, rushFour, liveThree, sleepThree, liveTwo, rushDefs, threeDefs };
  }

  /**
   * Đánh giá thế cờ toàn cục tại lá (Global Board Evaluation)
   * Thay vì chỉ đo 1 ô max, hàm tính tổng thế trận, ưu thế đe dọa đa hướng và độ ép sân.
   */
  evalBoard(me: number, opp: number): number {
    const minX = Math.max(0, this.minX - 2);
    const maxX = Math.min(CARO_SIZE - 1, this.maxX + 2);
    const minY = Math.max(0, this.minY - 2);
    const maxY = Math.min(CARO_SIZE - 1, this.maxY + 2);

    let maxOwn = 0;
    let maxOpp = 0;
    let sumOwn = 0;
    let sumOpp = 0;

    for (let y = minY; y <= maxY; y++) {
      const row = y * CARO_SIZE;
      for (let x = minX; x <= maxX; x++) {
        const idx = row + x;
        if (this.grid[idx] !== 0 || this.neighbor[idx] === 0) continue;

        const own = this.evalMoveFast(x, y, me);
        if (own.five > 0) return CARO_MATE;
        if (own.liveFour > 0) maxOwn = Math.max(maxOwn, SCORE_LIVE_FOUR * 2);
        else if (own.score >= SCORE_DOUBLE_THREE) maxOwn = Math.max(maxOwn, own.score * 1.5);
        else if (own.score > maxOwn) maxOwn = own.score;
        sumOwn += own.score;

        const theirs = this.evalMoveFast(x, y, opp);
        if (theirs.five > 0) return -CARO_MATE;
        if (theirs.liveFour > 0) maxOpp = Math.max(maxOpp, SCORE_LIVE_FOUR * 2);
        else if (theirs.score >= SCORE_DOUBLE_THREE) maxOpp = Math.max(maxOpp, theirs.score * 1.5);
        else if (theirs.score > maxOpp) maxOpp = theirs.score;
        sumOpp += theirs.score;
      }
    }

    return (maxOwn + sumOwn * 0.1) - (maxOpp * 1.15 + sumOpp * 0.1);
  }

  getCandidates(me: number, k: number, ttMove = -1, ply = 0): Candidate[] {
    const opp = me === 1 ? 2 : 1;
    const minX = Math.max(0, this.minX - 2);
    const maxX = Math.min(CARO_SIZE - 1, this.maxX + 2);
    const minY = Math.max(0, this.minY - 2);
    const maxY = Math.min(CARO_SIZE - 1, this.maxY + 2);

    const list: Candidate[] = [];
    let oppFiveCount = 0;
    let oppHasLiveFour = false;
    let oppHasFork = false;

    const killer1 = this.killerMoves[ply * 2];
    const killer2 = this.killerMoves[ply * 2 + 1];

    for (let y = minY; y <= maxY; y++) {
      const row = y * CARO_SIZE;
      for (let x = minX; x <= maxX; x++) {
        const idx = row + x;
        if (this.grid[idx] !== 0 || this.neighbor[idx] === 0) continue;

        const own = this.evalMoveFast(x, y, me);
        if (own.five > 0) {
          // Thắng ngay lập tức! Branching factor = 1
          return [{
            idx,
            score: SCORE_FIVE * 2,
            isOwnFive: true,
            isOppFive: false,
            isOwnFour: true,
            isOppLiveFour: false,
            isOwnFork: true,
            isOppFork: false,
          }];
        }

        const theirs = this.evalMoveFast(x, y, opp);
        if (theirs.five > 0) oppFiveCount++;
        if (theirs.liveFour > 0) oppHasLiveFour = true;
        if (theirs.score >= SCORE_DOUBLE_THREE) oppHasFork = true;

        let combined = 0;
        if (theirs.five > 0) {
          combined = SCORE_FIVE * 1.5;
        } else if (own.liveFour > 0 || own.score >= SCORE_FOUR_FOUR) {
          combined = SCORE_LIVE_FOUR * 2;
        } else if (theirs.liveFour > 0 || theirs.score >= SCORE_FOUR_FOUR) {
          combined = SCORE_LIVE_FOUR + 500_000;
        } else if (own.score >= SCORE_FOUR_THREE) {
          combined = SCORE_FOUR_THREE * 2;
        } else if (theirs.score >= SCORE_FOUR_THREE) {
          combined = SCORE_FOUR_THREE + 400_000;
        } else if (own.score >= SCORE_DOUBLE_THREE) {
          combined = SCORE_DOUBLE_THREE * 2;
        } else if (theirs.score >= SCORE_DOUBLE_THREE) {
          combined = SCORE_DOUBLE_THREE + 350_000;
        } else if (own.rushFour > 0) {
          combined = SCORE_RUSH_FOUR * 2 + theirs.score * 0.8;
        } else if (theirs.rushFour > 0) {
          combined = SCORE_RUSH_FOUR * 1.5 + own.score;
        } else if (own.liveThree > 0) {
          combined = SCORE_LIVE_THREE * 2 + theirs.score;
        } else if (theirs.liveThree > 0) {
          combined = SCORE_LIVE_THREE * 1.8 + own.score;
        } else {
          combined = own.score + theirs.score * 1.05;
        }

        // Ưu tiên Hash move, Killer move và History heuristic
        if (idx === ttMove) combined += 5_000_000;
        else if (idx === killer1) combined += 500_000;
        else if (idx === killer2) combined += 300_000;
        else {
          combined += Math.min(50_000, this.historyTable[idx]);
        }

        list.push({
          idx,
          score: combined,
          isOwnFive: false,
          isOppFive: theirs.five > 0,
          isOwnFour: own.liveFour > 0 || own.rushFour > 0,
          isOppLiveFour: theirs.liveFour > 0,
          isOwnFork: own.score >= SCORE_DOUBLE_THREE,
          isOppFork: theirs.score >= SCORE_DOUBLE_THREE,
        });
      }
    }

    // Dynamic Threat-Space Pruning:
    // Khi đối thủ có nước thắng ngũ (oppFiveCount > 0):
    // Phải chặn điểm ngũ đó!
    if (oppFiveCount > 0) {
      const filtered = list.filter((c) => c.isOppFive);
      filtered.sort((a, b) => b.score - a.score);
      return filtered.slice(0, Math.min(filtered.length, 4));
    }

    // Khi đối thủ có Tứ mở (đe dọa 2 đầu thắng ngay):
    // Phải chặn hoặc phản công bằng Tứ của mình!
    if (oppHasLiveFour) {
      const filtered = list.filter((c) => c.isOppLiveFour || c.isOwnFour);
      filtered.sort((a, b) => b.score - a.score);
      return filtered.slice(0, Math.min(filtered.length, 5));
    }

    // Khi đối thủ có đòn sát cuộc 3-3, 4-3, 4-4:
    // Phải chặn giao điểm nguy hiểm hoặc tấn công chủ động!
    if (oppHasFork) {
      const filtered = list.filter((c) => c.isOppFork || c.isOwnFour || c.isOwnFork);
      if (filtered.length > 0) {
        filtered.sort((a, b) => b.score - a.score);
        return filtered.slice(0, Math.max(k, filtered.length));
      }
    }

    list.sort((a, b) => b.score - a.score);
    return list.slice(0, k);
  }

  checkTime() {
    if ((this.nodes & 255) === 0 && Date.now() > this.deadline) {
      throw new TimeUp();
    }
  }

  /**
   * Bộ giải chuyên biệt VCF (Victory of Continuous Fours)
   * Tìm chuỗi nước ép Tứ dẫn tới thắng lợi tuyệt đối.
   */
  solveVcf(color: number, depth: number): number | null {
    this.nodes++;
    if (depth <= 0) return null;
    this.checkTime();
    const opp = color === 1 ? 2 : 1;

    const minX = Math.max(0, this.minX - 2);
    const maxX = Math.min(CARO_SIZE - 1, this.maxX + 2);
    const minY = Math.max(0, this.minY - 2);
    const maxY = Math.min(CARO_SIZE - 1, this.maxY + 2);

    const candidates: { idx: number; rushDefs: { x: number; y: number }[] }[] = [];

    for (let y = minY; y <= maxY; y++) {
      const row = y * CARO_SIZE;
      for (let x = minX; x <= maxX; x++) {
        const idx = row + x;
        if (this.grid[idx] !== 0 || this.neighbor[idx] === 0) continue;

        const ev = this.evalMoveFast(x, y, color);
        if (ev.five > 0 || ev.liveFour > 0) {
          return idx; // Thắng ngay hoặc tạo Tứ mở không thể đỡ!
        }
        if (ev.rushFour > 0 && ev.rushDefs.length > 0) {
          candidates.push({ idx, rushDefs: ev.rushDefs });
        }
      }
    }

    for (const cand of candidates) {
      this.push(cand.idx);

      let allDefFailed = true;
      for (const def of cand.rushDefs) {
        const defIdx = def.y * CARO_SIZE + def.x;
        if (this.grid[defIdx] !== 0) continue;

        const defEv = this.evalMoveFast(def.x, def.y, opp);
        if (defEv.five > 0) {
          allDefFailed = false;
          break;
        }

        this.push(defIdx);
        const sub = this.solveVcf(color, depth - 1);
        this.pop();

        if (!sub) {
          allDefFailed = false;
          break;
        }
      }

      this.pop();

      if (allDefFailed && cand.rushDefs.length > 0) {
        return cand.idx;
      }
    }

    return null;
  }

  /**
   * Bộ giải VCT (Victory of Continuous Threes / Threat Space Search)
   * Tìm chuỗi ép Tam và Tứ dẫn tới thế Song Tam (3-3) hoặc Tứ Tam (4-3) bắt buộc thắng.
   */
  solveVct(color: number, depth: number): number | null {
    this.nodes++;
    if (depth <= 0) return null;
    this.checkTime();
    const opp = color === 1 ? 2 : 1;

    // Trước tiên thử VCF (vì VCF nhanh và mạnh hơn VCT)
    const vcfWin = this.solveVcf(color, 12);
    if (vcfWin !== null) return vcfWin;

    const minX = Math.max(0, this.minX - 2);
    const maxX = Math.min(CARO_SIZE - 1, this.maxX + 2);
    const minY = Math.max(0, this.minY - 2);
    const maxY = Math.min(CARO_SIZE - 1, this.maxY + 2);

    const atkCandidates: { idx: number; defs: { x: number; y: number }[]; score: number }[] = [];

    for (let y = minY; y <= maxY; y++) {
      const row = y * CARO_SIZE;
      for (let x = minX; x <= maxX; x++) {
        const idx = row + x;
        if (this.grid[idx] !== 0 || this.neighbor[idx] === 0) continue;

        const ev = this.evalMoveFast(x, y, color);
        if (ev.five > 0 || ev.liveFour > 0 || ev.score >= SCORE_DOUBLE_THREE) {
          return idx; // Đòn sát cuộc không thể cản!
        }
        if (ev.rushFour > 0 && ev.rushDefs.length > 0) {
          atkCandidates.push({ idx, defs: ev.rushDefs, score: ev.score });
        } else if (ev.liveThree > 0 && ev.threeDefs.length > 0) {
          atkCandidates.push({ idx, defs: ev.threeDefs, score: ev.score });
        }
      }
    }

    atkCandidates.sort((a, b) => b.score - a.score);

    for (const cand of atkCandidates.slice(0, 8)) {
      this.push(cand.idx);
      let allDefFailed = true;

      for (const def of cand.defs) {
        const defIdx = def.y * CARO_SIZE + def.x;
        if (this.grid[defIdx] !== 0) continue;

        const defEv = this.evalMoveFast(def.x, def.y, opp);
        if (defEv.five > 0 || defEv.liveFour > 0) {
          allDefFailed = false;
          break;
        }

        this.push(defIdx);
        const sub = this.solveVct(color, depth - 1);
        this.pop();

        if (!sub) {
          allDefFailed = false;
          break;
        }
      }

      this.pop();

      if (allDefFailed && cand.defs.length > 0) {
        return cand.idx;
      }
    }

    return null;
  }

  negamax(depth: number, ply: number, alpha: number, beta: number, k: number): number {
    this.nodes++;
    this.checkTime();

    const origAlpha = alpha;
    const ttIndex = this.zobLow & TT_MASK;
    const isTTHit = ttKeyLow[ttIndex] === this.zobLow && ttKeyHigh[ttIndex] === this.zobHigh;
    let ttMove = -1;

    if (isTTHit) {
      ttMove = ttBestIdx[ttIndex];
      if (ttDepth[ttIndex] >= depth) {
        const flag = ttFlag[ttIndex];
        const val = ttScore[ttIndex];
        if (flag === 1) return val;
        if (flag === 2 && val > alpha) alpha = val;
        else if (flag === 3 && val < beta) beta = val;
        if (alpha >= beta) return val;
      }
    }

    const me = this.side;
    const cands = this.getCandidates(me, k, ttMove, ply);
    if (cands.length === 0) return 0;
    if (cands[0].isOwnFive) return CARO_MATE - ply;

    if (depth <= 0) {
      const opp = me === 1 ? 2 : 1;
      return this.evalBoard(me, opp);
    }

    let bestScore = -Infinity;
    let bestMove = cands[0].idx;

    for (const c of cands) {
      this.push(c.idx);
      let score: number;
      try {
        score = -this.negamax(depth - 1, ply + 1, -beta, -alpha, k);
      } catch (err) {
        this.pop();
        throw err;
      }
      this.pop();

      if (score > bestScore) {
        bestScore = score;
        bestMove = c.idx;
      }
      if (score > alpha) {
        alpha = score;
      }
      if (alpha >= beta) {
        // Cắt tỉa Alpha-Beta! Cập nhật Killer Moves & History Table
        if (this.killerMoves[ply * 2] !== c.idx) {
          this.killerMoves[ply * 2 + 1] = this.killerMoves[ply * 2];
          this.killerMoves[ply * 2] = c.idx;
        }
        this.historyTable[c.idx] += depth * depth;
        break;
      }
    }

    ttKeyLow[ttIndex] = this.zobLow;
    ttKeyHigh[ttIndex] = this.zobHigh;
    ttDepth[ttIndex] = depth;
    ttScore[ttIndex] = bestScore;
    ttBestIdx[ttIndex] = bestMove;
    if (bestScore <= origAlpha) {
      ttFlag[ttIndex] = 3; // UPPER
    } else if (bestScore >= beta) {
      ttFlag[ttIndex] = 2; // LOWER
    } else {
      ttFlag[ttIndex] = 1; // EXACT
    }

    return bestScore;
  }
}

export function searchCaro(
  history: string[],
  params: CaroSearchParams & { k?: number },
): CaroSearchResult {
  const toUci = (idx: number) => caroUci(idx % CARO_SIZE, Math.floor(idx / CARO_SIZE));

  // 1. Sách khai cuộc chuẩn mực (Opening Book)
  // Nước đầu tiên: đi chính giữa trung tâm (100, 100)
  if (history.length === 0) {
    const centerIdx = 100 * CARO_SIZE + 100;
    return {
      ranked: [{ uci: toUci(centerIdx), score: 0 }],
      depth: 1,
      nodes: 1,
    };
  }

  // Nước thứ 2 (đối thủ đi trước 1 nước): Phản công trực diện tiếp giáp quân đối thủ
  if (history.length === 1) {
    const firstPt = parseCaroUci(history[0])!;
    const defenses = [
      { x: firstPt.x + 1, y: firstPt.y },
      { x: firstPt.x + 1, y: firstPt.y + 1 },
      { x: firstPt.x, y: firstPt.y + 1 },
      { x: firstPt.x - 1, y: firstPt.y },
    ];
    for (const d of defenses) {
      if (d.x >= 0 && d.x < CARO_SIZE && d.y >= 0 && d.y < CARO_SIZE) {
        const defIdx = d.y * CARO_SIZE + d.x;
        return {
          ranked: [{ uci: toUci(defIdx), score: 0 }],
          depth: 1,
          nodes: 1,
        };
      }
    }
  }

  const engine = new GodCaroEngine(history);
  engine.deadline = params.timeLimitMs ? Date.now() + params.timeLimitMs : Infinity;
  const k = params.k ?? 10;
  const maxDepth = params.maxDepth ?? 18;
  const useVcf = params.useVcf ?? true;
  const useVct = params.useVct ?? true;
  const opp = engine.side === 1 ? 2 : 1;

  // 2. Kiểm tra nước thắng tức thời tại gốc (Ngũ hoặc Tứ mở không thể đỡ)
  const rootCandidates = engine.getCandidates(engine.side, Math.max(k, 12));
  if (rootCandidates.length === 0) {
    return { ranked: [], depth: 0, nodes: 0 };
  }

  if (rootCandidates[0].isOwnFive) {
    const uci = toUci(rootCandidates[0].idx);
    return {
      ranked: [{ uci, score: CARO_MATE }],
      depth: 1,
      nodes: engine.nodes,
    };
  }

  // Nếu đối thủ có nước thắng ngũ ngay lập tức -> bắt buộc phải chặn ngay!
  if (rootCandidates[0].isOppFive) {
    const uci = toUci(rootCandidates[0].idx);
    return {
      ranked: [{ uci, score: rootCandidates[0].score }],
      depth: 1,
      nodes: engine.nodes,
    };
  }

  // 3. VCF Tấn công: Nếu AI có chuỗi thắng VCF -> Đi ngay nước đầu tiên!
  if (useVcf) {
    try {
      const vcfWinMove = engine.solveVcf(engine.side, 20);
      if (vcfWinMove !== null) {
        const uci = toUci(vcfWinMove);
        params.onIteration?.(20, CARO_MATE, uci);
        return {
          ranked: [{ uci, score: CARO_MATE }],
          depth: 20,
          nodes: engine.nodes,
        };
      }
    } catch {
      // time up or interrupted
    }
  }

  // 4. VCT Tấn công: Nếu AI có chuỗi thắng VCT (Song Tam, Tứ Tam) -> Thực thi ngay!
  if (useVct) {
    try {
      const vctWinMove = engine.solveVct(engine.side, 10);
      if (vctWinMove !== null) {
        const uci = toUci(vctWinMove);
        params.onIteration?.(10, SCORE_DOUBLE_THREE, uci);
        return {
          ranked: [{ uci, score: SCORE_DOUBLE_THREE }],
          depth: 10,
          nodes: engine.nodes,
        };
      }
    } catch {
      // time up or interrupted
    }
  }

  // 5. VCF Phòng ngự (Anti-VCF Guardian):
  // Kiểm tra xem đối thủ có chuỗi VCF thắng trong lượt tới không!
  if (useVcf) {
    try {
      const oppVcfRoot = engine.solveVcf(opp, 16);
      if (oppVcfRoot !== null) {
        // Cảnh báo đỏ: Đối thủ sắp tung đòn VCF từ ô oppVcfRoot!
        // AI kiểm tra việc đánh trực tiếp vào oppVcfRoot để dập tắt chuỗi VCF
        engine.push(oppVcfRoot);
        const oppStillWins = engine.solveVcf(opp, 12);
        engine.pop();

        if (!oppStillWins) {
          const uci = toUci(oppVcfRoot);
          params.onIteration?.(16, SCORE_FOUR_FOUR, uci);
          return {
            ranked: [{ uci, score: SCORE_FOUR_FOUR }],
            depth: 16,
            nodes: engine.nodes,
          };
        }
      }
    } catch {
      // time up
    }
  }

  let ranked: CaroRanked[] = rootCandidates.map((r) => ({
    uci: toUci(r.idx),
    score: r.score,
  }));
  const idxByUci = new Map(rootCandidates.map((r) => [toUci(r.idx), r.idx] as const));
  let completedDepth = 0;

  // 6. Iterative Deepening Alpha-Beta Search kết hợp Dynamic Threat Pruning
  for (let depth = 1; depth <= maxDepth; depth++) {
    const iteration: CaroRanked[] = [];
    let alpha = -Infinity;

    try {
      for (const prev of ranked) {
        const idx = idxByUci.get(prev.uci)!;
        engine.push(idx);
        const score = -engine.negamax(depth - 1, 1, -Infinity, -alpha, k);
        engine.pop();

        iteration.push({ uci: prev.uci, score });
        if (score > alpha) alpha = score;
      }
    } catch (err) {
      if (err instanceof TimeUp) break;
      throw err;
    }

    iteration.sort((a, b) => b.score - a.score);
    ranked = iteration;
    completedDepth = depth;

    params.onIteration?.(depth, ranked[0].score, ranked[0].uci);
    if (ranked[0].score >= CARO_MATE - 100) break;
  }

  return { ranked, depth: completedDepth, nodes: engine.nodes };
}
