"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Button from "@/components/ui/Button";

/* ===== Kiểu dữ liệu & hằng số ===== */

const SIZE = 4;
const BEST_KEY = "kd-2048-best";
const WIN_VALUE = 2048;
const SLIDE_MS = 130;

type Dir = "up" | "down" | "left" | "right";

interface Tile {
  id: number;
  value: number;
  row: number;
  col: number;
  /** "new": vừa sinh ra - pop nhẹ; "merged": kết quả hợp nhất - pop trễ sau khi trượt */
  spawn: "none" | "new" | "merged";
}

interface MoveResult {
  next: Tile[];
  /** Ô đã bị "nuốt" trong hợp nhất - vẫn trượt tới đích rồi bị ô mới che lên */
  ghosts: Tile[];
  gained: number;
  moved: boolean;
}

/* Bảng màu ấm theo cấp số: ô càng lớn càng sáng (walnut → brass → boxwood) */
const TILE_COLORS: Record<number, { bg: string; fg: string; glow?: string }> = {
  2: { bg: "#453a2b", fg: "#f2ede3" },
  4: { bg: "#57452e", fg: "#f2ede3" },
  8: { bg: "#6e4f35", fg: "#f2ede3" },
  16: { bg: "#855f38", fg: "#f2ede3" },
  32: { bg: "#9c703a", fg: "#f2ede3" },
  64: { bg: "#b2853c", fg: "#10141c" },
  128: { bg: "#c8a44a", fg: "#10141c" },
  256: { bg: "#d3b573", fg: "#10141c" },
  512: { bg: "#dec89c", fg: "#10141c" },
  1024: { bg: "#e9dcc0", fg: "#10141c", glow: "0 0 18px rgba(200,164,74,0.45)" },
  2048: { bg: "#f6ecd2", fg: "#10141c", glow: "0 0 26px rgba(200,164,74,0.7)" },
};
const SUPER_COLOR = { bg: "#b4553c", fg: "#f2ede3", glow: "0 0 26px rgba(180,85,60,0.6)" };

function tileColor(value: number) {
  return TILE_COLORS[value] ?? SUPER_COLOR;
}

function tileFontSize(value: number) {
  const len = String(value).length;
  if (len <= 3) return "28px";
  if (len === 4) return "20px";
  return "16px";
}

/* ===== Logic thuần ===== */

/** Thứ tự duyệt từng hàng/cột, tính từ mép mà các ô trượt về */
function traversalLines(dir: Dir): { row: number; col: number }[][] {
  const lines: { row: number; col: number }[][] = [];
  for (let i = 0; i < SIZE; i++) {
    const line: { row: number; col: number }[] = [];
    for (let j = 0; j < SIZE; j++) {
      if (dir === "left") line.push({ row: i, col: j });
      else if (dir === "right") line.push({ row: i, col: SIZE - 1 - j });
      else if (dir === "up") line.push({ row: j, col: i });
      else line.push({ row: SIZE - 1 - j, col: i });
    }
    lines.push(line);
  }
  return lines;
}

function applyMove(tiles: Tile[], dir: Dir, allocId: () => number): MoveResult {
  const grid: (Tile | null)[][] = Array.from({ length: SIZE }, () =>
    Array<Tile | null>(SIZE).fill(null),
  );
  for (const t of tiles) grid[t.row][t.col] = t;

  const next: Tile[] = [];
  const ghosts: Tile[] = [];
  let gained = 0;
  let moved = false;

  for (const cells of traversalLines(dir)) {
    const lineTiles = cells
      .map((c) => grid[c.row][c.col])
      .filter((t): t is Tile => t !== null);

    let target = 0;
    let i = 0;
    while (i < lineTiles.length) {
      const cell = cells[target];
      const cur = lineTiles[i];
      const nxt = lineTiles[i + 1];
      if (nxt !== undefined && nxt.value === cur.value) {
        // Mỗi ô chỉ hợp nhất một lần mỗi lượt: tiêu thụ cả hai, sinh ô mới
        ghosts.push({ ...cur, row: cell.row, col: cell.col, spawn: "none" });
        ghosts.push({ ...nxt, row: cell.row, col: cell.col, spawn: "none" });
        next.push({
          id: allocId(),
          value: cur.value * 2,
          row: cell.row,
          col: cell.col,
          spawn: "merged",
        });
        gained += cur.value * 2;
        moved = true;
        i += 2;
      } else {
        if (cur.row !== cell.row || cur.col !== cell.col) moved = true;
        next.push({ ...cur, row: cell.row, col: cell.col, spawn: "none" });
        i += 1;
      }
      target += 1;
    }
  }

  return { next, ghosts, gained, moved };
}

