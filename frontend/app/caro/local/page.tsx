"use client";

import { useEffect, useMemo, useState } from "react";
import CaroBoard from "@/components/caro/CaroBoard";
import CaroPlayerCard from "@/components/caro/CaroPlayerCard";
import MoveList from "@/components/game/MoveList";
import GameControls from "@/components/game/GameControls";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import SoundToggle from "@/components/ui/SoundToggle";
import { useCaroStore } from "@/stores/caroStore";
import { useCaroClockTicker } from "@/lib/caro/useCaroClock";
import {
  caroResultTitle,
  CARO_TERMINATION_LABELS,
  playCaroMoveSound,
} from "@/lib/caro/labels";
import { TIME_CONTROLS, type TimeControl } from "@/lib/types";
import type { CaroColor } from "@/lib/caro/rules";

export default function CaroLocalPage() {
  const status = useCaroStore((s) => s.status);
  const moves = useCaroStore((s) => s.moves);
  const viewIndex = useCaroStore((s) => s.viewIndex);
  const turn = useCaroStore((s) => s.turn);
  const result = useCaroStore((s) => s.result);
  const timeControl = useCaroStore((s) => s.timeControl);
  const xMs = useCaroStore((s) => s.xMs);
  const oMs = useCaroStore((s) => s.oMs);
  const clockRunning = useCaroStore((s) => s.clockRunning);

  useCaroClockTicker();

  const [pendingClock, setPendingClock] = useState<TimeControl | null>(null);
  const [modalDismissed, setModalDismissed] = useState(false);

  useEffect(() => {
    useCaroStore.setState({ status: "idle" });
  }, []);

  const stones = useMemo(() => moves.slice(0, viewIndex), [moves, viewIndex]);
  const lastMove =
    viewIndex > 0
      ? { x: moves[viewIndex - 1].x, y: moves[viewIndex - 1].y }
      : null;
  const isLive = viewIndex === moves.length;
  const interactive = status === "playing" && isLive;

  const handleMove = (uci: string) => {
    const move = useCaroStore.getState().tryMove(uci);
    if (!move) return;
    playCaroMoveSound(useCaroStore.getState().status === "over");
  };

  const startGame = () => {
    setModalDismissed(false);
    useCaroStore.getState().newGame({ timeControl: pendingClock });
  };

  const card = (color: CaroColor) => (
    <CaroPlayerCard
      name={color === "x" ? "X (đi trước)" : "O"}
      color={color}
      clockMs={timeControl ? (color === "x" ? xMs : oMs) : null}
      clockActive={status === "playing" && clockRunning && turn === color}
    />
  );

  if (status === "idle") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Cờ caro — hai người một máy
        </h1>
        <p className="mt-2 max-w-lg text-sm text-muted">
          Bàn 200×200, nối đủ 5 quân liên tiếp là thắng. Kéo bàn để di chuyển,
          lăn chuột để phóng to.
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            {card("x")}
            {card("o")}
          </div>
          <CaroBoard
            stones={stones}
            turn={turn}
            interactive={interactive}
            movableColor="both"
            onMove={handleMove}
            lastMove={lastMove}
            winLine={isLive ? (result?.line ?? null) : null}
            hint={null}
          />
        </div>

        <aside className="flex w-full flex-col gap-3 lg:w-72">
          <div className="flex items-center justify-between">
            <GameControls
              onUndo={() => useCaroStore.getState().undo(1)}
              undoDisabled={status !== "playing" || moves.length === 0}
              onNewGame={() => useCaroStore.setState({ status: "idle" })}
            />
            <SoundToggle />
          </div>
          <MoveList
            moves={moves}
            viewIndex={viewIndex}
            onSelect={(i) => useCaroStore.getState().setView(i)}
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
              {result.winner === null ? "½–½" : result.winner === "x" ? "✕" : "○"}
            </span>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold">
              {caroResultTitle(result.winner, result.termination)}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {CARO_TERMINATION_LABELS[result.termination] ?? result.termination}
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Button variant="primary" onClick={startGame}>
                Chơi lại
              </Button>
              <Button
                onClick={() => {
                  setModalDismissed(false);
                  useCaroStore.setState({ status: "idle" });
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
