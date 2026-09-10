"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowCounterClockwise } from "@phosphor-icons/react/ArrowCounterClockwise";

import MoveList from "@/components/game/MoveList";
import Button from "@/components/ui/Button";
import { useOnlineGame } from "@/lib/online/useOnlineGame";
import {
  DraughtsGame,
  DRAUGHTS_SIZE,
  type DraughtsColor,
  type DraughtsMove,
} from "@/lib/draughts/rules";

function replay(ucis: string[]): DraughtsGame {
  let game = new DraughtsGame();
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
  }
  return game;
}

function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function moveKey(move: DraughtsMove): string {
  return `${move.from.row}:${move.from.col}:${move.to.row}:${move.to.col}`;
}

export default function OnlineDraughtsGame() {
  const params = useParams<{ gameId: string }>();
  const router = useRouter();
  const gameId = params.gameId;
  const {
    state,
    notFound,
    connectionLost,
    myColor,
    confirmedUcis,
    displayUcis,
    pending,
    displayTimes,
    result,
    sendMove,
    resign,
    offerDraw,
    drawOfferFromOpponent,
    respondDraw,
  } = useOnlineGame(gameId ?? null);
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);

  const moves = useMemo(
    () => (displayUcis ?? []).map((uci, index) => ({ ply: index + 1, san: uci })),
    [displayUcis],
  );
  const shownIndex = viewIndex ?? moves.length;
  const shownGame = useMemo(
    () => replay((displayUcis ?? []).slice(0, shownIndex)),
    [displayUcis, shownIndex],
  );
  const liveGame = useMemo(() => replay(confirmedUcis ?? []), [confirmedUcis]);
  const myPiece: DraughtsColor | null =
    myColor === "white" ? "red" : myColor === "black" ? "black" : null;
  const interactive =
    !result && viewIndex === null && pending === null && myPiece === liveGame.turn;
  const legal = useMemo(() => liveGame.legalMoves(), [liveGame]);
  const legalDestinations = useMemo(
    () => new Set(legal.map((move) => `${move.to.row}:${move.to.col}`)),
    [legal],
  );
  const selectedMoves = useMemo(
    () =>
      selected
        ? legal.filter(
            (move) => move.from.row === selected.row && move.from.col === selected.col,
          )
        : [],
    [legal, selected],
  );
  const selectedKeys = useMemo(
    () => new Set(selectedMoves.map(moveKey)),
    [selectedMoves],
  );

  if (notFound) {
    return <div className="mx-auto max-w-5xl px-4 py-12 text-center text-sm text-muted">Không tìm thấy ván đấu.</div>;
  }

  const play = (row: number, col: number) => {
    if (!interactive) return;
    const candidate = selectedMoves.find((move) => move.to.row === row && move.to.col === col);
    if (candidate) {
      sendMove(`d${candidate.from.row}${candidate.from.col}${candidate.to.row}${candidate.to.col}`);
      setSelected(null);
      return;
    }
    if (liveGame.board[row][col]?.color === myPiece) {
      setSelected({ row, col });
    } else {
      setSelected(null);
    }
  };

  const winner = result
    ? result.raw === "white"
      ? "Đỏ"
      : result.raw === "black"
        ? "Đen"
        : "Hòa"
    : null;
  const redCount = shownGame.board.flat().filter((piece) => piece?.color === "red").length;
  const blackCount = shownGame.board.flat().filter((piece) => piece?.color === "black").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-7">
      {(connectionLost || drawOfferFromOpponent) && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {connectionLost && <p className="rounded-[6px] border border-rust bg-rust/10 px-4 py-2 text-sm text-rust">Mất kết nối, đang thử lại...</p>}
          {drawOfferFromOpponent && !result && (
            <div className="flex items-center gap-2 rounded-[6px] border border-line bg-slate px-4 py-2 text-sm">
              <span>Đối thủ đề nghị hòa.</span>
              <Button size="sm" variant="primary" onClick={() => respondDraw(true)}>Đồng ý</Button>
              <Button size="sm" onClick={() => respondDraw(false)}>Từ chối</Button>
            </div>
          )}
        </div>
      )}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brass">Cờ Đam · online</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.05em] text-parchment">Bắt quân, lên vua, khóa đường</h1>
          <p className="mt-3 text-sm leading-6 text-muted">Ăn bắt buộc, server giữ luật, đồng hồ và biên bản từng nước nhảy.</p>
        </div>
        <div className="flex gap-2">
          {result ? <Button size="sm" onClick={() => router.push(`/game/${gameId}`)}>Xem lại ván</Button> : <><Button size="sm" variant="danger" onClick={resign}>Đầu hàng</Button><Button size="sm" onClick={offerDraw}>½ Cầu hòa</Button></>}
          <Button size="sm" onClick={() => router.push("/draughts/online")}><ArrowCounterClockwise size={16} /> Sảnh</Button>
        </div>
      </header>

      <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,620px)_minmax(240px,1fr)] lg:items-start">
        <section className="rounded-[18px] border border-[#795f3b] bg-[#34271f] p-3 shadow-[0_24px_70px_rgba(0,0,0,.3)] sm:p-5">
          <div className="grid aspect-square grid-cols-8 overflow-hidden rounded-[10px] border border-[#d7ae65]/45">
            {Array.from({ length: DRAUGHTS_SIZE * DRAUGHTS_SIZE }, (_, index) => {
              const row = Math.floor(index / DRAUGHTS_SIZE);
              const col = index % DRAUGHTS_SIZE;
              const piece = shownGame.board[row][col];
              const dark = (row + col) % 2 === 1;
              const isSelected = selected?.row === row && selected.col === col;
              const destination = interactive && legalDestinations.has(`${row}:${col}`);
              const selectedDestination = selectedMoves.some((move) => move.to.row === row && move.to.col === col && selectedKeys.has(moveKey(move)));
              return (
                <button key={`${row}-${col}`} type="button" onClick={() => play(row, col)} aria-label={`Ô ${row + 1}, ${col + 1}`} className={`relative grid place-items-center transition ${dark ? "bg-[#70502f] hover:bg-[#8a6338]" : "bg-[#d4b57d] hover:bg-[#e2c997]"} ${isSelected ? "z-[1] ring-4 ring-inset ring-brass" : ""}`}>
                  {destination && <span className={`absolute h-3 w-3 rounded-full shadow-[0_0_0_4px_rgba(7,17,23,.18)] sm:h-4 sm:w-4 ${selectedDestination ? "bg-[#f2d486]" : "bg-brass/55"}`} />}
                  {piece && <span className={`relative z-[1] grid aspect-square w-[76%] place-items-center rounded-full border-2 shadow-[inset_-5px_-6px_10px_rgba(0,0,0,.28),0_4px_6px_rgba(0,0,0,.25)] ${piece.color === "red" ? "border-[#f4b0a0] bg-[#b94d3c]" : "border-[#b9c7ca] bg-[#293940]"}`}>{piece.king && <span className="text-base font-black text-[#f4dc9d] sm:text-xl">♛</span>}</span>}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="grid grid-cols-2 gap-3"><ScoreCard label={state?.white.username ?? "Đỏ"} value={redCount} active={state?.turn === "white" && !result} color="red" /><ScoreCard label={state?.black.username ?? "Đen"} value={blackCount} active={state?.turn === "black" && !result} color="black" /></div>
          <div className="grid grid-cols-2 gap-3"><ClockCard label={state?.white.username ?? "Đỏ"} value={displayTimes.white} active={state?.turn === "white" && !result} /><ClockCard label={state?.black.username ?? "Đen"} value={displayTimes.black} active={state?.turn === "black" && !result} /></div>
          <div className="rounded-[14px] border border-line bg-slate p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-brass">Trạng thái</p><p className="mt-3 text-xl font-bold text-parchment">{winner ?? (state?.turn === "white" ? "Lượt Đỏ" : "Lượt Đen")}</p><p className="mt-2 text-sm leading-6 text-muted">{winner ? "Ván đã khép lại." : interactive ? "Chọn quân rồi chọn ô đích." : "Đang chờ đối thủ hoặc đồng bộ server."}</p></div>
          <MoveList moves={moves} viewIndex={shownIndex} onSelect={(index) => { setSelected(null); setViewIndex(index >= moves.length ? null : index); }} />
        </aside>
      </div>
    </div>
  );
}

function ScoreCard({ label, value, active, color }: { label: string; value: number; active: boolean; color: "red" | "black" }) {
  return <div className={`rounded-[14px] border p-4 ${active ? "border-brass/55 bg-brass/[.07]" : "border-line bg-slate"}`}><p className="truncate text-xs text-muted"><span className={`mr-1 inline-block h-2.5 w-2.5 rounded-full ${color === "red" ? "bg-[#b94d3c]" : "bg-[#293940]"}`} />{label}</p><strong className="mt-1 block text-3xl text-parchment">{value}</strong></div>;
}

function ClockCard({ label, value, active }: { label: string; value: number; active: boolean }) {
  return <div className={`rounded-[14px] border p-3 ${active ? "border-brass/55 bg-brass/[.07]" : "border-line bg-slate"}`}><p className="truncate text-xs text-muted">{label}</p><strong className="mt-1 block font-[family-name:var(--font-mono)] text-lg text-parchment">{clock(value)}</strong></div>;
}
