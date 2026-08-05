"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Color, PieceSymbol, Square } from "chess.js";
import ChessBoard from "@/components/board/ChessBoard";
import EvalBar from "@/components/board/EvalBar";
import PlayerCard from "@/components/game/PlayerCard";
import MoveList from "@/components/game/MoveList";
import GameControls from "@/components/game/GameControls";
import GameOverModal from "@/components/game/GameOverModal";
import Button from "@/components/ui/Button";
import SoundToggle from "@/components/ui/SoundToggle";
import { useGameStore } from "@/stores/gameStore";
import { useGameDerived, useClockTicker } from "@/lib/useGameDerived";
import { playMoveSound } from "@/lib/sounds";
import { useEngine, type EngineMove, type RequestKind } from "@/lib/engine/useEngine";
import type { EngineLevel } from "@/lib/engine/engine.worker";
import { TIME_CONTROLS, type TimeControl } from "@/lib/types";

const LEVELS: { level: EngineLevel; name: string; detail: string }[] = [
  { level: 1, name: "Người mới", detail: "Độ sâu 1, hay ngẫu hứng" },
  { level: 2, name: "Dễ", detail: "Độ sâu 2, thi thoảng sơ hở" },
  { level: 3, name: "Trung bình", detail: "Độ sâu 3, chắc tay" },
  { level: 4, name: "Khó", detail: "1 giây mỗi nước" },
  { level: 5, name: "Rất khó", detail: "2,5 giây + sổ khai cuộc" },
];

type ColorChoice = "w" | "b" | "random";

