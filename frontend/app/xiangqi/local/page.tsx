"use client";

import { useEffect, useMemo, useState } from "react";
import XiangqiBoard from "@/components/xiangqi/XiangqiBoard";
import XqPlayerCard from "@/components/xiangqi/XqPlayerCard";
import MoveList from "@/components/game/MoveList";
import GameControls from "@/components/game/GameControls";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import SoundToggle from "@/components/ui/SoundToggle";
import { useXiangqiStore } from "@/stores/xiangqiStore";
import { trackXqPieces } from "@/lib/xiangqi/tracker";
import {
  playXqMoveSound,
  xqCapturedChars,
  xqResultTitle,
  XQ_TERMINATION_LABELS,
} from "@/lib/xiangqi/labels";
import { TIME_CONTROLS, type TimeControl } from "@/lib/types";
import type { XqColor } from "@/lib/xiangqi/rules";
import { useXqClockTicker } from "@/lib/xiangqi/useXqClock";

export default function XiangqiLocalPage() {
  const status = useXiangqiStore((s) => s.status);
  const moves = useXiangqiStore((s) => s.moves);
  const viewIndex = useXiangqiStore((s) => s.viewIndex);
  const turn = useXiangqiStore((s) => s.turn);
  const result = useXiangqiStore((s) => s.result);
  const orientation = useXiangqiStore((s) => s.orientation);
  const autoFlip = useXiangqiStore((s) => s.autoFlip);
  const timeControl = useXiangqiStore((s) => s.timeControl);
  const redMs = useXiangqiStore((s) => s.redMs);
  const blackMs = useXiangqiStore((s) => s.blackMs);
  const clockRunning = useXiangqiStore((s) => s.clockRunning);

  useXqClockTicker();

  const [pendingClock, setPendingClock] = useState<TimeControl | null>(null);
  const [modalDismissed, setModalDismissed] = useState(false);

  useEffect(() => {
    useXiangqiStore.setState({ status: "idle" });
  }, []);

  const pieces = useMemo(() => trackXqPieces(moves, viewIndex), [moves, viewIndex]);
  const lastMove =
    viewIndex > 0
      ? { from: moves[viewIndex - 1].from, to: moves[viewIndex - 1].to }
      : null;
  const checkSquare = useMemo(
    () => useXiangqiStore.getState().inCheckSquare(viewIndex),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [moves, viewIndex],
  );

  const isLive = viewIndex === moves.length;
  const interactive = status === "playing" && isLive;

  const handleMove = (from: string, to: string) => {
    const move = useXiangqiStore.getState().tryMove(from, to);
    if (!move) return;
    const st = useXiangqiStore.getState();
    playXqMoveSound(
      !!move.captured,
      st.inCheckSquare(st.moves.length) !== null,
      st.status === "over",
    );
  };

  const startGame = () => {
    setModalDismissed(false);
    useXiangqiStore.getState().newGame({
      timeControl: pendingClock,
      orientation: "red",
      autoFlip: true,
    });
  };

  const card = (color: XqColor) => (
    <XqPlayerCard
      name={color === "r" ? "Đỏ" : "Đen"}
      color={color}
      clockMs={timeControl ? (color === "r" ? redMs : blackMs) : null}
      clockActive={status === "playing" && clockRunning && turn === color}
      capturedChars={xqCapturedChars(moves, viewIndex, color === "r" ? "b" : "r")}
    />
  );

  if (status === "idle") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Cờ tướng - hai người một máy
        </h1>
        <p className="mt-2 max-w-lg text-sm text-muted">
          Thay phiên nhau trên cùng thiết bị. Bàn cờ tự xoay về phía người đang
          đi - có thể tắt nếu muốn giữ nguyên hướng.
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

  const boardWidth = { width: "min(66vh, 560px)", maxWidth: "calc(100vw - 32px)" };
  const topColor: XqColor = orientation === "red" ? "b" : "r";
  const bottomColor: XqColor = orientation === "red" ? "r" : "b";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
        <div className="flex flex-col gap-3">
          <div style={boardWidth}>{card(topColor)}</div>
          <XiangqiBoard
            pieces={pieces}
            turn={turn}
            orientation={orientation}
            interactive={interactive}
            movableColor="both"
            legalMovesFrom={(sq) => useXiangqiStore.getState().legalMovesFrom(sq)}
            onMove={handleMove}
            lastMove={lastMove}
            checkSquare={checkSquare}
          />
          <div style={boardWidth}>{card(bottomColor)}</div>
        </div>

        <aside className="flex w-full max-w-sm flex-col gap-3 lg:h-[min(73vh,620px)] lg:w-72 lg:self-center">
          <div className="flex items-center justify-between">
            <GameControls
              onUndo={() => useXiangqiStore.getState().undo(1)}
              undoDisabled={status !== "playing" || moves.length === 0}
              onFlip={() => useXiangqiStore.getState().flip()}
              autoFlip={autoFlip}
              onToggleAutoFlip={(v) => useXiangqiStore.getState().setAutoFlip(v)}
              onNewGame={() => useXiangqiStore.setState({ status: "idle" })}
            />
            <SoundToggle />
          </div>
          <MoveList
            moves={moves}
            viewIndex={viewIndex}
            onSelect={(i) => useXiangqiStore.getState().setView(i)}
          />
        </aside>
      </div>

      <Modal open={status === "over" && !modalDismissed} onClose={() => setModalDismissed(true)}>
        {result && (
          <div className="text-center">
            <span aria-hidden className="text-2xl leading-none">
              {result.winner === null ? "½-½" : result.winner === "r" ? "1-0" : "0-1"}
            </span>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold">
              {xqResultTitle(result.winner, result.termination)}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {XQ_TERMINATION_LABELS[result.termination] ?? result.termination}
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Button variant="primary" onClick={startGame}>
                Chơi lại
              </Button>
              <Button
                onClick={() => {
                  setModalDismissed(false);
                  useXiangqiStore.setState({ status: "idle" });
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
