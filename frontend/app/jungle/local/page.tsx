"use client";

import { useEffect, useMemo, useState } from "react";
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
import type { JgColor } from "@/lib/jungle/rules";
import { TIME_CONTROLS, type TimeControl } from "@/lib/types";

export default function JungleLocalPage() {
  const status = useJungleStore((s) => s.status);
  const moves = useJungleStore((s) => s.moves);
  const viewIndex = useJungleStore((s) => s.viewIndex);
  const turn = useJungleStore((s) => s.turn);
  const result = useJungleStore((s) => s.result);
  const orientation = useJungleStore((s) => s.orientation);
  const autoFlip = useJungleStore((s) => s.autoFlip);
  const timeControl = useJungleStore((s) => s.timeControl);
  const redMs = useJungleStore((s) => s.redMs);
  const blueMs = useJungleStore((s) => s.blueMs);
  const clockRunning = useJungleStore((s) => s.clockRunning);

  useJungleClockTicker();

  const [pendingClock, setPendingClock] = useState<TimeControl | null>(null);
  const [modalDismissed, setModalDismissed] = useState(false);

  useEffect(() => {
    useJungleStore.setState({ status: "idle" });
  }, []);

  const pieces = useMemo(() => trackJgPieces(moves, viewIndex), [moves, viewIndex]);
  const lastMove =
    viewIndex > 0
      ? { from: moves[viewIndex - 1].from, to: moves[viewIndex - 1].to }
      : null;
  const isLive = viewIndex === moves.length;
  const interactive = status === "playing" && isLive;

  const handleMove = (from: string, to: string) => {
    const move = useJungleStore.getState().tryMove(from, to);
    if (!move) return;
    playJgMoveSound(
      move.captured !== undefined,
      useJungleStore.getState().status === "over",
    );
  };

  const startGame = () => {
    setModalDismissed(false);
    useJungleStore.getState().newGame({
      timeControl: pendingClock,
      orientation: "red",
      autoFlip: true,
    });
  };

  const card = (color: JgColor) => (
    <JunglePlayerCard
      name={color === "r" ? "Đỏ (đi trước)" : "Xanh"}
      color={color}
      clockMs={timeControl ? (color === "r" ? redMs : blueMs) : null}
      clockActive={status === "playing" && clockRunning && turn === color}
      capturedEmoji={jgCapturedEmoji(moves, viewIndex, color === "r" ? "b" : "r")}
    />
  );

  if (status === "idle") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Cờ thú — hai người một máy
        </h1>
        <p className="mt-2 max-w-lg text-sm text-muted">
          Đưa thú vào hang ⛩ của đối phương, hoặc ăn sạch thú của họ. Cẩn thận
          bẫy quanh hang — thú đứng trong bẫy địch bị mọi con ăn được.
        </p>
        <div className="mt-8 max-w-sm rounded-[10px] border border-line bg-slate p-6">
          <p className="text-sm font-medium">Đồng hồ</p>
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
                {tc.label}
              </button>
            ))}
          </div>
          <Button variant="primary" className="mt-6 w-full" onClick={startGame}>
            Bắt đầu
          </Button>
        </div>
      </div>
    );
  }

  const cardWidth = { width: "calc(min(72vh, 600px) * 7 / 9)", maxWidth: "calc(100vw - 32px)" };
  const topColor: JgColor = orientation === "red" ? "b" : "r";
  const bottomColor: JgColor = orientation === "red" ? "r" : "b";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
        <div className="flex flex-col gap-3">
          <div style={cardWidth}>{card(topColor)}</div>
          <JungleBoard
            pieces={pieces}
            turn={turn}
            orientation={orientation}
            interactive={interactive}
            movableColor="both"
            legalMovesFrom={(sq) => useJungleStore.getState().legalMovesFrom(sq)}
            onMove={handleMove}
            lastMove={lastMove}
          />
          <div style={cardWidth}>{card(bottomColor)}</div>
        </div>

        <aside className="flex w-full max-w-sm flex-col gap-3 lg:h-[min(78vh,660px)] lg:w-72 lg:self-center">
          <div className="flex items-center justify-between">
            <GameControls
              onUndo={() => useJungleStore.getState().undo(1)}
              undoDisabled={status !== "playing" || moves.length === 0}
              onFlip={() => useJungleStore.getState().flip()}
              autoFlip={autoFlip}
              onToggleAutoFlip={(v) => useJungleStore.getState().setAutoFlip(v)}
              onNewGame={() => useJungleStore.setState({ status: "idle" })}
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
                  useJungleStore.setState({ status: "idle" });
                }}
              >
                Đổi thể thức
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setModalDismissed(true)}
              className="mt-4 text-xs text-muted transition-colors hover:text-parchment"
            >
              Đóng và xem lại bàn cờ
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
