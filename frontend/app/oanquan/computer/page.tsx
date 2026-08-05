"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import OanquanBoard from "@/components/oanquan/OanquanBoard";
import OanquanPlayerCard from "@/components/oanquan/OanquanPlayerCard";
import MoveList from "@/components/game/MoveList";
import GameControls from "@/components/game/GameControls";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import SoundToggle from "@/components/ui/SoundToggle";
import { useOanquanStore } from "@/stores/oanquanStore";
import { useOanquanClockTicker } from "@/lib/oanquan/useOanquanClock";
import {
  oqResultTitle,
  oqSideName,
  OQ_TERMINATION_LABELS,
  playOqMoveSound,
} from "@/lib/oanquan/labels";
import {
  useOanquanEngine,
  type OqEngineMove,
  type OqRequestKind,
} from "@/lib/oanquan/useOanquanEngine";
import type { OqEngineLevel } from "@/lib/oanquan/oanquan.worker";
import { oqBoardAt } from "@/lib/oanquan/tracker";
import { parseOqUci, type OqColor, type OqDir } from "@/lib/oanquan/rules";
import { TIME_CONTROLS, type TimeControl } from "@/lib/types";

const LEVELS: { level: OqEngineLevel; name: string; detail: string }[] = [
  { level: 1, name: "Người mới", detail: "Nhìn 1 nước, hay ngẫu hứng" },
  { level: 2, name: "Dễ", detail: "Nhìn 2 nước, thi thoảng sơ hở" },
  { level: 3, name: "Trung bình", detail: "Nhìn 4 nước, chắc tay" },
  { level: 4, name: "Khó", detail: "1 giây mỗi nước" },
  { level: 5, name: "Rất khó", detail: "2,5 giây mỗi nước" },
];

type ColorChoice = "a" | "b" | "random";

