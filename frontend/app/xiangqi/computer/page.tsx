"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import XiangqiBoard from "@/components/xiangqi/XiangqiBoard";
import XqPlayerCard from "@/components/xiangqi/XqPlayerCard";
import MoveList from "@/components/game/MoveList";
import GameControls from "@/components/game/GameControls";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import SoundToggle from "@/components/ui/SoundToggle";
import AmbientMusicToggle from "@/components/ui/AmbientMusicToggle";
import { useXiangqiStore } from "@/stores/xiangqiStore";
import { trackXqPieces } from "@/lib/xiangqi/tracker";
import {
  playXqMoveSound,
  xqCapturedChars,
  xqResultTitle,
  XQ_TERMINATION_LABELS,
} from "@/lib/xiangqi/labels";
import { useXqEngine, type XqEngineMove, type XqRequestKind } from "@/lib/xiangqi/useXqEngine";
import type { XqEngineLevel } from "@/lib/xiangqi/xiangqi.worker";
import type { XqColor } from "@/lib/xiangqi/rules";
import { TIME_CONTROLS, type TimeControl } from "@/lib/types";
import { useXqClockTicker } from "@/lib/xiangqi/useXqClock";

const LEVELS: { level: XqEngineLevel; name: string; detail: string }[] = [
  { level: 1, name: "Người mới", detail: "Độ sâu 1, hay ngẫu hứng" },
  { level: 2, name: "Dễ", detail: "Độ sâu 2, thi thoảng sơ hở" },
  { level: 3, name: "Trung bình", detail: "Độ sâu 3, chắc tay" },
  { level: 4, name: "Khó", detail: "1 giây mỗi nước" },
  { level: 5, name: "Rất khó", detail: "2,5 giây mỗi nước" },
];

type ColorChoice = "r" | "b" | "random";

