"use client";

import { useEffect, useMemo, useState } from "react";
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
import { oqBoardAt } from "@/lib/oanquan/tracker";
import { TIME_CONTROLS, type TimeControl } from "@/lib/types";
import type { OqColor } from "@/lib/oanquan/rules";

export default function OanquanLocalPage() {
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

  const [pendingClock, setPendingClock] = useState<TimeControl | null>(null);
  const [modalDismissed, setModalDismissed] = useState(false);

  useEffect(() => {
    useOanquanStore.setState({ status: "idle" });
  }, []);

  const board = useMemo(() => oqBoardAt(moves, viewIndex), [moves, viewIndex]);
  const lastMove = viewIndex > 0 ? moves[viewIndex - 1] : null;
  const isLive = viewIndex === moves.length;
  const interactive = status === "playing" && isLive;

  const handleMove = (uci: string) => {
    const move = useOanquanStore.getState().tryMove(uci);
    if (!move) return;
    playOqMoveSound(
      move.gained > 0,
      useOanquanStore.getState().status === "over",
    );
  };

  const startGame = () => {
    setModalDismissed(false);
    useOanquanStore.getState().newGame({ timeControl: pendingClock });
  };

  const card = (color: OqColor) => (
    <OanquanPlayerCard
      name={color === "a" ? "Đỏ (đi trước)" : "Xanh"}
      color={color}
      clockMs={timeControl ? (color === "a" ? aMs : bMs) : null}
      clockActive={status === "playing" && clockRunning && turn === color}
      store={color === "a" ? board.storeA : board.storeB}
    />
  );

  if (status === "idle") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Ô ăn quan — hai người một máy
        </h1>
        <p className="mt-2 max-w-lg text-sm text-muted">
          Rải sỏi quanh 12 ô, ăn cách ô, hết quan tàn dân đếm điểm. Đỏ cầm hàng
          dưới và đi trước.
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
          {card("b")}
          <OanquanBoard
            dan={board.dan}
            quanLeft={board.quanLeft}
            quanRight={board.quanRight}
            turn={board.turn}
            interactive={interactive}
            movableColor="both"
            onMove={handleMove}
            lastMove={lastMove}
            hint={null}
          />
          {card("a")}
        </div>

        <aside className="flex w-full flex-col gap-3 lg:w-72">
          <div className="flex items-center justify-between">
            <GameControls
              onUndo={() => useOanquanStore.getState().undo(1)}
              undoDisabled={status !== "playing" || moves.length === 0}
              onNewGame={() => useOanquanStore.setState({ status: "idle" })}
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
              {result.winner === null ? "½–½" : "🌾"}
            </span>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold">
              {oqResultTitle(result.winner, result.termination)}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {OQ_TERMINATION_LABELS[result.termination] ?? result.termination}
            </p>
            {result.scoreA !== undefined && result.scoreB !== undefined && (
              <p className="mt-2 font-[family-name:var(--font-mono)] text-sm text-parchment/90">
                {oqSideName("a")} {result.scoreA} — {result.scoreB}{" "}
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
                  useOanquanStore.setState({ status: "idle" });
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
