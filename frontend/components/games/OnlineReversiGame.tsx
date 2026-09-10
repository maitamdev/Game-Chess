"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowCounterClockwise } from "@phosphor-icons/react/ArrowCounterClockwise";

import MoveList from "@/components/game/MoveList";
import Button from "@/components/ui/Button";
import { useOnlineGame } from "@/lib/online/useOnlineGame";
import { ReversiGame, REVERSI_SIZE, type ReversiColor } from "@/lib/reversi/rules";

function replay(ucis: string[]): ReversiGame {
  let game = new ReversiGame();
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
  }
  return game;
}

function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export default function OnlineReversiGame() {
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
  const myDisc: ReversiColor | null =
    myColor === "white" ? "black" : myColor === "black" ? "white" : null;
  const interactive =
    !result &&
    viewIndex === null &&
    pending === null &&
    myDisc !== null &&
    liveGame.turn === myDisc;
  const legal = useMemo(() => new Set(liveGame.legalMoves().map((m) => `${m.row}:${m.col}`)), [liveGame]);
  const score = shownGame.score();

  if (notFound) {
    return <div className="mx-auto max-w-5xl px-4 py-12 text-center text-sm text-muted">Không tìm thấy ván đấu.</div>;
  }

  const play = (row: number, col: number) => {
    if (!interactive || !liveGame.play(row, col)) return;
    sendMove(`r${row}c${col}`);
  };
  const winner = result
    ? result.raw === "white"
      ? "Đen"
      : result.raw === "black"
        ? "Trắng"
        : "Hòa"
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-7">
      {(connectionLost || drawOfferFromOpponent) && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {connectionLost && <p className="rounded-[6px] border border-rust bg-rust/10 px-4 py-2 text-sm text-rust">Mất kết nối, đang thử lại...</p>}
          {drawOfferFromOpponent && !result && <div className="flex items-center gap-2 rounded-[6px] border border-line bg-slate px-4 py-2 text-sm"><span>Đối thủ đề nghị hòa.</span><Button size="sm" variant="primary" onClick={() => respondDraw(true)}>Đồng ý</Button><Button size="sm" onClick={() => respondDraw(false)}>Từ chối</Button></div>}
        </div>
      )}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brass">Reversi / Othello · online</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.05em] text-parchment">Lật thế trận theo từng góc</h1>
          <p className="mt-3 text-sm leading-6 text-muted">Server giữ luật, đồng hồ và toàn bộ biên bản nước đi.</p>
        </div>
        <div className="flex gap-2">
          {result ? <Button size="sm" onClick={() => router.push(`/game/${gameId}`)}>Xem lại ván</Button> : <><Button size="sm" variant="danger" onClick={resign}>Đầu hàng</Button><Button size="sm" onClick={offerDraw}>½ Cầu hòa</Button></>}
          <Button size="sm" onClick={() => router.push("/reversi/online")}><ArrowCounterClockwise size={16} /> Sảnh</Button>
        </div>
      </header>

      <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,620px)_minmax(240px,1fr)] lg:items-start">
        <section className="rounded-[18px] border border-line bg-[#164b43] p-2 shadow-[0_24px_70px_rgba(0,0,0,.28)] sm:p-4">
          <div className="grid aspect-square grid-cols-8 overflow-hidden rounded-[10px] border border-[#d9b96f]/40 bg-[#27715d]">
            {Array.from({ length: REVERSI_SIZE * REVERSI_SIZE }, (_, index) => {
              const row = Math.floor(index / REVERSI_SIZE);
              const col = index % REVERSI_SIZE;
              const cell = shownGame.board[row][col];
              const isLegal = interactive && legal.has(`${row}:${col}`);
              return <button key={`${row}-${col}`} type="button" aria-label={`Ô ${row + 1}, ${col + 1}`} onClick={() => play(row, col)} disabled={!isLegal} className="relative grid place-items-center border border-[#9ad5a0]/25 bg-[#27715d] transition hover:bg-[#32846b] disabled:cursor-default">{isLegal && <span className="h-3 w-3 rounded-full bg-[#e6d49b]/65 sm:h-4 sm:w-4" />}{cell && <span className={`aspect-square w-[72%] rounded-full border-2 shadow-[inset_-5px_-6px_10px_rgba(0,0,0,.28),0_3px_5px_rgba(0,0,0,.25)] ${cell === "black" ? "border-[#6d7775] bg-[#172329]" : "border-[#fff4d3] bg-[#f2e8cd]"}`} />}</button>;
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="grid grid-cols-2 gap-3"><ScoreCard label="Đen" value={score.black} active={shownGame.turn === "black" && !result} /><ScoreCard label="Trắng" value={score.white} active={shownGame.turn === "white" && !result} /></div>
          <div className="grid grid-cols-2 gap-3"><ClockCard label={state?.white.username ?? "Trắng"} value={displayTimes.white} active={state?.turn === "white" && !result} /><ClockCard label={state?.black.username ?? "Đen"} value={displayTimes.black} active={state?.turn === "black" && !result} /></div>
          <div className="rounded-[14px] border border-line bg-slate p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-brass">Trạng thái</p><p className="mt-3 text-xl font-bold text-parchment">{winner ?? (state?.turn === "white" ? "Lượt Đen" : "Lượt Trắng")}</p><p className="mt-2 text-sm leading-6 text-muted">{winner ? "Ván đã khép lại." : interactive ? "Chọn một ô hợp lệ để đi." : "Đang chờ đối thủ hoặc đồng bộ server."}</p></div>
          <MoveList moves={moves} viewIndex={shownIndex} onSelect={(index) => setViewIndex(index >= moves.length ? null : index)} />
        </aside>
      </div>
    </div>
  );
}

function ScoreCard({ label, value, active }: { label: string; value: number; active: boolean }) {
  return <div className={`rounded-[14px] border p-4 ${active ? "border-brass/55 bg-brass/[.07]" : "border-line bg-slate"}`}><p className="text-sm text-muted">{label}</p><strong className="mt-2 block text-3xl text-parchment">{value}</strong></div>;
}

function ClockCard({ label, value, active }: { label: string; value: number; active: boolean }) {
  return <div className={`rounded-[14px] border p-3 ${active ? "border-brass/55 bg-brass/[.07]" : "border-line bg-slate"}`}><p className="truncate text-xs text-muted">{label}</p><strong className="mt-1 block font-[family-name:var(--font-mono)] text-lg text-parchment">{clock(value)}</strong></div>;
}