function spawnTile(tiles: Tile[], allocId: () => number): Tile | null {
  const occupied = new Set(tiles.map((t) => t.row * SIZE + t.col));
  const empty: number[] = [];
  for (let i = 0; i < SIZE * SIZE; i++) if (!occupied.has(i)) empty.push(i);
  if (empty.length === 0) return null;
  const cell = empty[Math.floor(Math.random() * empty.length)];
  return {
    id: allocId(),
    value: Math.random() < 0.9 ? 2 : 4,
    row: Math.floor(cell / SIZE),
    col: cell % SIZE,
    spawn: "new",
  };
}

function canMove(tiles: Tile[]): boolean {
  if (tiles.length < SIZE * SIZE) return true;
  const grid: number[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  for (const t of tiles) grid[t.row][t.col] = t.value;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (r + 1 < SIZE && grid[r][c] === grid[r + 1][c]) return true;
      if (c + 1 < SIZE && grid[r][c] === grid[r][c + 1]) return true;
    }
  }
  return false;
}

const KEY_DIRS: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  W: "up",
  s: "down",
  S: "down",
  a: "left",
  A: "left",
  d: "right",
  D: "right",
};

/* ===== Trang ===== */

export default function Game2048Page() {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [ghosts, setGhosts] = useState<Tile[]>([]);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const [keepPlaying, setKeepPlaying] = useState(false);
  const [gain, setGain] = useState<{ id: number; amount: number } | null>(null);

  const idRef = useRef(1);
  const allocId = useCallback(() => idRef.current++, []);

  const stateRef = useRef({ tiles, over, won, keepPlaying, score, best });
  stateRef.current = { tiles, over, won, keepPlaying, score, best };

  const touchRef = useRef<{ x: number; y: number } | null>(null);

  const newGame = useCallback(() => {
    const first: Tile[] = [];
    const a = spawnTile(first, allocId);
    if (a) first.push(a);
    const b = spawnTile(first, allocId);
    if (b) first.push(b);
    setTiles(first);
    setGhosts([]);
    setScore(0);
    setOver(false);
    setWon(false);
    setKeepPlaying(false);
    setGain(null);
  }, [allocId]);

  /* Khởi tạo phía client (tránh lệch hydration vì random) + đọc kỷ lục */
  useEffect(() => {
    const stored = Number(window.localStorage.getItem(BEST_KEY));
    if (Number.isFinite(stored) && stored > 0) setBest(stored);
    newGame();
  }, [newGame]);

  const handleMove = useCallback(
    (dir: Dir) => {
      const s = stateRef.current;
      if (s.over || (s.won && !s.keepPlaying)) return;

      const result = applyMove(s.tiles, dir, allocId);
      if (!result.moved) return;

      const spawned = spawnTile(result.next, allocId);
      const nextTiles = spawned ? [...result.next, spawned] : result.next;

      setTiles(nextTiles);
      setGhosts(result.ghosts);

      if (result.gained > 0) {
        const nextScore = s.score + result.gained;
        setScore(nextScore);
        setGain({ id: Date.now(), amount: result.gained });
        if (nextScore > s.best) {
          setBest(nextScore);
          window.localStorage.setItem(BEST_KEY, String(nextScore));
        }
      }

      if (!s.won && nextTiles.some((t) => t.value >= WIN_VALUE)) setWon(true);
      if (!canMove(nextTiles)) setOver(true);
    },
    [allocId],
  );

  /* Bàn phím: mũi tên + WASD; chặn cuộn trang khi bấm mũi tên */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const dir = KEY_DIRS[e.key];
      if (!dir) return;
      if (e.key.startsWith("Arrow")) e.preventDefault();
      handleMove(dir);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleMove]);

  /* Cảm ứng: vuốt trên bàn cờ */
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) handleMove(dx > 0 ? "right" : "left");
    else handleMove(dy > 0 ? "down" : "up");
  };

  /* Ghost trượt bên dưới, ô sống nằm trên; sắp theo id để DOM ổn định → transition mượt */
  const renderList = [
    ...ghosts.map((t) => ({ ...t, ghost: true })),
    ...tiles.map((t) => ({ ...t, ghost: false })),
  ].sort((a, b) => a.id - b.id);

  const showWinBanner = won && !keepPlaying && !over;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <style>{`
        @keyframes kd2048-pop-new {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes kd2048-pop-merged {
          0%, 45% { transform: scale(0); opacity: 0; }
          75% { transform: scale(1.18); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div className="mx-auto flex w-full max-w-[420px] flex-col">
        {/* Tiêu đề + bảng điểm */}
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold leading-tight">
              2048
            </h1>
            <p className="mt-1 text-sm text-muted">Ghép các thẻ cùng số về một mối.</p>
          </div>
          <div className="flex gap-2">
            <div className="relative min-w-[76px] rounded-[10px] border border-line bg-slate px-3 py-2 text-center">
              <div className="text-xs uppercase tracking-wide text-muted">Điểm</div>
              <div className="font-[family-name:var(--font-mono)] text-lg text-parchment">
                {score}
              </div>
              <AnimatePresence>
                {gain && (
                  <motion.span
                    key={gain.id}
                    initial={{ opacity: 1, y: 0 }}
                    animate={{ opacity: 0, y: -28 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="pointer-events-none absolute inset-x-0 top-0 font-[family-name:var(--font-mono)] text-sm text-brass"
                  >
                    +{gain.amount}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <div className="min-w-[76px] rounded-[10px] border border-line bg-slate px-3 py-2 text-center">
              <div className="text-xs uppercase tracking-wide text-muted">Kỷ lục</div>
              <div className="font-[family-name:var(--font-mono)] text-lg text-brass">{best}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Button variant="primary" onClick={newGame}>
            Chơi lại
          </Button>
          <span className="hidden text-xs text-muted sm:block">Mũi tên / WASD để đi</span>
          <span className="text-xs text-muted sm:hidden">Vuốt để đi</span>
        </div>

        {/* Bàn chơi */}
        <div
          className="relative mt-4 aspect-square w-full touch-none select-none overflow-hidden rounded-[8px] border border-line bg-slate p-1"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* Ô nền */}
          <div className="absolute inset-1">
            {Array.from({ length: SIZE * SIZE }, (_, i) => {
              const row = Math.floor(i / SIZE);
              const col = i % SIZE;
              return (
                <div
                  key={i}
                  className="absolute left-0 top-0 h-1/4 w-1/4"
                  style={{ transform: `translate(${col * 100}%, ${row * 100}%)` }}
                >
                  <div className="absolute inset-1 rounded-[6px] bg-ink/60" />
                </div>
              );
            })}
          </div>

          {/* Thẻ số */}
          <div className="absolute inset-1">
            {renderList.map((tile) => {
              const color = tileColor(tile.value);
              return (
                <div
                  key={tile.id}
                  className="absolute left-0 top-0 h-1/4 w-1/4"
                  style={{
                    transform: `translate(${tile.col * 100}%, ${tile.row * 100}%)`,
                    transition: `transform ${SLIDE_MS}ms ease-out`,
                    zIndex: tile.ghost ? 1 : 2,
                  }}
                >
                  <div
                    className="absolute inset-1 flex items-center justify-center rounded-[6px] font-[family-name:var(--font-mono)]"
                    style={{
                      background: color.bg,
                      color: color.fg,
                      boxShadow: color.glow,
                      fontSize: tileFontSize(tile.value),
                      animation:
                        tile.spawn === "new"
                          ? `kd2048-pop-new 180ms ease-out ${SLIDE_MS}ms backwards`
                          : tile.spawn === "merged"
                            ? "kd2048-pop-merged 260ms ease-out backwards"
                            : undefined,
                    }}
                  >
                    {tile.value}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Banner thắng */}
          <AnimatePresence>
            {showWinBanner && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, delay: 0.35 }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-[8px] bg-ink/85 px-6 text-center"
              >
                <div className="font-[family-name:var(--font-display)] text-xl font-semibold text-brass">
                  Đạt 2048!
                </div>
                <p className="text-sm text-muted">
                  Bạn đã lên đỉnh. Muốn thử sức với 4096 chứ?
                </p>
                <div className="flex gap-2">
                  <Button variant="primary" onClick={() => setKeepPlaying(true)}>
                    Chơi tiếp
                  </Button>
                  <Button variant="ghost" onClick={newGame}>
                    Chơi lại
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Banner thua */}
          <AnimatePresence>
            {over && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, delay: 0.4 }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-[8px] bg-ink/85 px-6 text-center"
              >
                <div className="font-[family-name:var(--font-display)] text-xl font-semibold text-rust">
                  Hết nước đi!
                </div>
                <p className="text-sm text-muted">
                  Điểm của bạn:{" "}
                  <span className="font-[family-name:var(--font-mono)] text-parchment">
                    {score}
                  </span>
                  {score >= best && score > 0 ? " - kỷ lục mới!" : ""}
                </p>
                <Button variant="primary" onClick={newGame}>
                  Chơi lại
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Cách chơi */}
        <div className="mt-8 rounded-[10px] border border-line bg-slate p-5">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-medium">
            Cách chơi
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
            <li>
              Dùng <span className="text-parchment">phím mũi tên / WASD</span> hoặc{" "}
              <span className="text-parchment">vuốt</span> trên màn hình cảm ứng để trượt
              toàn bộ thẻ về một phía.
            </li>
            <li>
              Hai thẻ cùng số chạm nhau sẽ gộp thành một thẻ gấp đôi - mỗi thẻ chỉ gộp
              một lần mỗi lượt. Điểm cộng bằng giá trị thẻ mới.
            </li>
            <li>Sau mỗi lượt, một thẻ 2 (hoặc hiếm hơn là 4) xuất hiện ở ô trống.</li>
            <li>
              Ghép được thẻ <span className="text-brass">2048</span> là thắng - nhưng bạn
              vẫn có thể chơi tiếp để phá kỷ lục. Hết ô trống và hết nước gộp là thua.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
