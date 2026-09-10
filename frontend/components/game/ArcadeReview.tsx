"use client";

import { useEffect, useMemo, useState } from "react";

import MoveList from "@/components/game/MoveList";
import { Connect4Game, CONNECT4_COLS, CONNECT4_ROWS } from "@/lib/connect4/rules";
import { DraughtsGame, DRAUGHTS_SIZE } from "@/lib/draughts/rules";
import { DotsGame, DOTS_BOX_COLS, DOTS_BOX_ROWS } from "@/lib/dots/rules";
import { ReversiGame, REVERSI_SIZE } from "@/lib/reversi/rules";
import type { GameDetail } from "@/lib/api";

export type ArcadeReviewVariant = "reversi" | "connect4" | "draughts" | "dots";
type ArcadeState = ReversiGame | Connect4Game | DraughtsGame | DotsGame;

function replayHistory(variant: ArcadeReviewVariant, ucis: string[]): ArcadeState[] {
  if (variant === "reversi") {
    let game = new ReversiGame();
    const history: ArcadeState[] = [game];
    for (const uci of ucis) {
      const match = /^r([0-7])c([0-7])$/.exec(uci);
      if (!match) break;
      const next = game.play(Number(match[1]), Number(match[2]));
      if (!next) break;
      game = next;
      while (!game.isGameOver() && game.legalMoves().length === 0) {
        const passed = game.pass();
        if (!passed) break;
        game = passed;
      }
      history.push(game);
    }
    return history;
  }

  if (variant === "connect4") {
    let game = new Connect4Game();
    const history: ArcadeState[] = [game];
    for (const uci of ucis) {
      const match = /^c([0-6])$/.exec(uci);
      if (!match) break;
      const next = game.play(Number(match[1]));
      if (!next) break;
      game = next;
      history.push(game);
    }
    return history;
  }

  if (variant === "draughts") {
    let game = new DraughtsGame();
    const history: ArcadeState[] = [game];
    for (const uci of ucis) {
      const match = /^d([0-7])([0-7])([0-7])([0-7])$/.exec(uci);
      if (!match) break;
      const move = game.legalMoves().find(
        (candidate) =>
          candidate.from.row === Number(match[1]) &&
          candidate.from.col === Number(match[2]) &&
          candidate.to.row === Number(match[3]) &&
          candidate.to.col === Number(match[4]),
      );
      if (!move) break;
      const next = game.play(move);
      if (!next) break;
      game = next;
      history.push(game);
    }
    return history;
  }

  let game = new DotsGame();
  const history: ArcadeState[] = [game];
  for (const uci of ucis) {
    const match = /^([hv])([0-4])([0-4])$/.exec(uci);
    if (!match) break;
    const next = game.play({
      orientation: match[1] as "h" | "v",
      row: Number(match[2]),
      col: Number(match[3]),
    });
    if (!next) break;
    game = next;
    history.push(game);
  }
  return history;
}

export default function ArcadeReview({
  game,
  variant,
}: {
  game: GameDetail;
  variant: ArcadeReviewVariant;
}) {
  const moves = useMemo(
    () => game.moves.map((move) => ({ ply: move.ply, san: move.san })),
    [game.moves],
  );
  const history = useMemo(
    () => replayHistory(variant, game.moves.map((move) => move.uci)),
    [game.moves, variant],
  );
  const [viewIndex, setViewIndex] = useState(0);

  useEffect(() => {
    setViewIndex(Math.min(moves.length, history.length - 1));
  }, [history.length, moves.length]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") setViewIndex((index) => Math.max(0, index - 1));
      if (event.key === "ArrowRight") setViewIndex((index) => Math.min(moves.length, index + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moves.length]);

  const state = history[Math.min(viewIndex, history.length - 1)] ?? history[0];
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">
        <div className="mb-3 rounded-[10px] border border-line bg-slate px-4 py-3 text-sm text-muted">
          {viewIndex === 0 ? "Thế cờ ban đầu" : `Nước ${viewIndex}/${moves.length}`}
          <span className="mx-2 text-line">·</span>{arcadeName(variant)}
        </div>
        {variant === "reversi" && <ReversiBoard game={state as ReversiGame} />}
        {variant === "connect4" && <Connect4Board game={state as Connect4Game} />}
        {variant === "draughts" && <DraughtsBoard game={state as DraughtsGame} />}
        {variant === "dots" && <DotsBoard game={state as DotsGame} />}
      </div>
      <aside className="flex w-full flex-col gap-3 lg:w-72">
        <MoveList moves={moves} viewIndex={viewIndex} onSelect={(index) => setViewIndex(Math.min(index, history.length - 1))} />
        <p className="text-xs text-muted">Dùng phím ← → để tua từng nước. Nhấn vào biên bản để nhảy tới thế cờ.</p>
      </aside>
    </div>
  );
}

function arcadeName(variant: ArcadeReviewVariant): string {
  return variant === "reversi" ? "Reversi / Othello" : variant === "connect4" ? "Connect Four" : variant === "draughts" ? "Cờ Đam 8×8" : "Dots & Boxes";
}

function ReversiBoard({ game }: { game: ReversiGame }) {
  const score = game.score();
  return <div className="mx-auto max-w-[620px] rounded-[18px] border border-line bg-[#164b43] p-2 shadow-[0_24px_70px_rgba(0,0,0,.28)] sm:p-4"><div className="grid aspect-square grid-cols-8 overflow-hidden rounded-[10px] border border-[#d9b96f]/40 bg-[#27715d]">{Array.from({ length: REVERSI_SIZE * REVERSI_SIZE }, (_, index) => { const row = Math.floor(index / REVERSI_SIZE); const col = index % REVERSI_SIZE; const cell = game.board[row][col]; return <div key={`${row}-${col}`} className="grid place-items-center border border-[#9ad5a0]/25 bg-[#27715d]">{cell && <span className={`aspect-square w-[72%] rounded-full border-2 ${cell === "black" ? "border-[#6d7775] bg-[#172329]" : "border-[#fff4d3] bg-[#f2e8cd]"}`} />}</div>; })}</div><div className="mt-3 flex justify-between text-sm text-muted"><span>Đen {score.black}</span><span>Trắng {score.white}</span></div></div>;
}

