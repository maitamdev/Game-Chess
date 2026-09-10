"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Chess, type Color, type Move } from "chess.js";
import ChessBoard from "@/components/board/ChessBoard";
import XiangqiBoard from "@/components/xiangqi/XiangqiBoard";
import XqPlayerCard from "@/components/xiangqi/XqPlayerCard";
import MoveList from "@/components/game/MoveList";
import ArcadeReview, { type ArcadeReviewVariant } from "@/components/game/ArcadeReview";
import PlayerCard from "@/components/game/PlayerCard";
import Button from "@/components/ui/Button";
import { api, API_URL, type GameDetail } from "@/lib/api";
import { trackPieces } from "@/lib/pieceTracker";
import { Xiangqi, type XqColor, type XqMove } from "@/lib/xiangqi/rules";
import { trackXqPieces } from "@/lib/xiangqi/tracker";
import { xqResultTitle, XQ_TERMINATION_LABELS } from "@/lib/xiangqi/labels";
import CaroBoard from "@/components/caro/CaroBoard";
import CaroPlayerCard from "@/components/caro/CaroPlayerCard";
import { Caro, type CaroColor, type CaroMove } from "@/lib/caro/rules";
import { caroResultTitle, CARO_TERMINATION_LABELS } from "@/lib/caro/labels";
import JungleBoard from "@/components/jungle/JungleBoard";
import JungleGameFrame from "@/components/jungle/JungleGameFrame";
import JunglePlayerCard from "@/components/jungle/JunglePlayerCard";
import { Jungle, type JgColor, type JgMove } from "@/lib/jungle/rules";
import { trackJgPieces } from "@/lib/jungle/tracker";
import {
  jgCapturedRanks,
  jgResultTitle,
  JG_TERMINATION_LABELS,
} from "@/lib/jungle/labels";
import OanquanBoard from "@/components/oanquan/OanquanBoard";
import OanquanPlayerCard from "@/components/oanquan/OanquanPlayerCard";
import { OAnQuan, type OqColor, type OqMove } from "@/lib/oanquan/rules";
import { oqBoardAt } from "@/lib/oanquan/tracker";
import Providers from "@/app/providers";
import {
  oqResultTitle,
  oqSideName,
  OQ_TERMINATION_LABELS,
} from "@/lib/oanquan/labels";
import { TERMINATION_LABELS, resultTitle, type Termination } from "@/lib/types";
import {
  DownloadSimple,
  FastForward,
  Rewind,
} from "@phosphor-icons/react";

/** Đồ thị lợi thế: phân tích nhanh phía client bằng engine tương ứng. */
function useEvalSeries(fens: string[] | null, variant: "chess" | "xiangqi") {
  const [series, setSeries] = useState<number[] | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!fens || fens.length === 0) {
      setSeries(null);
      return;
    }
    const worker =
      variant === "chess"
        ? new Worker(new URL("../../../lib/engine/engine.worker.ts", import.meta.url))
        : new Worker(
            new URL("../../../lib/xiangqi/xiangqi.worker.ts", import.meta.url),
          );
    const evals: number[] = [];
    let index = 0;
    let cancelled = false;

    const requestNext = () => {
      if (cancelled) return;
      if (index >= fens.length) {
        setSeries([...evals]);
        worker.terminate();
        return;
      }
      worker.postMessage({ type: "search", fen: fens[index], level: 2 });
    };

    worker.onmessage = (e: MessageEvent<{ type: string; evaluation?: number }>) => {
      if (e.data.type !== "bestmove") return;
      evals.push(e.data.evaluation ?? 0);
      index++;
      setProgress(index);
      setSeries([...evals]);
      requestNext();
    };
    requestNext();

    return () => {
      cancelled = true;
      worker.terminate();
    };
  }, [fens, variant]);

  return { series, progress };
}

