"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Button from "@/components/ui/Button";

/* ===== Mức độ ===== */

type LevelKey = "de" | "vua" | "kho";

interface LevelDef {
  key: LevelKey;
  label: string;
  rows: number;
  cols: number;
  mines: number;
}

const LEVELS: LevelDef[] = [
  { key: "de", label: "Dễ", rows: 9, cols: 9, mines: 10 },
  { key: "vua", label: "Vừa", rows: 16, cols: 16, mines: 40 },
  { key: "kho", label: "Khó", rows: 16, cols: 30, mines: 99 },
];

const bestKey = (k: LevelKey) => `kd-domin-best-${k}`;

/* Màu số 1-8 - đủ tương phản trên nền tối */
const NUM_COLORS = [
  "",
  "#6ca0dc", // 1 - xanh dương
  "#7fbf72", // 2 - xanh lá
  "#e0694e", // 3 - đỏ gạch
  "#a98fd8", // 4 - tím
  "#c8a44a", // 5 - vàng đồng
  "#5abfb8", // 6 - xanh ngọc
  "#d884b0", // 7 - hồng
  "#aab4c0", // 8 - xám sáng
];

/* ===== Mô hình bàn chơi ===== */

interface Cell {
  mine: boolean;
  open: boolean;
  flag: boolean;
  adj: number;
}

type Status = "idle" | "playing" | "won" | "lost";

function makeEmpty(rows: number, cols: number): Cell[] {
  return Array.from({ length: rows * cols }, () => ({
    mine: false,
    open: false,
    flag: false,
    adj: 0,
  }));
}

function neighborsOf(i: number, rows: number, cols: number): number[] {
  const r = Math.floor(i / cols);
  const c = i % cols;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push(nr * cols + nc);
    }
  }
  return out;
}

/** Đặt mìn sau cú nhấn đầu tiên, né ô an toàn và 8 ô xung quanh. */
function placeMines(
  cells: Cell[],
  rows: number,
  cols: number,
  mineCount: number,
  safe: number,
): void {
  const banned = new Set<number>([safe, ...neighborsOf(safe, rows, cols)]);
  const pool: number[] = [];
  for (let i = 0; i < cells.length; i++) if (!banned.has(i)) pool.push(i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  for (const idx of pool.slice(0, mineCount)) cells[idx].mine = true;
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].mine) continue;
    cells[i].adj = neighborsOf(i, rows, cols).reduce(
      (s, n) => s + (cells[n].mine ? 1 : 0),
      0,
    );
  }
}

/** Mở lan vùng trống (flood-fill), bỏ qua ô đã cắm cờ. */
function floodOpen(cells: Cell[], start: number, rows: number, cols: number): void {
  const stack = [start];
  while (stack.length > 0) {
    const i = stack.pop() as number;
    const c = cells[i];
    if (c.open || c.flag) continue;
    c.open = true;
    if (!c.mine && c.adj === 0) {
      for (const n of neighborsOf(i, rows, cols)) {
        if (!cells[n].open) stack.push(n);
      }
    }
  }
}

/* ===== Đồng hồ - tự đếm để cả bàn không phải vẽ lại mỗi giây ===== */