export default function ComputerPlayPage() {
  const status = useGameStore((s) => s.status);
  const moves = useGameStore((s) => s.moves);
  const fens = useGameStore((s) => s.fens);
  const viewIndex = useGameStore((s) => s.viewIndex);
  const turn = useGameStore((s) => s.turn);
  const result = useGameStore((s) => s.result);
  const orientation = useGameStore((s) => s.orientation);
  const timeControl = useGameStore((s) => s.timeControl);
  const whiteMs = useGameStore((s) => s.whiteMs);
  const blackMs = useGameStore((s) => s.blackMs);
  const clockRunning = useGameStore((s) => s.clockRunning);

  const { pieces, lastMove, checkSquare, captured } = useGameDerived();
  useClockTicker();

  // Cấu hình trước ván
  const [level, setLevel] = useState<EngineLevel>(3);
  const [colorChoice, setColorChoice] = useState<ColorChoice>("w");
  const [pendingClock, setPendingClock] = useState<TimeControl | null>(null);
  const [playerColor, setPlayerColor] = useState<Color>("w");

  const [thinking, setThinking] = useState(false);
  const [hintEnabled, setHintEnabled] = useState(false);
  const [hintLoading, setHintLoading] = useState(false);
  const [hint, setHint] = useState<{ from: Square; to: Square } | null>(null);
  const [evalCp, setEvalCp] = useState(0);
  const [modalDismissed, setModalDismissed] = useState(false);

  const engineColor: Color = playerColor === "w" ? "b" : "w";
  const isLive = viewIndex === moves.length;

  // Store dùng chung giữa các chế độ - vào trang thì bắt đầu từ màn cấu hình
  useEffect(() => {
    useGameStore.setState({ status: "idle" });
  }, []);

  const handleEngineResult = useCallback(
    (kind: RequestKind, engineMove: EngineMove) => {
      if (kind === "hint") {
        setHintLoading(false);
        setHint({
          from: engineMove.uci.slice(0, 2) as Square,
          to: engineMove.uci.slice(2, 4) as Square,
        });
        return;
      }
      setThinking(false);
      setEvalCp(engineMove.evaluation);
      // force: áp nước của máy cả khi người chơi đang tua xem lịch sử
      const move = useGameStore
        .getState()
        .tryMove(
          engineMove.uci.slice(0, 2) as Square,
          engineMove.uci.slice(2, 4) as Square,
          (engineMove.uci[4] as PieceSymbol | undefined) ?? undefined,
          true,
        );
      if (move) playMoveSound(move, useGameStore.getState().status === "over");
    },
    [],
  );

  const engine = useEngine(handleEngineResult, (_depth, evaluation) => {
    setEvalCp(evaluation);
  });

  // Đến lượt máy → gửi yêu cầu tìm nước (suy nghĩ tối thiểu 300ms).
  // Không phụ thuộc isLive: máy vẫn nghĩ trong lúc người chơi tua lịch sử.
  useEffect(() => {
    if (status !== "playing" || turn !== engineColor || thinking) return;
    setThinking(true);
    engine.request(fens[moves.length], level, "move", 300);
  }, [status, turn, engineColor, thinking, engine, fens, moves.length, level]);

  // Ván kết thúc (hết giờ, đầu hàng...) trong lúc máy đang nghĩ → dừng engine
  useEffect(() => {
    if (status !== "over") return;
    engine.stop();
    setThinking(false);
    setHintLoading(false);
  }, [status, engine]);

  // Bật gợi ý: engine chạy ở độ sâu 3 khi đến lượt người chơi
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
  }, [
    hintEnabled,
    status,
    turn,
    playerColor,
    isLive,
    hintLoading,
    hint,
    engine,
    fens,
    moves.length,
  ]);

  // Nước mới → gợi ý cũ hết hiệu lực
  const movesLenRef = useRef(moves.length);
  useEffect(() => {
    if (moves.length !== movesLenRef.current) {
      movesLenRef.current = moves.length;
      setHint(null);
    }
  }, [moves.length]);

  const handleMove = (from: Square, to: Square, promotion?: PieceSymbol) => {
    if (turn !== playerColor) return;
    if (hintLoading) {
      engine.stop();
      setHintLoading(false);
    }
    const move = useGameStore.getState().tryMove(from, to, promotion);
    if (!move) return;
    playMoveSound(move, useGameStore.getState().status === "over");
  };

  const startGame = () => {
    const resolved: Color =
      colorChoice === "random" ? (Math.random() < 0.5 ? "w" : "b") : colorChoice;
    setPlayerColor(resolved);
    setThinking(false);
    setHint(null);
    setHintLoading(false);
    setEvalCp(0);
    setModalDismissed(false);
    engine.stop();
    useGameStore.getState().newGame({
      timeControl: pendingClock,
      orientation: resolved === "w" ? "white" : "black",
      autoFlip: false,
    });
  };

  // Hoàn tác: lùi nước của máy và nước của mình
  const handleUndo = () => {
    const st = useGameStore.getState();
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
          Đấu với máy
        </h1>
        <p className="mt-2 max-w-lg text-sm text-muted">
          Engine chạy ngay trong trình duyệt của bạn và có thể chơi khi không có mạng.
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
                ["w", "♔ Trắng"],
                ["b", "♚ Đen"],
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

  const boardWidth = { width: "min(80vh, 640px)", maxWidth: "calc(100vw - 32px)" };

  const card = (color: Color) =>
    color === engineColor ? (
      <PlayerCard
        name={`Máy - ${levelInfo.name}`}
        subtitle={`Mức ${level}`}
        color={color}
        clockMs={timeControl ? (color === "w" ? whiteMs : blackMs) : null}
        clockActive={status === "playing" && clockRunning && turn === color}
        thinking={thinking}
        capturedTypes={color === "w" ? captured.byWhite : captured.byBlack}
        materialDiff={color === "w" ? captured.whiteDiff : captured.blackDiff}
      />
    ) : (
      <PlayerCard
        name="Bạn"
        color={color}
        clockMs={timeControl ? (color === "w" ? whiteMs : blackMs) : null}
        clockActive={status === "playing" && clockRunning && turn === color}
        capturedTypes={color === "w" ? captured.byWhite : captured.byBlack}
        materialDiff={color === "w" ? captured.whiteDiff : captured.blackDiff}
      />
    );

  const topColor: Color = orientation === "white" ? "b" : "w";
  const bottomColor: Color = orientation === "white" ? "w" : "b";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
        <div className="flex flex-col gap-3">
          <div style={boardWidth}>{card(topColor)}</div>
          <div className="flex items-stretch gap-3">
            <div className="hidden self-stretch md:block">
              <EvalBar evaluation={evalCp} orientation={orientation} />
            </div>
            <ChessBoard
              pieces={pieces}
              turn={turn}
              orientation={orientation}
              interactive={status === "playing" && isLive}
              movableColor={playerColor}
              legalMovesFrom={(sq) => useGameStore.getState().legalMovesFrom(sq)}
              onMove={handleMove}
              lastMove={lastMove}
              checkSquare={checkSquare}
              hint={hint}
            />
          </div>
          <div style={boardWidth}>{card(bottomColor)}</div>
        </div>

        <aside className="flex w-full max-w-sm flex-col gap-3 lg:h-[min(80vh,640px)] lg:w-72 lg:self-center">
          <div className="flex items-center justify-between gap-2">
            <GameControls
              onUndo={handleUndo}
              undoDisabled={status !== "playing" || moves.length === 0}
              onHint={() => {
                setHintEnabled((v) => !v);
                if (hintEnabled) {
                  // đang bật → tắt: huỷ cả yêu cầu gợi ý đang tính
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
              onResign={() => useGameStore.getState().resign(playerColor)}
              resignDisabled={status !== "playing"}
              onNewGame={() => {
                engine.stop();
                setThinking(false);
                useGameStore.setState({ status: "idle" });
              }}
              newGameLabel="Ván mới"
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
          { label: "Chơi lại", primary: true, onClick: startGame },
          {
            label: "Đổi cấu hình",
            onClick: () => {
              setModalDismissed(false);
              engine.stop();
              setThinking(false);
              useGameStore.setState({ status: "idle" });
            },
          },
        ]}
      />
    </div>
  );
}
