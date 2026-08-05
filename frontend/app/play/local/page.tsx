"use client";

import { useEffect, useState } from "react";
import type { PieceSymbol, Square } from "chess.js";
import ChessBoard from "@/components/board/ChessBoard";
import PlayerCard from "@/components/game/PlayerCard";
import MoveList from "@/components/game/MoveList";
import GameControls from "@/components/game/GameControls";
import GameOverModal from "@/components/game/GameOverModal";
import Button from "@/components/ui/Button";
import SoundToggle from "@/components/ui/SoundToggle";
import { useGameStore } from "@/stores/gameStore";
import { useGameDerived, useClockTicker } from "@/lib/useGameDerived";
import { playMoveSound } from "@/lib/sounds";
import { TIME_CONTROLS, type TimeControl } from "@/lib/types";

export default function LocalPlayPage() {
  const status = useGameStore((s) => s.status);
  const moves = useGameStore((s) => s.moves);
  const viewIndex = useGameStore((s) => s.viewIndex);
  const turn = useGameStore((s) => s.turn);
  const result = useGameStore((s) => s.result);
  const orientation = useGameStore((s) => s.orientation);
  const autoFlip = useGameStore((s) => s.autoFlip);
  const timeControl = useGameStore((s) => s.timeControl);
  const whiteMs = useGameStore((s) => s.whiteMs);
  const blackMs = useGameStore((s) => s.blackMs);
  const clockRunning = useGameStore((s) => s.clockRunning);

  const { pieces, lastMove, checkSquare, captured } = useGameDerived();
  useClockTicker();

  const [pendingClock, setPendingClock] = useState<TimeControl | null>(null);
  const [modalDismissed, setModalDismissed] = useState(false);

  // Store dùng chung giữa các chế độ - vào trang thì bắt đầu từ màn cấu hình
  useEffect(() => {
    useGameStore.setState({ status: "idle" });
  }, []);

  const isLive = viewIndex === moves.length;
  const interactive = status === "playing" && isLive;

  const handleMove = (from: Square, to: Square, promotion?: PieceSymbol) => {
    const move = useGameStore.getState().tryMove(from, to, promotion);
    if (!move) return;
    playMoveSound(move, useGameStore.getState().status === "over");
  };

  const startGame = () => {
    setModalDismissed(false);
    useGameStore.getState().newGame({
      timeControl: pendingClock,
      orientation: "white",
      autoFlip: true,
    });
  };

  const topColor = orientation === "white" ? "b" : "w";
  const bottomColor = orientation === "white" ? "w" : "b";

  const card = (color: "w" | "b") => (
    <PlayerCard
      name={color === "w" ? "Trắng" : "Đen"}
      color={color}
      clockMs={timeControl ? (color === "w" ? whiteMs : blackMs) : null}
      clockActive={status === "playing" && clockRunning && turn === color}
      capturedTypes={color === "w" ? captured.byWhite : captured.byBlack}
      materialDiff={color === "w" ? captured.whiteDiff : captured.blackDiff}
    />
  );

  if (status === "idle") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Hai người một máy
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
        <div className="flex flex-col gap-3">
          <div
            className="w-full"
            style={{ width: "min(80vh, 640px)", maxWidth: "calc(100vw - 32px)" }}
          >
            {card(topColor)}
          </div>
          <ChessBoard
            pieces={pieces}
            turn={turn}
            orientation={orientation}
            interactive={interactive}
            movableColor="both"
            legalMovesFrom={(sq) => useGameStore.getState().legalMovesFrom(sq)}
            onMove={handleMove}
            lastMove={lastMove}
            checkSquare={checkSquare}
          />
          <div
            className="w-full"
            style={{ width: "min(80vh, 640px)", maxWidth: "calc(100vw - 32px)" }}
          >
            {card(bottomColor)}
          </div>
        </div>

        <aside className="flex w-full max-w-sm flex-col gap-3 lg:h-[min(80vh,640px)] lg:w-72 lg:self-center">
          <div className="flex items-center justify-between">
            <GameControls
              onUndo={() => useGameStore.getState().undo(1)}
              undoDisabled={status !== "playing" || moves.length === 0}
              onFlip={() => useGameStore.getState().flip()}
              autoFlip={autoFlip}
              onToggleAutoFlip={(v) => useGameStore.getState().setAutoFlip(v)}
              onNewGame={() => useGameStore.setState({ status: "idle" })}
            />
            <SoundToggle />
          </div>
          <MoveList
            moves={moves}
            viewIndex={viewIndex}
            onSelect={(i) => useGameStore.getState().setView(i)}
          />
        </aside>
      </div>

      <GameOverModal
        result={result}
        open={status === "over" && !modalDismissed}
        onClose={() => setModalDismissed(true)}
        actions={[
          {
            label: "Chơi lại",
            primary: true,
            onClick: () => {
              setModalDismissed(false);
              useGameStore
                .getState()
                .newGame({ timeControl: timeControl });
            },
          },
          {
            label: "Đổi thể thức",
            onClick: () => {
              setModalDismissed(false);
              useGameStore.setState({ status: "idle" });
            },
          },
        ]}
      />
    </div>
  );
}