function EvalGraph({
  series,
  total,
  viewIndex,
  onSelect,
}: {
  series: number[] | null;
  total: number;
  viewIndex: number;
  onSelect: (i: number) => void;
}) {
  const W = 560;
  const H = 96;
  const clamp = (cp: number) => Math.max(-600, Math.min(600, cp));
  const x = (i: number) => (total <= 1 ? 0 : (i / total) * W);
  const y = (cp: number) => H / 2 - (clamp(cp) / 600) * (H / 2 - 6);

  const points = (series ?? []).map((cp, i) => `${x(i)},${y(cp)}`).join(" ");
  const area =
    series && series.length > 0
      ? `0,${H / 2} ${points} ${x(series.length - 1)},${H / 2}`
      : "";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full cursor-pointer rounded-[6px] border border-line bg-slate"
      role="img"
      aria-label="Đồ thị lợi thế theo nước đi"
      onClick={(e) => {
        const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
        const i = Math.round(((e.clientX - rect.left) / rect.width) * total);
        onSelect(Math.max(0, Math.min(total, i)));
      }}
    >
      <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="var(--line)" strokeWidth={1} />
      {area && <polygon points={area} fill="#F5EFE3" opacity={0.85} />}
      {series && series.length > 0 && (
        <polyline points={points} fill="none" stroke="var(--brass)" strokeWidth={1.5} />
      )}
      <line
        x1={x(viewIndex)}
        y1={0}
        x2={x(viewIndex)}
        y2={H}
        stroke="var(--brass)"
        strokeWidth={1.5}
        opacity={0.9}
      />
    </svg>
  );
}

function useArrowNav(max: number, setViewIndex: (fn: (i: number) => number) => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setViewIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setViewIndex((i) => Math.min(max, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [max, setViewIndex]);
}

function ReviewHeader({
  game,
  titleText,
  subtitleText,
}: {
  game: GameDetail;
  titleText: string;
  subtitleText: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-lg font-medium">
          {game.white.username} - {game.black.username}
          <span className="ml-2 text-sm text-muted">
            {game.variant === "xiangqi"
            ? "· Cờ tướng"
            : game.variant === "caro"
              ? "· Caro"
              : game.variant === "jungle"
                ? "· Cờ thú"
                : game.variant === "oanquan"
                  ? "· Ô ăn quan"
                  : "· Cờ vua"}
          </span>
        </h1>
        <p className="text-sm text-muted">
          {titleText} · {subtitleText} · {game.time_control}
        </p>
      </div>
      <a href={`${API_URL}/api/games/${game.id}/pgn`} download>
        <Button size="sm">⬇ Tải PGN</Button>
      </a>
    </div>
  );
}

function ChessReview({ game }: { game: GameDetail }) {
  const [viewIndex, setViewIndex] = useState(0);
  const initializedRef = useRef(false);

  const verboseMoves = useMemo(() => {
    const chess = new Chess();
    const moves: Move[] = [];
    for (const m of game.moves) {
      try {
        moves.push(chess.move(m.san));
      } catch {
        break;
      }
    }
    return moves;
  }, [game]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      setViewIndex(verboseMoves.length);
    }
  }, [verboseMoves.length]);

  const fens = useMemo(() => {
    const chess = new Chess();
    const list = [chess.fen()];
    for (const m of verboseMoves) {
      chess.move(m);
      list.push(chess.fen());
    }
    return list;
  }, [verboseMoves]);

  const { series, progress } = useEvalSeries(fens, "chess");
  const pieces = useMemo(
    () => trackPieces(verboseMoves, viewIndex),
    [verboseMoves, viewIndex],
  );
  const lastMove =
    viewIndex > 0
      ? { from: verboseMoves[viewIndex - 1].from, to: verboseMoves[viewIndex - 1].to }
      : null;
  useArrowNav(verboseMoves.length, setViewIndex);

  const boardWidth = { width: "min(72vh, 560px)", maxWidth: "calc(100vw - 32px)" };
  const card = (color: Color) => {
    const player = color === "w" ? game.white : game.black;
    return (
      <PlayerCard
        name={player.username}
        color={color}
        clockMs={null}
        clockActive={false}
        capturedTypes={[]}
        materialDiff={0}
      />
    );
  };

  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
      <div className="flex flex-col gap-3">
        <div style={boardWidth}>{card("b")}</div>
        <div style={boardWidth}>
          <ChessBoard
            pieces={pieces}
            turn={viewIndex % 2 === 0 ? "w" : "b"}
            orientation="white"
            interactive={false}
            movableColor={null}
            legalMovesFrom={() => []}
            onMove={() => {}}
            lastMove={lastMove}
            checkSquare={null}
          />
        </div>
        <div style={boardWidth}>{card("w")}</div>
        <div style={boardWidth}>
          <EvalGraph
            series={series}
            total={verboseMoves.length}
            viewIndex={viewIndex}
            onSelect={setViewIndex}
          />
          {series && progress < (fens?.length ?? 0) && (
            <p className="mt-1 text-xs text-muted">
              Đang phân tích… {progress}/{fens?.length}
            </p>
          )}
        </div>
      </div>
      <aside className="flex w-full max-w-sm flex-col gap-3 lg:w-72 lg:self-start">
        <MoveList moves={verboseMoves} viewIndex={viewIndex} onSelect={setViewIndex} />
        <p className="text-xs text-muted">
          Dùng phím ← → để tua từng nước. Nhấp vào đồ thị để nhảy tới thế cờ.
        </p>
      </aside>
    </div>
  );
}

