"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Button from "@/components/ui/Button";

/* ===== Kiểu & hằng số ===== */

type BoardSize = "4x4" | "6x6";

const EMOJIS = [
  "♟️", "♞", "🀄", "🎲", "🃏", "🐘", "🦁", "🐭",
  "♜", "♛", "🐎", "🏰", "👑", "🛡️", "⚔️", "🧩", "🎯", "🪙",
];

const SIZE_CONFIG: Record<
  BoardSize,
  { label: string; cols: string; pairs: number; maxW: string; faceText: string }
> = {
  "4x4": {
    label: "4 × 4",
    cols: "grid-cols-4",
    pairs: 8,
    maxW: "max-w-[420px]",
    faceText: "text-xl sm:text-2xl",
  },
  "6x6": {
    label: "6 × 6",
    cols: "grid-cols-6",
    pairs: 18,
    maxW: "max-w-[560px]",
    faceText: "text-lg sm:text-xl",
  },
};

const FLIP_BACK_MS = 700;

function bestKey(size: BoardSize): string {
  return `kd-latthe-best-${size}`;
}

function buildDeck(size: BoardSize): string[] {
  const pool = EMOJIS.slice(0, SIZE_CONFIG[size].pairs);
  const deck = [...pool, ...pool];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ===== Thẻ bài - lật 3D bằng perspective + rotateY ===== */

function MemoryCard({
  emoji,
  index,
  faceUp,
  isMatched,
  faceText,
  onFlip,
}: {
  emoji: string;
  index: number;
  faceUp: boolean;
  isMatched: boolean;
  faceText: string;
  onFlip: (index: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onFlip(index)}
      aria-label={faceUp ? `Thẻ ${emoji}` : `Thẻ úp số ${index + 1}`}
      className="group relative aspect-square touch-manipulation rounded-[10px] [perspective:600px]"
    >
      <div
        className={`absolute inset-0 transition-transform duration-300 [transform-style:preserve-3d] ${
          faceUp ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {/* Mặt úp */}
        <div className="absolute inset-0 flex items-center justify-center rounded-[10px] border border-line bg-slate transition-colors [backface-visibility:hidden] group-hover:border-brass/60">
          <span aria-hidden className="text-lg text-muted opacity-50">
            ♞
          </span>
        </div>
        {/* Mặt ngửa */}
        <div
          className={`absolute inset-0 flex items-center justify-center rounded-[10px] border bg-slate [backface-visibility:hidden] [transform:rotateY(180deg)] ${
            isMatched ? "border-sage" : "border-brass"
          }`}
        >
          <span aria-hidden className={`${faceText} ${isMatched ? "kd-match-pop" : ""}`}>
            {emoji}
          </span>
        </div>
      </div>
    </button>
  );
}

/* ===== Trang chính ===== */

export default function LatThePage() {
  const [size, setSize] = useState<BoardSize>("4x4");
  const [deck, setDeck] = useState<string[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newBest, setNewBest] = useState(false);
  const [best, setBest] = useState<Record<BoardSize, number | null>>({
    "4x4": null,
    "6x6": null,
  });
  const flipBackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Đọc kỷ lục từ localStorage sau khi mount (tránh lệch SSR)
  useEffect(() => {
    const read = (s: BoardSize): number | null => {
      try {
        const raw = localStorage.getItem(bestKey(s));
        const n = raw === null ? NaN : Number.parseInt(raw, 10);
        return Number.isFinite(n) && n > 0 ? n : null;
      } catch {
        return null;
      }
    };
    setBest({ "4x4": read("4x4"), "6x6": read("6x6") });
  }, []);

  const newGame = useCallback((s: BoardSize) => {
    if (flipBackTimer.current !== null) {
      clearTimeout(flipBackTimer.current);
      flipBackTimer.current = null;
    }
    setSize(s);
    setDeck(buildDeck(s));
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setSeconds(0);
    setStarted(false);
    setDone(false);
    setShowModal(false);
    setNewBest(false);
  }, []);

  // Xáo bài lần đầu ở client (Math.random không chạy lúc SSR)
  useEffect(() => {
    newGame("4x4");
  }, [newGame]);

  // Đồng hồ đếm giây
  useEffect(() => {
    if (!started || done) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [started, done]);

  // Dọn timeout khi rời trang
  useEffect(
    () => () => {
      if (flipBackTimer.current !== null) clearTimeout(flipBackTimer.current);
    },
    [],
  );

  const finishGame = useCallback(
    (finalMoves: number) => {
      setDone(true);
      setShowModal(true);
      const prev = best[size];
      if (prev === null || finalMoves < prev) {
        setNewBest(true);
        setBest((b) => ({ ...b, [size]: finalMoves }));
        try {
          localStorage.setItem(bestKey(size), String(finalMoves));
        } catch {
          // localStorage bị chặn - bỏ qua
        }
      }
    },
    [best, size],
  );

  const handleFlip = useCallback(
    (index: number) => {
      if (done || deck.length === 0) return;
      if (flipped.length === 2) return; // đang chờ úp lại
      if (flipped.includes(index) || matched.has(index)) return;
      if (!started) setStarted(true);

      const next = [...flipped, index];
      setFlipped(next);
      if (next.length < 2) return;

      const finalMoves = moves + 1;
      setMoves(finalMoves);
      const [a, b] = next;
      if (deck[a] === deck[b]) {
        const nextMatched = new Set(matched);
        nextMatched.add(a);
        nextMatched.add(b);
        setMatched(nextMatched);
        setFlipped([]);
        if (nextMatched.size === deck.length) finishGame(finalMoves);
      } else {
        flipBackTimer.current = setTimeout(() => {
          setFlipped([]);
          flipBackTimer.current = null;
        }, FLIP_BACK_MS);
      }
    },
    [deck, done, finishGame, flipped, matched, moves, started],
  );

  const config = SIZE_CONFIG[size];
  const cells =
    deck.length > 0
      ? deck
      : Array.from({ length: config.pairs * 2 }, () => "");
  const bestForSize = best[size];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <style>{`
        @keyframes kd-match-pop {
          0% { transform: scale(1); }
          45% { transform: scale(1.35); }
          100% { transform: scale(1); }
        }
        .kd-match-pop { animation: kd-match-pop 0.45s ease-out; }
      `}</style>

      {/* Tiêu đề */}
      <div className="mb-8 max-w-2xl">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold leading-tight">
          Lật Thẻ
        </h1>
        <p className="mt-3 text-base text-muted">
          Trí nhớ kỳ thủ - lật hai thẻ mỗi lượt, tìm đủ cặp giống nhau với càng
          ít lượt càng tốt.
        </p>
      </div>

      {/* Chọn cỡ bàn + Chơi lại */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2" role="group" aria-label="Cỡ bàn">
          {(["4x4", "6x6"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => newGame(s)}
              className={`h-8 rounded-[6px] px-3 font-[family-name:var(--font-mono)] text-xs transition-colors ${
                size === s
                  ? "bg-brass font-medium text-ink"
                  : "border border-line text-muted hover:border-brass hover:text-brass"
              }`}
            >
              {SIZE_CONFIG[s].label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => newGame(size)}>
          ↺ Chơi lại
        </Button>
      </div>

      {/* Bảng điểm */}
      <div className={`mx-auto mb-6 grid grid-cols-3 gap-2 sm:gap-3 ${config.maxW}`}>
        {[
          { label: "Lượt lật", value: String(moves) },
          { label: "Thời gian", value: formatTime(seconds) },
          {
            label: "Kỷ lục",
            value: bestForSize === null ? "-" : `${bestForSize} lượt`,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-[10px] border border-line bg-slate px-3 py-2 text-center"
          >
            <div className="text-xs text-muted">{stat.label}</div>
            <div className="mt-1 font-[family-name:var(--font-mono)] text-lg text-brass">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Bàn chơi */}
      <div className={`mx-auto grid gap-2 sm:gap-3 ${config.cols} ${config.maxW}`}>
        {cells.map((emoji, i) => (
          <MemoryCard
            key={`${size}-${i}`}
            emoji={emoji}
            index={i}
            faceUp={matched.has(i) || flipped.includes(i)}
            isMatched={matched.has(i)}
            faceText={config.faceText}
            onFlip={handleFlip}
          />
        ))}
      </div>

      {/* Cách chơi */}
      <div className="mt-12 rounded-[10px] border border-line bg-slate p-6">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-medium">
          Cách chơi
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
          <li>• Chạm vào thẻ úp để lật; mỗi lượt được lật đúng 2 thẻ.</li>
          <li>• Hai thẻ giống nhau sẽ giữ nguyên mặt ngửa, lệch nhau thì tự úp lại.</li>
          <li>• Lật hết tất cả các cặp để hoàn thành bàn.</li>
          <li>
            • Kỷ lục là số lượt lật ít nhất cho từng cỡ bàn, lưu ngay trên máy
            của bạn.
          </li>
        </ul>
      </div>

      {/* Modal kết quả */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 px-4"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Kết quả"
              initial={{ scale: 0.92, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-sm rounded-[10px] border border-line bg-slate p-6 text-center"
            >
              <span aria-hidden className="text-2xl">
                🏆
              </span>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold">
                Hoàn thành!
              </h2>
              {newBest && (
                <p className="mt-1 text-sm text-brass">
                  Kỷ lục mới cho bàn {config.label}!
                </p>
              )}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-[10px] border border-line px-3 py-2">
                  <div className="text-xs text-muted">Lượt lật</div>
                  <div className="mt-1 font-[family-name:var(--font-mono)] text-lg">
                    {moves}
                  </div>
                </div>
                <div className="rounded-[10px] border border-line px-3 py-2">
                  <div className="text-xs text-muted">Thời gian</div>
                  <div className="mt-1 font-[family-name:var(--font-mono)] text-lg">
                    {formatTime(seconds)}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-center gap-3">
                <Button variant="primary" onClick={() => newGame(size)}>
                  Chơi lại
                </Button>
                <Button onClick={() => setShowModal(false)}>Xem bàn</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