function TimerDisplay({
  startedAt,
  frozen,
}: {
  startedAt: number | null;
  frozen: number | null;
}) {
  const [, force] = useState(0);
  useEffect(() => {
    if (startedAt === null || frozen !== null) return;
    const id = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [startedAt, frozen]);
  const secs =
    frozen !== null
      ? frozen
      : startedAt === null
        ? 0
        : Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  return <span className="text-brass">{secs}s</span>;
}

/* ===== Trang ===== */

export default function DoMinPage() {
  const [levelKey, setLevelKey] = useState<LevelKey>("de");
  const level = LEVELS.find((l) => l.key === levelKey) ?? LEVELS[0];

  const [cells, setCells] = useState<Cell[]>(() => makeEmpty(9, 9));
  const [status, setStatus] = useState<Status>("idle");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finalTime, setFinalTime] = useState<number | null>(null);
  const [exploded, setExploded] = useState<number | null>(null);
  const [newRecord, setNewRecord] = useState(false);
  const [best, setBest] = useState<Record<LevelKey, number | null>>({
    de: null,
    vua: null,
    kho: null,
  });

  /* Nạp kỷ lục từ localStorage */
  useEffect(() => {
    const loaded: Record<LevelKey, number | null> = { de: null, vua: null, kho: null };
    for (const l of LEVELS) {
      try {
        const raw = localStorage.getItem(bestKey(l.key));
        const n = raw === null ? NaN : Number(raw);
        loaded[l.key] = Number.isFinite(n) ? n : null;
      } catch {
        loaded[l.key] = null;
      }
    }
    setBest(loaded);
  }, []);

  const resetWith = (def: LevelDef) => {
    setCells(makeEmpty(def.rows, def.cols));
    setStatus("idle");
    setStartedAt(null);
    setFinalTime(null);
    setExploded(null);
    setNewRecord(false);
  };

  const reset = () => resetWith(level);

  const changeLevel = (k: LevelKey) => {
    setLevelKey(k);
    resetWith(LEVELS.find((l) => l.key === k) ?? LEVELS[0]);
  };

  const elapsed = (began: number) =>
    Math.max(0, Math.floor((Date.now() - began) / 1000));

  const loseAt = (cs: Cell[], boomIdx: number, began: number | null) => {
    for (const c of cs) if (c.mine && !c.flag) c.open = true;
    setExploded(boomIdx);
    setFinalTime(began === null ? 0 : elapsed(began));
    setStatus("lost");
    setCells(cs);
  };

  const maybeWin = (cs: Cell[], began: number): boolean => {
    if (!cs.every((c) => c.mine || c.open)) return false;
    for (const c of cs) if (c.mine) c.flag = true;
    const t = elapsed(began);
    setFinalTime(t);
    setStatus("won");
    setCells(cs);
    const prev = best[levelKey];
    if (prev === null || t < prev) {
      setBest({ ...best, [levelKey]: t });
      setNewRecord(true);
      try {
        localStorage.setItem(bestKey(levelKey), String(t));
      } catch {
        /* bộ nhớ đầy hoặc bị chặn - bỏ qua */
      }
    }
    return true;
  };

  const reveal = (idx: number) => {
    if (status === "won" || status === "lost") return;
    const { rows, cols, mines } = level;
    const cs = cells.map((c) => ({ ...c }));
    const cur = cs[idx];
    if (cur.flag) return;

    const began = startedAt ?? Date.now();
    if (status === "idle") {
      placeMines(cs, rows, cols, mines, idx);
      setStartedAt(began);
      setStatus("playing");
    }

    if (cur.open) {
      /* Chord: ô số đã đủ cờ quanh - mở nhanh các ô còn lại */
      if (cur.adj === 0) return;
      const nbs = neighborsOf(idx, rows, cols);
      const flags = nbs.reduce((s, n) => s + (cs[n].flag ? 1 : 0), 0);
      if (flags !== cur.adj) return;
      const targets = nbs.filter((n) => !cs[n].flag && !cs[n].open);
      const boom = targets.find((n) => cs[n].mine);
      if (boom !== undefined) {
        for (const n of targets) if (!cs[n].mine) floodOpen(cs, n, rows, cols);
        cs[boom].open = true;
        loseAt(cs, boom, began);
        return;
      }
      for (const n of targets) floodOpen(cs, n, rows, cols);
      if (!maybeWin(cs, began)) setCells(cs);
      return;
    }

    if (cur.mine) {
      cur.open = true;
      loseAt(cs, idx, began);
      return;
    }

    floodOpen(cs, idx, rows, cols);
    if (!maybeWin(cs, began)) setCells(cs);
  };

  const toggleFlag = (idx: number) => {
    if (status === "won" || status === "lost") return;
    const cs = cells.map((c) => ({ ...c }));
    const c = cs[idx];
    if (c.open) return;
    c.flag = !c.flag;
    setCells(cs);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(30);
    }
  };

  /* ===== Chạm giữ (~400ms) để cắm cờ trên di động ===== */

  const pressRef = useRef<{
    timer: number | null;
    fired: boolean;
    moved: boolean;
    x: number;
    y: number;
  }>({ timer: null, fired: false, moved: false, x: 0, y: 0 });
  const lastTouchRef = useRef(0);

  const cancelPress = () => {
    const p = pressRef.current;
    if (p.timer !== null) {
      window.clearTimeout(p.timer);
      p.timer = null;
    }
  };

  const onCellTouchStart = (idx: number) => (e: React.TouchEvent) => {
    lastTouchRef.current = Date.now();
    const t = e.touches[0];
    if (!t) return;
    const p = pressRef.current;
    cancelPress();
    p.fired = false;
    p.moved = false;
    p.x = t.clientX;
    p.y = t.clientY;
    p.timer = window.setTimeout(() => {
      p.timer = null;
      p.fired = true;
      toggleFlag(idx);
    }, 400);
  };

  const onBoardTouchMove = (e: React.TouchEvent) => {
    const p = pressRef.current;
    const t = e.touches[0];
    if (!t) return;
    if (Math.abs(t.clientX - p.x) > 10 || Math.abs(t.clientY - p.y) > 10) {
      p.moved = true;
      cancelPress();
    }
  };

  const onCellTouchEnd = (idx: number) => (e: React.TouchEvent) => {
    lastTouchRef.current = Date.now();
    const p = pressRef.current;
    cancelPress();
    if (e.cancelable) e.preventDefault(); // chặn click tổng hợp sau chạm
    if (!p.fired && !p.moved) reveal(idx);
  };

  const onCellContextMenu = (idx: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    // Long-press trên di động đã cắm cờ rồi - đừng lật lại lần nữa
    if (Date.now() - lastTouchRef.current < 800) return;
    toggleFlag(idx);
  };

  /* ===== Hiển thị ===== */

  const flagCount = cells.reduce((s, c) => s + (c.flag ? 1 : 0), 0);
  const remaining = level.mines - flagCount;
  const face = status === "lost" ? "😵" : status === "won" ? "😎" : "🙂";

  const cellContent = (c: Cell): React.ReactNode => {
    if (!c.open && c.flag) {
      if (status === "lost" && !c.mine) {
        return <span className="text-rust">✕</span>;
      }
      return <span aria-hidden>🚩</span>;
    }
    if (!c.open) return null;
    if (c.mine) return <span aria-hidden>💣</span>;
    if (c.adj > 0) {
      return <span style={{ color: NUM_COLORS[c.adj] }}>{c.adj}</span>;
    }
    return null;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8 max-w-2xl">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold leading-tight">
          Dò Mìn
        </h1>
        <p className="mt-3 text-base text-muted">
          Mở hết vùng đất an toàn, cắm cờ đúng chỗ chôn mìn - một cú nhấn sai là
          tan tành.
        </p>
      </div>

      {/* Thanh điều khiển */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[10px] border border-line bg-slate p-4">
        <div className="flex items-center gap-2">
          {LEVELS.map((l) => (
            <Button
              key={l.key}
              size="sm"
              variant={l.key === levelKey ? "primary" : "ghost"}
              onClick={() => changeLevel(l.key)}
            >
              {l.label}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-4 font-[family-name:var(--font-mono)] text-sm">
          <span title="Số mìn còn lại">
            <span aria-hidden>💣</span>{" "}
            <span className={remaining < 0 ? "text-rust" : "text-brass"}>
              {remaining}
            </span>
          </span>
          <span title="Thời gian">
            <span aria-hidden>⏱</span>{" "}
            <TimerDisplay startedAt={startedAt} frozen={finalTime} />
          </span>
          <span className="text-muted" title="Thời gian nhanh nhất mức này">
            Kỷ lục:{" "}
            {best[levelKey] !== null ? `${best[levelKey]}s` : "-"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            aria-label="Chơi lại"
            className="flex h-8 w-9 items-center justify-center rounded-[6px] border border-line text-base leading-none transition-colors hover:border-brass"
          >
            <span aria-hidden>{face}</span>
          </button>
          <Button size="sm" variant="ghost" onClick={reset}>
            Chơi lại
          </Button>
        </div>
      </div>

      {/* Bàn chơi - mức Khó cuộn ngang */}
      <div className="rounded-[8px] border border-line bg-slate p-3">
        <div className="overflow-x-auto">
          <div
            role="grid"
            aria-label={`Bàn dò mìn ${level.rows} hàng ${level.cols} cột`}
            className="mx-auto grid w-max select-none gap-[3px]"
            style={
              {
                gridTemplateColumns: `repeat(${level.cols}, 32px)`,
                WebkitTouchCallout: "none",
              } as React.CSSProperties
            }
            onContextMenu={(e) => e.preventDefault()}
            onTouchMove={onBoardTouchMove}
            onTouchCancel={() => {
              pressRef.current.moved = true;
              cancelPress();
            }}
          >
            {cells.map((c, i) => {
              const isBoom = exploded === i;
              const skin = c.open
                ? isBoom
                  ? "bg-rust/80"
                  : "bg-ink/70"
                : "border border-line bg-walnut/30 hover:border-brass active:brightness-125";
              const row = Math.floor(i / level.cols) + 1;
              const col = (i % level.cols) + 1;
              return (
                <button
                  key={i}
                  type="button"
                  aria-label={`Ô hàng ${row}, cột ${col}`}
                  className={`flex h-8 w-8 items-center justify-center rounded-[3px] text-sm font-semibold leading-none [touch-action:manipulation] ${skin}`}
                  onClick={() => reveal(i)}
                  onContextMenu={onCellContextMenu(i)}
                  onTouchStart={onCellTouchStart(i)}
                  onTouchEnd={onCellTouchEnd(i)}
                >
                  {cellContent(c)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Thông báo kết quả */}
      <AnimatePresence>
        {(status === "won" || status === "lost") && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className={`mt-4 flex flex-wrap items-center gap-3 rounded-[10px] border p-4 text-sm ${
              status === "won" ? "border-brass/60 bg-slate" : "border-rust/60 bg-slate"
            }`}
          >
            {status === "won" ? (
              <>
                <span aria-hidden className="text-lg leading-none">
                  🎉
                </span>
                <span>
                  Quét sạch bãi mìn trong{" "}
                  <span className="font-[family-name:var(--font-mono)] text-brass">
                    {finalTime ?? 0}s
                  </span>
                  {newRecord && (
                    <span className="ml-2 font-medium text-brass">
                      - Kỷ lục mới!
                    </span>
                  )}
                </span>
              </>
            ) : (
              <>
                <span aria-hidden className="text-lg leading-none">
                  💥
                </span>
                <span className="text-parchment">
                  Bùm! Bạn giẫm trúng mìn. Ô đánh dấu{" "}
                  <span className="text-rust">✕</span> là cờ cắm sai chỗ.
                </span>
              </>
            )}
            <Button size="sm" variant="ghost" className="ml-auto" onClick={reset}>
              Chơi lại
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cách chơi */}
      <div className="mt-10 max-w-2xl rounded-[10px] border border-line bg-slate p-6">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-medium">
          Cách chơi
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
          <li>• Nhấn vào ô để mở - cú nhấn đầu tiên luôn an toàn.</li>
          <li>
            • Số trên ô cho biết có bao nhiêu quả mìn nằm trong 8 ô xung quanh.
          </li>
          <li>
            • Chuột phải (hoặc chạm giữ ~nửa giây trên điện thoại) để cắm cờ 🚩
            đánh dấu mìn.
          </li>
          <li>
            • Nhấn vào ô số đã cắm đủ cờ xung quanh để mở nhanh các ô còn lại
            (chord).
          </li>
          <li>
            • Mở hết mọi ô không có mìn là thắng. Thời gian nhanh nhất mỗi mức
            được lưu làm kỷ lục trên máy của bạn.
          </li>
        </ul>
      </div>
    </div>
  );
}
