"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import JungleBoard from "@/components/jungle/JungleBoard";
import JunglePlayerCard from "@/components/jungle/JunglePlayerCard";
import MoveList from "@/components/game/MoveList";
import GameControls from "@/components/game/GameControls";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import SoundToggle from "@/components/ui/SoundToggle";
import { useJungleStore } from "@/stores/jungleStore";
import { useJungleClockTicker } from "@/lib/jungle/useJungleClock";
import { trackJgPieces } from "@/lib/jungle/tracker";
import {
  jgCapturedEmoji,
  jgResultTitle,
  JG_TERMINATION_LABELS,
  playJgMoveSound,
} from "@/lib/jungle/labels";
import {
  useJungleEngine,
  type JgEngineMove,
  type JgRequestKind,
} from "@/lib/jungle/useJungleEngine";
import type { JgEngineLevel } from "@/lib/jungle/jungle.worker";
import type { JgColor } from "@/lib/jungle/rules";
import { TIME_CONTROLS, type TimeControl } from "@/lib/types";

const LEVELS: { level: JgEngineLevel; name: string; detail: string }[] = [
  { level: 1, name: "Người mới", detail: "Nhìn 1 nước, hay ngẫu hứng" },
  { level: 2, name: "Dễ", detail: "Nhìn 2 nước, thi thoảng sơ hở" },
  { level: 3, name: "Trung bình", detail: "Nhìn 4 nước, chắc tay" },
  { level: 4, name: "Khó", detail: "1 giây mỗi nước" },
  { level: 5, name: "Rất khó", detail: "2,5 giây mỗi nước" },
];

type ColorChoice = "r" | "b" | "random";