function Connect4Board({ game }: { game: Connect4Game }) {
  return <div className="mx-auto max-w-[660px] rounded-[20px] border border-[#375f9b] bg-[#214a8c] p-3 shadow-[0_24px_70px_rgba(0,0,0,.28)] sm:p-6"><div className="grid grid-cols-7 gap-1.5 rounded-[12px] bg-[#1a3e78] p-2 sm:gap-2 sm:p-3">{Array.from({ length: CONNECT4_ROWS * CONNECT4_COLS }, (_, index) => { const row = Math.floor(index / CONNECT4_COLS); const col = index % CONNECT4_COLS; const cell = game.board[row][col]; return <div key={`${row}-${col}`} className="aspect-square rounded-full bg-[#102d5a] p-1 sm:p-2"><span className={`block aspect-square rounded-full border ${cell === "red" ? "border-[#ffb05e] bg-[#e66555]" : cell === "yellow" ? "border-[#fff0a3] bg-[#f0c95d]" : "border-[#274c87] bg-[#0d2850]"}`} /></div>; })}</div></div>;
}

function DraughtsBoard({ game }: { game: DraughtsGame }) {
  return <div className="mx-auto max-w-[620px] rounded-[18px] border border-[#795f3b] bg-[#34271f] p-3 shadow-[0_24px_70px_rgba(0,0,0,.3)] sm:p-5"><div className="grid aspect-square grid-cols-8 overflow-hidden rounded-[10px] border border-[#d7ae65]/45">{Array.from({ length: DRAUGHTS_SIZE * DRAUGHTS_SIZE }, (_, index) => { const row = Math.floor(index / DRAUGHTS_SIZE); const col = index % DRAUGHTS_SIZE; const piece = game.board[row][col]; const dark = (row + col) % 2 === 1; return <div key={`${row}-${col}`} className={`grid place-items-center ${dark ? "bg-[#70502f]" : "bg-[#d4b57d]"}`}>{piece && <span className={`grid aspect-square w-[76%] place-items-center rounded-full border-2 ${piece.color === "red" ? "border-[#f4b0a0] bg-[#b94d3c]" : "border-[#b9c7ca] bg-[#293940]"}`}>{piece.king && <span className="text-base font-black text-[#f4dc9d] sm:text-xl">♛</span>}</span>}</div>; })}</div></div>;
}

function DotsBoard({ game }: { game: DotsGame }) {
  const edge = (orientation: "h" | "v", row: number, col: number) => {
    const used = orientation === "h" ? game.horizontal[row][col] : game.vertical[row][col];
    const style = orientation === "h" ? { top: `${row * 25}%`, left: `${col * 25 + 12.5}%`, width: "25%", height: "10px" } : { top: `${row * 25 + 12.5}%`, left: `${col * 25}%`, width: "10px", height: "25%" };
    return <span key={`${orientation}-${row}-${col}`} className={`absolute z-[2] rounded-full ${used ? "bg-brass" : "bg-white/10"}`} style={{ ...style, transform: "translate(-50%, -50%)" }} />;
  };
  return <div className="mx-auto max-w-[620px] rounded-[18px] border border-line bg-slate p-5 shadow-[0_24px_70px_rgba(0,0,0,.28)] sm:p-8"><div className="relative aspect-square rounded-[12px] border border-brass/25 bg-[#10242b]">{Array.from({ length: DOTS_BOX_ROWS * DOTS_BOX_COLS }, (_, index) => { const row = Math.floor(index / DOTS_BOX_COLS); const col = index % DOTS_BOX_COLS; const owner = game.boxes[row][col]; return <div key={`box-${row}-${col}`} className={`absolute flex items-center justify-center border border-white/[.035] text-2xl font-black ${owner === "red" ? "bg-[#b94d3c]/35 text-[#f0a394]" : owner === "blue" ? "bg-[#477da0]/35 text-[#a7d2e7]" : "bg-transparent"}`} style={{ left: `${col * 25}%`, top: `${row * 25}%`, width: "25%", height: "25%" }}>{owner ? owner === "red" ? "R" : "B" : ""}</div>; })}{Array.from({ length: (DOTS_BOX_ROWS + 1) * DOTS_BOX_COLS }, (_, index) => edge("h", Math.floor(index / DOTS_BOX_COLS), index % DOTS_BOX_COLS))}{Array.from({ length: DOTS_BOX_ROWS * (DOTS_BOX_COLS + 1) }, (_, index) => edge("v", Math.floor(index / (DOTS_BOX_COLS + 1)), index % (DOTS_BOX_COLS + 1)))}{Array.from({ length: (DOTS_BOX_ROWS + 1) * (DOTS_BOX_COLS + 1) }, (_, index) => { const row = Math.floor(index / (DOTS_BOX_COLS + 1)); const col = index % (DOTS_BOX_COLS + 1); return <span key={`dot-${row}-${col}`} className="absolute z-[3] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d8c293] shadow-[0_0_0_3px_rgba(16,36,43,.75)] sm:h-4 sm:w-4" style={{ top: `${row * 25}%`, left: `${col * 25}%` }} />; })}</div></div>;
}