function XiangqiReview({ game }: { game: GameDetail }) {
  const [viewIndex, setViewIndex] = useState(0);
  const initializedRef = useRef(false);

  const verboseMoves = useMemo(() => {
    const g = new Xiangqi();
    const moves: XqMove[] = [];
    for (const m of game.moves) {
      const mv = g.move(m.uci);
      if (!mv) break;
      moves.push(mv);
    }
    return moves;
  }, [game]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      setViewIndex(verboseMoves.length);
    }
  }, [verboseMoves.length]);

  const fens = useMemo(() => {
    const g = new Xiangqi();
    const list = [g.fen()];
    for (const m of verboseMoves) {
      g.move(m.uci);
      list.push(g.fen());
    }
    return list;
  }, [verboseMoves]);

  const { series, progress } = useEvalSeries(fens, "xiangqi");
  const pieces = useMemo(
    () => trackXqPieces(verboseMoves, viewIndex),
    [verboseMoves, viewIndex],
  );
  const lastMove =
    viewIndex > 0
      ? { from: verboseMoves[viewIndex - 1].from, to: verboseMoves[viewIndex - 1].to }
      : null;
  useArrowNav(verboseMoves.length, setViewIndex);

  const boardWidth = { width: "min(66vh, 560px)", maxWidth: "calc(100vw - 32px)" };
  const card = (color: XqColor) => {
    const player = color === "r" ? game.white : game.black;
    return (
      <XqPlayerCard
        name={player.username}
        color={color}
        clockMs={null}
        clockActive={false}
      />
    );
  };

  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
      <div className="flex flex-col gap-3">
        <div style={boardWidth}>{card("b")}</div>
        <XiangqiBoard
          pieces={pieces}
          turn={viewIndex % 2 === 0 ? "r" : "b"}
          orientation="red"
          interactive={false}
          movableColor={null}
          legalMovesFrom={() => []}
          onMove={() => {}}
          lastMove={lastMove}
          checkSquare={null}
        />
        <div style={boardWidth}>{card("r")}</div>
        <div style={boardWidth}>
          <EvalGraph
            series={series}
            total={verboseMoves.length}
            viewIndex={viewIndex}
            onSelect={setViewIndex}
          />
          {series && progress < (fens?.length ?? 0) && (
            <p className="mt-1 text-xs text-muted">
              Đang phân tích… {progress}/{fens?.length}
            </p>
          )}
        </div>
      </div>
      <aside className="flex w-full max-w-sm flex-col gap-3 lg:w-72 lg:self-start">
        <MoveList moves={verboseMoves} viewIndex={viewIndex} onSelect={setViewIndex} />
        <p className="text-xs text-muted">
          Dùng phím ← → để tua từng nước. Nhấp vào đồ thị để nhảy tới thế cờ.
        </p>
      </aside>
    </div>
  );
}

function CaroReview({ game }: { game: GameDetail }) {
  const [viewIndex, setViewIndex] = useState(0);
  const initializedRef = useRef(false);

  const { verboseMoves, finalGame } = useMemo(() => {
    const g = new Caro();
    const moves: CaroMove[] = [];
    for (const m of game.moves) {
      const mv = g.move(m.uci);
      if (!mv) break;
      moves.push(mv);
    }
    return { verboseMoves: moves, finalGame: g };
  }, [game]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      setViewIndex(verboseMoves.length);
    }
  }, [verboseMoves.length]);

  useArrowNav(verboseMoves.length, setViewIndex);

  const stones = verboseMoves.slice(0, viewIndex);
  const lastMove =
    viewIndex > 0
      ? { x: verboseMoves[viewIndex - 1].x, y: verboseMoves[viewIndex - 1].y }
      : null;
  const winLine =
    viewIndex === verboseMoves.length ? (finalGame.gameEnd()?.line ?? null) : null;

  const card = (color: CaroColor) => {
    const player = color === "x" ? game.white : game.black;
    return (
      <CaroPlayerCard
        name={player.username}
        color={color}
        clockMs={null}
        clockActive={false}
      />
    );
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          {card("x")}
          {card("o")}
        </div>
        <CaroBoard
          stones={stones}
          turn={viewIndex % 2 === 0 ? "x" : "o"}
          interactive={false}
          movableColor={null}
          onMove={() => {}}
          lastMove={lastMove}
          winLine={winLine}
          hint={null}
        />
      </div>
      <aside className="flex w-full flex-col gap-3 lg:w-72">
        <MoveList moves={verboseMoves} viewIndex={viewIndex} onSelect={setViewIndex} />
        <p className="text-xs text-muted">
          Dùng phím ← → để tua từng nước. Kéo bàn để di chuyển, lăn chuột để
          phóng to.
        </p>
      </aside>
    </div>
  );
}