export default function OanquanComputerPage() {
  const status = useOanquanStore((s) => s.status);
  const moves = useOanquanStore((s) => s.moves);
  const viewIndex = useOanquanStore((s) => s.viewIndex);
  const turn = useOanquanStore((s) => s.turn);
  const result = useOanquanStore((s) => s.result);
  const timeControl = useOanquanStore((s) => s.timeControl);
  const aMs = useOanquanStore((s) => s.aMs);
  const bMs = useOanquanStore((s) => s.bMs);
  const clockRunning = useOanquanStore((s) => s.clockRunning);

  useOanquanClockTicker();

  const [level, setLevel] = useState<OqEngineLevel>(3);
  const [colorChoice, setColorChoice] = useState<ColorChoice>("a");
  const [pendingClock, setPendingClock] = useState<TimeControl | null>(null);
  const [playerColor, setPlayerColor] = useState<OqColor>("a");
  const [thinking, setThinking] = useState(false);
  const [hintEnabled, setHintEnabled] = useState(false);
  const [hintLoading, setHintLoading] = useState(false);
  const [hint, setHint] = useState<{ cell: number; dir: OqDir } | null>(null);
  const [modalDismissed, setModalDismissed] = useState(false);

  const engineColor: OqColor = playerColor === "a" ? "b" : "a";
  const isLive = viewIndex === moves.length;

  useEffect(() => {
    useOanquanStore.setState({ status: "idle" });
  }, []);

  const handleEngineResult = useCallback(
    (kind: OqRequestKind, em: OqEngineMove) => {
      if (kind === "hint") {
        setHintLoading(false);
        setHint(parseOqUci(em.uci));
        return;
      }
      setThinking(false);
      const move = useOanquanStore.getState().tryMove(em.uci, true);
      if (move)
        playOqMoveSound(
          move.gained > 0,
          useOanquanStore.getState().status === "over",
        );
    },
    [],
  );

  const engine = useOanquanEngine(handleEngineResult);

  // đến lượt máy → tìm nước (suy nghĩ tối thiểu 300ms)
  useEffect(() => {
    if (status !== "playing" || turn !== engineColor || thinking) return;
    setThinking(true);
    engine.request(
      moves.map((m) => m.uci),
      level,
      "move",
      300,
    );
  }, [status, turn, engineColor, thinking, engine, moves, level]);

  useEffect(() => {
    if (status !== "over") return;
    engine.stop();
    setThinking(false);
    setHintLoading(false);
  }, [status, engine]);

  // gợi ý mức 3 khi bật
  useEffect(() => {
    if (
      !hintEnabled ||
      status !== "playing" ||
      turn !== playerColor ||
      !isLive ||
      hintLoading ||
      hint
    )
      return;
    setHintLoading(true);
    engine.request(
      moves.map((m) => m.uci),
      3,
      "hint",
    );
  }, [hintEnabled, status, turn, playerColor, isLive, hintLoading, hint, engine, moves]);

  const movesLenRef = useRef(moves.length);
  useEffect(() => {
    if (moves.length !== movesLenRef.current) {
      movesLenRef.current = moves.length;
      setHint(null);
    }
  }, [moves.length]);

  const board = useMemo(() => oqBoardAt(moves, viewIndex), [moves, viewIndex]);
  const lastMove = viewIndex > 0 ? moves[viewIndex - 1] : null;

  const handleMove = (uci: string) => {
    if (turn !== playerColor) return;
    if (hintLoading) {
      engine.stop();
      setHintLoading(false);
    }
    const move = useOanquanStore.getState().tryMove(uci);
    if (!move) return;
    playOqMoveSound(
      move.gained > 0,
      useOanquanStore.getState().status === "over",
    );
  };

  const startGame = () => {
    const resolved: OqColor =
      colorChoice === "random" ? (Math.random() < 0.5 ? "a" : "b") : colorChoice;
    setPlayerColor(resolved);
    setThinking(false);
    setHint(null);
    setHintLoading(false);
    setModalDismissed(false);
    engine.stop();
    useOanquanStore.getState().newGame({ timeControl: pendingClock });
  };

  const handleUndo = () => {
    const st = useOanquanStore.getState();
    if (st.moves.length === 0) return;
    if (thinking || hintLoading) {
      engine.stop();
      setThinking(false);
      setHintLoading(false);
    }
    setHint(null);
    const lastByEngine = st.moves[st.moves.length - 1].color === engineColor;
    st.undo(lastByEngine ? 2 : 1);
  };

  const levelInfo = LEVELS.find((l) => l.level === level)!;

  if (status === "idle") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Ô ăn quan - đấu với máy
        </h1>
        <p className="mt-2 max-w-lg text-sm text-muted">
          AI tính chuỗi rải-ăn nhiều nước, chạy ngay trong trình duyệt - không
          cần mạng.
        </p>
        <div className="mt-8 max-w-xl rounded-[10px] border border-line bg-slate p-6">
          <p className="text-sm font-medium">Mức độ</p>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {LEVELS.map((l) => (
              <button
                key={l.level}
                type="button"
                onClick={() => setLevel(l.level)}
                className={`rounded-[6px] border px-1 py-2 text-center transition-colors ${
                  level === l.level
                    ? "border-brass bg-brass/10"
                    : "border-line hover:border-brass/50"
                }`}
              >
                <span className="block font-[family-name:var(--font-mono)] text-lg text-brass">
                  {l.level}
                </span>
                <span className="mt-1 block text-xs text-muted">{l.name}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">{levelInfo.detail}</p>

          <p className="mt-6 text-sm font-medium">Phe của bạn</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(
              [
                ["a", "🔴 Đỏ (đi trước)"],
                ["b", "🔵 Xanh"],
                ["random", "⚄ Ngẫu nhiên"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setColorChoice(value)}
                className={`rounded-[6px] border px-3 py-2 text-sm transition-colors ${
                  colorChoice === value
                    ? "border-brass bg-brass/10 text-brass"
                    : "border-line text-muted hover:border-brass/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="mt-6 text-sm font-medium">Đồng hồ</p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {TIME_CONTROLS.map((tc) => (
              <button
                key={tc.label}
                type="button"
                onClick={() => setPendingClock(tc.value)}
                className={`rounded-[6px] border px-2 py-2 font-[family-name:var(--font-mono)] text-sm transition-colors ${
                  (pendingClock?.label ?? "Tắt") === tc.label
                    ? "border-brass bg-brass/10 text-brass"
                    : "border-line text-muted hover:border-brass/50"
                }`}
              >
                {tc.label === "Tắt" ? "∞" : tc.label}
              </button>
            ))}
          </div>

          <Button variant="primary" className="mt-8 w-full" onClick={startGame}>
            Bắt đầu ván đấu
          </Button>
        </div>
      </div>
    );
  }

  const card = (color: OqColor) => (
    <OanquanPlayerCard
      name={color === engineColor ? `Máy - ${levelInfo.name}` : "Bạn"}
      subtitle={color === "a" ? "Đỏ đi trước" : undefined}
      color={color}
      clockMs={timeControl ? (color === "a" ? aMs : bMs) : null}
      clockActive={status === "playing" && clockRunning && turn === color}
      thinking={color === engineColor && thinking}
      store={color === "a" ? board.storeA : board.storeB}
    />
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {card("b")}
          <OanquanBoard
            dan={board.dan}
            quanLeft={board.quanLeft}
            quanRight={board.quanRight}
            turn={board.turn}
            interactive={status === "playing" && isLive}
            movableColor={playerColor}
            onMove={handleMove}
            lastMove={lastMove}
            hint={hint}
          />
          {card("a")}
        </div>

        <aside className="flex w-full flex-col gap-3 lg:w-72">
          <div className="flex items-center justify-between gap-2">
            <GameControls
              onUndo={handleUndo}
              undoDisabled={status !== "playing" || moves.length === 0}
              onHint={() => {
                setHintEnabled((v) => !v);
                if (hintEnabled) {
                  setHint(null);
                  if (hintLoading) {
                    engine.stop();
                    setHintLoading(false);
                  }
                }
              }}
              hintActive={hintEnabled}
              hintLoading={hintLoading}
              hintDisabled={status !== "playing"}
              onResign={() => useOanquanStore.getState().resign(playerColor)}
              resignDisabled={status !== "playing"}
              onNewGame={() => {
                engine.stop();
                setThinking(false);
                useOanquanStore.setState({ status: "idle" });
              }}
            />
            <SoundToggle />
          </div>
          <MoveList
            moves={moves}
            viewIndex={viewIndex}
            onSelect={(i) => useOanquanStore.getState().setView(i)}
          />
        </aside>
      </div>

      <Modal
        open={status === "over" && !modalDismissed}
        onClose={() => setModalDismissed(true)}
      >
        {result && (
          <div className="text-center">
            <span aria-hidden className="text-2xl leading-none">
              {result.winner === null ? "½-½" : "🌾"}
            </span>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold">
              {oqResultTitle(result.winner, result.termination)}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {OQ_TERMINATION_LABELS[result.termination] ?? result.termination}
            </p>
            {result.scoreA !== undefined && result.scoreB !== undefined && (
              <p className="mt-2 font-[family-name:var(--font-mono)] text-sm text-parchment/90">
                {oqSideName("a")} {result.scoreA} - {result.scoreB}{" "}
                {oqSideName("b")}
              </p>
            )}
            <div className="mt-6 flex justify-center gap-2">
              <Button variant="primary" onClick={startGame}>
                Chơi lại
              </Button>
              <Button
                onClick={() => {
                  setModalDismissed(false);
                  engine.stop();
                  setThinking(false);
                  useOanquanStore.setState({ status: "idle" });
                }}
              >
                Đổi cấu hình
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