export default function JungleComputerPage() {
  const status = useJungleStore((s) => s.status);
  const moves = useJungleStore((s) => s.moves);
  const viewIndex = useJungleStore((s) => s.viewIndex);
  const turn = useJungleStore((s) => s.turn);
  const result = useJungleStore((s) => s.result);
  const orientation = useJungleStore((s) => s.orientation);
  const timeControl = useJungleStore((s) => s.timeControl);
  const redMs = useJungleStore((s) => s.redMs);
  const blueMs = useJungleStore((s) => s.blueMs);
  const clockRunning = useJungleStore((s) => s.clockRunning);

  useJungleClockTicker();

  const [level, setLevel] = useState<JgEngineLevel>(3);
  const [colorChoice, setColorChoice] = useState<ColorChoice>("r");
  const [pendingClock, setPendingClock] = useState<TimeControl | null>(null);
  const [playerColor, setPlayerColor] = useState<JgColor>("r");
  const [thinking, setThinking] = useState(false);
  const [hintEnabled, setHintEnabled] = useState(false);
  const [hintLoading, setHintLoading] = useState(false);
  const [hint, setHint] = useState<{ from: string; to: string } | null>(null);
  const [modalDismissed, setModalDismissed] = useState(false);

  const engineColor: JgColor = playerColor === "r" ? "b" : "r";
  const isLive = viewIndex === moves.length;

  useEffect(() => {
    useJungleStore.setState({ status: "idle" });
  }, []);

  const handleEngineResult = useCallback(
    (kind: JgRequestKind, em: JgEngineMove) => {
      if (kind === "hint") {
        setHintLoading(false);
        setHint({ from: em.uci.slice(0, 2), to: em.uci.slice(2, 4) });
        return;
      }
      setThinking(false);
      const move = useJungleStore
        .getState()
        .tryMove(em.uci.slice(0, 2), em.uci.slice(2, 4), true);
      if (move) {
        playJgMoveSound(
          move.captured !== undefined,
          useJungleStore.getState().status === "over",
        );
      }
    },
    [],
  );

  const engine = useJungleEngine(handleEngineResult);

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

  const pieces = useMemo(() => trackJgPieces(moves, viewIndex), [moves, viewIndex]);
  const lastMove =
    viewIndex > 0
      ? { from: moves[viewIndex - 1].from, to: moves[viewIndex - 1].to }
      : null;

  const handleMove = (from: string, to: string) => {
    if (turn !== playerColor) return;
    if (hintLoading) {
      engine.stop();
      setHintLoading(false);
    }
    const move = useJungleStore.getState().tryMove(from, to);
    if (!move) return;
    playJgMoveSound(
      move.captured !== undefined,
      useJungleStore.getState().status === "over",
    );
  };

  const startGame = () => {
    const resolved: JgColor =
      colorChoice === "random" ? (Math.random() < 0.5 ? "r" : "b") : colorChoice;
    setPlayerColor(resolved);
    setThinking(false);
    setHint(null);
    setHintLoading(false);
    setModalDismissed(false);
    engine.stop();
    useJungleStore.getState().newGame({
      timeControl: pendingClock,
      orientation: resolved === "r" ? "red" : "blue",
      autoFlip: false,
    });
  };

  const handleUndo = () => {
    const st = useJungleStore.getState();
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
          Cờ thú — đấu với máy
        </h1>
        <p className="mt-2 max-w-lg text-sm text-muted">
          AI chạy ngay trong trình duyệt — không cần mạng, không cần đăng nhập.
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
                ["r", "🦁 Đỏ (đi trước)"],
                ["b", "🐯 Xanh"],
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

  const cardWidth = {
    width: "calc(min(72vh, 600px) * 7 / 9)",
    maxWidth: "calc(100vw - 32px)",
  };
  const topColor: JgColor = orientation === "red" ? "b" : "r";
  const bottomColor: JgColor = orientation === "red" ? "r" : "b";

  const card = (color: JgColor) => (
    <JunglePlayerCard
      name={color === engineColor ? `Máy — ${levelInfo.name}` : "Bạn"}
      subtitle={color === "r" ? "Đỏ đi trước" : undefined}
      color={color}
      clockMs={timeControl ? (color === "r" ? redMs : blueMs) : null}
      clockActive={status === "playing" && clockRunning && turn === color}
      thinking={color === engineColor && thinking}
      capturedEmoji={jgCapturedEmoji(moves, viewIndex, color === "r" ? "b" : "r")}
    />
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
        <div className="flex flex-col gap-3">
          <div style={cardWidth}>{card(topColor)}</div>
          <JungleBoard
            pieces={pieces}
            turn={turn}
            orientation={orientation}
            interactive={status === "playing" && isLive}
            movableColor={playerColor}
            legalMovesFrom={(sq) => useJungleStore.getState().legalMovesFrom(sq)}
            onMove={handleMove}
            lastMove={lastMove}
            hint={hint}
          />
          <div style={cardWidth}>{card(bottomColor)}</div>
        </div>

        <aside className="flex w-full max-w-sm flex-col gap-3 lg:h-[min(78vh,660px)] lg:w-72 lg:self-center">
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
              onResign={() => useJungleStore.getState().resign(playerColor)}
              resignDisabled={status !== "playing"}
              onNewGame={() => {
                engine.stop();
                setThinking(false);
                useJungleStore.setState({ status: "idle" });
              }}
            />
            <SoundToggle />
          </div>
          <MoveList
            moves={moves}
            viewIndex={viewIndex}
            onSelect={(i) => useJungleStore.getState().setView(i)}
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
              {result.winner === null ? "½–½" : result.winner === "r" ? "🦁" : "🐯"}
            </span>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold">
              {jgResultTitle(result.winner, result.termination)}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {JG_TERMINATION_LABELS[result.termination] ?? result.termination}
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Button variant="primary" onClick={startGame}>
                Chơi lại
              </Button>
              <Button
                onClick={() => {
                  setModalDismissed(false);
                  engine.stop();
                  setThinking(false);
                  useJungleStore.setState({ status: "idle" });
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