function JungleReview({
  game,
  titleText,
  subtitleText,
}: {
  game: GameDetail;
  titleText: string;
  subtitleText: string;
}) {
  const [viewIndex, setViewIndex] = useState(0);
  const initializedRef = useRef(false);

  const verboseMoves = useMemo(() => {
    const g = new Jungle();
    const moves: JgMove[] = [];
    for (const m of game.moves) {
      const mv = g.move(m.uci);
      if (!mv) break;
      moves.push(mv);
    }
    return moves;
  }, [game]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      setViewIndex(verboseMoves.length);
    }
  }, [verboseMoves.length]);

  useArrowNav(verboseMoves.length, setViewIndex);

  const pieces = useMemo(
    () => trackJgPieces(verboseMoves, viewIndex),
    [verboseMoves, viewIndex],
  );
  const lastMove =
    viewIndex > 0
      ? { from: verboseMoves[viewIndex - 1].from, to: verboseMoves[viewIndex - 1].to }
      : null;
  const replayTurn: JgColor = viewIndex % 2 === 0 ? "r" : "b";

  const card = (color: JgColor) => {
    const player = color === "r" ? game.white : game.black;
    return (
      <JunglePlayerCard
        name={player.username}
        color={color}
        clockMs={null}
        clockActive={false}
        isTurn={replayTurn === color}
        capturedRanks={jgCapturedRanks(
          verboseMoves,
          viewIndex,
          color === "r" ? "b" : "r",
        )}
      />
    );
  };

  return (
    <JungleGameFrame
      topPlayer={card("b")}
      board={
        <JungleBoard
          pieces={pieces}
          turn={replayTurn}
          orientation="red"
          interactive={false}
          movableColor={null}
          legalMovesFrom={() => []}
          onMove={() => {}}
          lastMove={lastMove}
        />
      }
      bottomPlayer={card("r")}
      actions={
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="jg-action-button"
            onClick={() => setViewIndex(0)}
            disabled={viewIndex === 0}
          >
            <Rewind aria-hidden size={18} weight="duotone" />
            <span>Về đầu</span>
          </button>
          <button
            type="button"
            className="jg-action-button"
            onClick={() => setViewIndex(verboseMoves.length)}
            disabled={viewIndex === verboseMoves.length}
          >
            <FastForward aria-hidden size={18} weight="duotone" />
            <span>Về cuối</span>
          </button>
        </div>
      }
      moveList={
        <MoveList
          moves={verboseMoves}
          viewIndex={viewIndex}
          onSelect={setViewIndex}
          variant="jungle"
        />
      }
      statusLabel={
        verboseMoves.length === 0
          ? "Thế cờ ban đầu"
          : `Nước ${viewIndex}/${verboseMoves.length}`
      }
      statusColor={replayTurn}
      notices={
        <div className="jg-review-header mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate font-[family-name:var(--font-display)] text-base font-semibold text-[#F0EBDD] sm:text-lg">
              {game.white.username} - {game.black.username}
            </h1>
            <p className="mt-1 text-xs text-[#929D96] sm:text-sm">
              {titleText}
              <span className="mx-2 text-[#59645E]">|</span>
              {subtitleText}
              <span className="mx-2 text-[#59645E]">|</span>
              {game.time_control}
            </p>
          </div>
          <a
            href={`${API_URL}/api/games/${game.id}/pgn`}
            download
            className="jg-review-download"
          >
            <DownloadSimple aria-hidden size={18} weight="duotone" />
            <span>Tải biên bản</span>
          </a>
        </div>
      }
    />
  );
}