export default function XiangqiComputerPage() {
  const status = useXiangqiStore((s) => s.status);
  const moves = useXiangqiStore((s) => s.moves);
  const fens = useXiangqiStore((s) => s.fens);
  const viewIndex = useXiangqiStore((s) => s.viewIndex);
  const turn = useXiangqiStore((s) => s.turn);
  const result = useXiangqiStore((s) => s.result);
  const orientation = useXiangqiStore((s) => s.orientation);
  const timeControl = useXiangqiStore((s) => s.timeControl);
  const redMs = useXiangqiStore((s) => s.redMs);
  const blackMs = useXiangqiStore((s) => s.blackMs);
  const clockRunning = useXiangqiStore((s) => s.clockRunning);

  const [level, setLevel] = useState<XqEngineLevel>(3);
  const [colorChoice, setColorChoice] = useState<ColorChoice>("r");
  const [pendingClock, setPendingClock] = useState<TimeControl | null>(null);
  const [playerColor, setPlayerColor] = useState<XqColor>("r");
  const [thinking, setThinking] = useState(false);
  const [hintEnabled, setHintEnabled] = useState(false);
  const [hintLoading, setHintLoading] = useState(false);
  const [hint, setHint] = useState<{ from: string; to: string } | null>(null);
  const [modalDismissed, setModalDismissed] = useState(false);

  const engineColor: XqColor = playerColor === "r" ? "b" : "r";
  const isLive = viewIndex === moves.length;

  useEffect(() => {
    useXiangqiStore.setState({ status: "idle" });
  }, []);

  useXqClockTicker();

  const handleEngineResult = useCallback(
    (kind: XqRequestKind, em: XqEngineMove) => {
      if (kind === "hint") {
        setHintLoading(false);
        setHint({ from: em.uci.slice(0, 2), to: em.uci.slice(2, 4) });
        return;
      }
      setThinking(false);
      const move = useXiangqiStore
        .getState()
        .tryMove(em.uci.slice(0, 2), em.uci.slice(2, 4), true);
      if (move) {
        const st = useXiangqiStore.getState();
        playXqMoveSound(
          !!move.captured,
          st.inCheckSquare(st.moves.length) !== null,
          st.status === "over",
        );
      }
    },
    [],
  );

  const engine = useXqEngine(handleEngineResult);

  // đến lượt máy → yêu cầu tìm nước (suy nghĩ tối thiểu 300ms);
  // kèm lịch sử thế cờ để engine xử lý đúng luật lặp thế
  useEffect(() => {
    if (status !== "playing" || turn !== engineColor || thinking) return;
    setThinking(true);
    const history = fens
      .slice(0, moves.length)
      .map((f) => f.split(" ").slice(0, 2).join(" "));
    engine.request(fens[moves.length], level, "move", 300, history);
  }, [status, turn, engineColor, thinking, engine, fens, moves.length, level]);

  // ván kết thúc trong lúc máy nghĩ → dừng engine
  useEffect(() => {
    if (status !== "over") return;
    engine.stop();
    setThinking(false);
    setHintLoading(false);
  }, [status, engine]);

  // gợi ý
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
    engine.request(fens[moves.length], 3, "hint");
  }, [hintEnabled, status, turn, playerColor, isLive, hintLoading, hint, engine, fens, moves.length]);

  const movesLenRef = useRef(moves.length);
  useEffect(() => {
    if (moves.length !== movesLenRef.current) {
      movesLenRef.current = moves.length;
      setHint(null);
    }
  }, [moves.length]);

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

  const handleMove = (from: string, to: string) => {
    if (turn !== playerColor) return;
    if (hintLoading) {
      engine.stop();
      setHintLoading(false);
    }
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
    const resolved: XqColor =
      colorChoice === "random" ? (Math.random() < 0.5 ? "r" : "b") : colorChoice;
    setPlayerColor(resolved);
    setThinking(false);
    setHint(null);
    setHintLoading(false);
    setModalDismissed(false);
    engine.stop();
    useXiangqiStore.getState().newGame({
      timeControl: pendingClock,
      orientation: resolved === "r" ? "red" : "black",
      autoFlip: false,
    });
  };

  const handleUndo = () => {
    const st = useXiangqiStore.getState();
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
          Cờ tướng - đấu với máy
        </h1>
        <p className="mt-2 max-w-lg text-sm text-muted">
          Engine cờ tướng chạy ngay trong trình duyệt và có thể chơi khi không có mạng.
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

          <p className="mt-6 text-sm font-medium">Quân của bạn</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(
              [
                ["r", "帥 Đỏ (đi trước)"],
                ["b", "將 Đen"],
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

  const boardWidth = { width: "min(66vh, 560px)", maxWidth: "calc(100vw - 32px)" };
  const topColor: XqColor = orientation === "red" ? "b" : "r";
  const bottomColor: XqColor = orientation === "red" ? "r" : "b";

  const card = (color: XqColor) => (
    <XqPlayerCard
      name={color === engineColor ? `Máy - ${levelInfo.name}` : "Bạn"}
      subtitle={color === engineColor ? `Mức ${level}` : undefined}
      color={color}
      clockMs={timeControl ? (color === "r" ? redMs : blackMs) : null}
      clockActive={status === "playing" && clockRunning && turn === color}
      thinking={color === engineColor && thinking}
      capturedChars={xqCapturedChars(moves, viewIndex, color === "r" ? "b" : "r")}
    />
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
        <div className="flex flex-col gap-3">
          <div style={boardWidth}>{card(topColor)}</div>
          <XiangqiBoard
            pieces={pieces}
            turn={turn}
            orientation={orientation}
            interactive={status === "playing" && isLive}
            movableColor={playerColor}
            legalMovesFrom={(sq) => useXiangqiStore.getState().legalMovesFrom(sq)}
            onMove={handleMove}
            lastMove={lastMove}
            checkSquare={checkSquare}
            hint={hint}
          />
          <div style={boardWidth}>{card(bottomColor)}</div>
        </div>

        <aside className="flex w-full max-w-sm flex-col gap-3 lg:h-[min(73vh,620px)] lg:w-72 lg:self-center">
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
              onResign={() => useXiangqiStore.getState().resign(playerColor)}
              resignDisabled={status !== "playing"}
              onNewGame={() => {
                engine.stop();
                setThinking(false);
                useXiangqiStore.setState({ status: "idle" });
              }}
            />
            <div className="flex items-center gap-1">
              <AmbientMusicToggle />
              <SoundToggle />
            </div>
          </div>
          <MoveList
            moves={moves}
            viewIndex={viewIndex}
            onSelect={(i) => useXiangqiStore.getState().setView(i)}
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
                  engine.stop();
                  setThinking(false);
                  useXiangqiStore.setState({ status: "idle" });
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