function OanquanReview({ game }: { game: GameDetail }) {
  const [viewIndex, setViewIndex] = useState(0);
  const initializedRef = useRef(false);

  // Replay toàn ván từ uci; dữ liệu hỏng giữa chừng thì lấy được đến đâu hay đến đó
  const verboseMoves = useMemo(() => {
    try {
      return new OAnQuan(game.moves.map((m) => m.uci)).historyMoves;
    } catch {
      const g = new OAnQuan();
      const moves: OqMove[] = [];
      for (const m of game.moves) {
        const mv = g.move(m.uci);
        if (!mv) break;
        moves.push(mv);
      }
      return moves;
    }
  }, [game]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      setViewIndex(verboseMoves.length);
    }
  }, [verboseMoves.length]);

  useArrowNav(verboseMoves.length, setViewIndex);

  // Mỗi nước đổi nhiều ô nên dựng lại bàn tại thế đang xem bằng tracker
  const board = useMemo(
    () => oqBoardAt(verboseMoves, viewIndex),
    [verboseMoves, viewIndex],
  );
  const lastMove = viewIndex > 0 ? verboseMoves[viewIndex - 1] : null;

  const card = (color: OqColor) => {
    const player = color === "a" ? game.white : game.black;
    return (
      <OanquanPlayerCard
        name={player.username}
        subtitle={oqSideName(color)}
        color={color}
        clockMs={null}
        clockActive={false}
        store={color === "a" ? board.storeA : board.storeB}
      />
    );
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {card("b")}
        <OanquanBoard
          dan={board.dan}
          quanLeft={board.quanLeft}
          quanRight={board.quanRight}
          turn={board.turn}
          interactive={false}
          movableColor={null}
          onMove={() => {}}
          lastMove={lastMove}
          hint={null}
        />
        {card("a")}
      </div>
      <aside className="flex w-full flex-col gap-3 lg:w-72">
        <MoveList moves={verboseMoves} viewIndex={viewIndex} onSelect={setViewIndex} />
        <p className="text-xs text-muted">Dùng phím ← → để tua từng nước.</p>
      </aside>
    </div>
  );
}

function GameReviewPageContent() {
  const params = useParams<{ id: string }>();
  const { data: game, isLoading } = useQuery({
    queryKey: ["game", params.id],
    queryFn: () => api<GameDetail>(`/api/games/${params.id}`),
  });

  if (isLoading || !game) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 text-sm text-muted">
        Đang tải ván đấu…
      </div>
    );
  }

  const isXq = game.variant === "xiangqi";
  const isCaro = game.variant === "caro";
  const isJungle = game.variant === "jungle";
  const isOanquan = game.variant === "oanquan";
  const winnerRB =
    game.result === "white" ? "r" : game.result === "black" ? "b" : null;
  const titleText = !game.result
    ? "Đang diễn ra"
    : isOanquan
      ? oqResultTitle(
          // white = Đỏ "a", black = Xanh "b"
          game.result === "white" ? "a" : game.result === "black" ? "b" : null,
          game.termination ?? "agreement",
        )
      : isJungle
        ? jgResultTitle(winnerRB as JgColor | null, game.termination ?? "agreement")
        : isCaro
          ? caroResultTitle(
              game.result === "white" ? "x" : game.result === "black" ? "o" : null,
              game.termination ?? "agreement",
            )
          : isXq
            ? xqResultTitle(winnerRB, game.termination ?? "agreement")
            : resultTitle({
                winner:
                  game.result === "white"
                    ? "white"
                    : game.result === "black"
                      ? "black"
                      : null,
                termination: (game.termination ?? "agreement") as Termination,
              });
  const subtitleText = !game.result
    ? "…"
    : isOanquan
      ? OQ_TERMINATION_LABELS[game.termination ?? "agreement"] ??
        game.termination ??
        ""
      : isJungle
        ? JG_TERMINATION_LABELS[game.termination ?? "agreement"] ??
          game.termination ??
          ""
        : isCaro
          ? CARO_TERMINATION_LABELS[game.termination ?? "agreement"] ??
            game.termination ??
            ""
          : isXq
            ? XQ_TERMINATION_LABELS[game.termination ?? "agreement"] ??
              game.termination ??
              ""
            : TERMINATION_LABELS[(game.termination ?? "agreement") as Termination];

  if (isJungle) {
    return (
      <JungleReview
        game={game}
        titleText={titleText}
        subtitleText={subtitleText}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <ReviewHeader game={game} titleText={titleText} subtitleText={subtitleText} />
      {isOanquan ? (
        <OanquanReview game={game} />
      ) : isCaro ? (
        <CaroReview game={game} />
      ) : isXq ? (
        <XiangqiReview game={game} />
      ) : (
        <ChessReview game={game} />
      )}
    </div>
  );
}

export default function GameReviewPage() {
  return (
    <Providers>
      <GameReviewPageContent />
    </Providers>
  );
}
