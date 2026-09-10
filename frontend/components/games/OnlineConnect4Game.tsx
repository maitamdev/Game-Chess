"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowCounterClockwise } from "@phosphor-icons/react/ArrowCounterClockwise";

import MoveList from "@/components/game/MoveList";
import Button from "@/components/ui/Button";
import { useOnlineGame } from "@/lib/online/useOnlineGame";
import { Connect4Game, CONNECT4_COLS, CONNECT4_ROWS, type Connect4Color } from "@/lib/connect4/rules";

function replay(ucis: string[]): Connect4Game {
  let game = new Connect4Game();
  for (const uci of ucis) {
    const match = /^c([0-6])$/.exec(uci);
    if (!match) break;
    const next = game.play(Number(match[1]));
    if (!next) break;
    game = next;
  }
  return game;
}

function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export default function OnlineConnect4Game() {
  const params = useParams<{ gameId: string }>();
  const router = useRouter();
  const gameId = params.gameId;
  const { state, notFound, connectionLost, myColor, confirmedUcis, displayUcis, pending, displayTimes, result, sendMove, resign, offerDraw, drawOfferFromOpponent, respondDraw } = useOnlineGame(gameId ?? null);
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const moves = useMemo(() => (displayUcis ?? []).map((uci, index) => ({ ply: index + 1, san: uci })), [displayUcis]);
  const shownIndex = viewIndex ?? moves.length;
  const shownGame = useMemo(() => replay((displayUcis ?? []).slice(0, shownIndex)), [displayUcis, shownIndex]);
  const liveGame = useMemo(() => replay(confirmedUcis ?? []), [confirmedUcis]);
  const myDisc: Connect4Color | null = myColor === "white" ? "red" : myColor === "black" ? "yellow" : null;
  const interactive = !result && viewIndex === null && pending === null && myDisc !== null && liveGame.turn === myDisc;
  const winner = result ? result.raw === "white" ? "Đỏ" : result.raw === "black" ? "Vàng" : "Hòa" : null;

  if (notFound) return <div className="mx-auto max-w-5xl px-4 py-12 text-center text-sm text-muted">Không tìm thấy ván đấu.</div>;

  const play = (column: number) => {
    if (!interactive || !liveGame.play(column)) return;
    sendMove(`c${column}`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-7">
      {(connectionLost || drawOfferFromOpponent) && <div className="mb-4 flex flex-wrap items-center gap-3">{connectionLost && <p className="rounded-[6px] border border-rust bg-rust/10 px-4 py-2 text-sm text-rust">Mất kết nối, đang thử lại...</p>}{drawOfferFromOpponent && !result && <div className="flex items-center gap-2 rounded-[6px] border border-line bg-slate px-4 py-2 text-sm"><span>Đối thủ đề nghị hòa.</span><Button size="sm" variant="primary" onClick={() => respondDraw(true)}>Đồng ý</Button><Button size="sm" onClick={() => respondDraw(false)}>Từ chối</Button></div>}</div>}
      <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-brass">Connect Four · online</p><h1 className="mt-2 text-4xl font-extrabold tracking-[-0.05em] text-parchment">Bốn quân nối thành hàng</h1><p className="mt-3 text-sm leading-6 text-muted">Thả quân theo cột, server giữ luật và đồng hồ cho cả hai phía.</p></div><div className="flex gap-2">{result ? <Button size="sm" onClick={() => router.push(`/game/${gameId}`)}>Xem lại ván</Button> : <><Button size="sm" variant="danger" onClick={resign}>Đầu hàng</Button><Button size="sm" onClick={offerDraw}>½ Cầu hòa</Button></>}<Button size="sm" onClick={() => router.push("/connect4/online")}><ArrowCounterClockwise size={16} /> Sảnh</Button></div></header>
      <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,660px)_minmax(240px,1fr)] lg:items-start"><section className="rounded-[20px] border border-[#375f9b] bg-[#214a8c] p-3 shadow-[0_24px_70px_rgba(0,0,0,.28)] sm:p-6"><div className="grid grid-cols-7 gap-1.5 rounded-[12px] bg-[#1a3e78] p-2 sm:gap-2 sm:p-3">{Array.from({ length: CONNECT4_ROWS * CONNECT4_COLS }, (_, index) => { const row = Math.floor(index / CONNECT4_COLS); const col = index % CONNECT4_COLS; const cell = shownGame.board[row][col]; return <button key={`${row}-${col}`} type="button" aria-label={`Hàng ${row + 1}, cột ${col + 1}`} onClick={() => play(col)} disabled={!interactive || !liveGame.validColumns().includes(col)} className="aspect-square rounded-full bg-[#102d5a] p-1 transition hover:bg-[#163b73] disabled:cursor-default sm:p-2"><span className={`block aspect-square rounded-full border ${cell === "red" ? "border-[#ffb05e] bg-[#e66555] shadow-[inset_-5px_-5px_8px_rgba(126,29,23,.35)]" : cell === "yellow" ? "border-[#fff0a3] bg-[#f0c95d] shadow-[inset_-5px_-5px_8px_rgba(133,90,16,.28)]" : "border-[#274c87] bg-[#0d2850]"}`} /></button>; })}</div><div className="mt-3 grid grid-cols-7 gap-1.5 sm:gap-2">{Array.from({ length: CONNECT4_COLS }, (_, col) => <Button key={col} size="sm" variant="ghost" onClick={() => play(col)} disabled={!interactive || !liveGame.validColumns().includes(col)} aria-label={`Thả vào cột ${col + 1}`}>↓</Button>)}</div></section><aside className="space-y-4"><div className="grid grid-cols-2 gap-3"><ClockCard label={state?.white.username ?? "Đỏ"} value={displayTimes.white} active={state?.turn === "white" && !result} color="red" /><ClockCard label={state?.black.username ?? "Vàng"} value={displayTimes.black} active={state?.turn === "black" && !result} color="yellow" /></div><div className="rounded-[14px] border border-line bg-slate p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-brass">Trạng thái</p><p className="mt-3 text-xl font-bold text-parchment">{winner ?? (state?.turn === "white" ? "Lượt Đỏ" : "Lượt Vàng")}</p><p className="mt-2 text-sm leading-6 text-muted">{winner ? "Ván đã khép lại." : interactive ? "Chọn một cột để thả quân." : "Đang chờ đối thủ hoặc đồng bộ server."}</p></div><MoveList moves={moves} viewIndex={shownIndex} onSelect={(index) => setViewIndex(index >= moves.length ? null : index)} /></aside></div>
    </div>
  );
}

function ClockCard({ label, value, active, color }: { label: string; value: number; active: boolean; color: "red" | "yellow" }) {
  return <div className={`rounded-[14px] border p-3 ${active ? "border-brass/55 bg-brass/[.07]" : "border-line bg-slate"}`}><p className="truncate text-xs text-muted"><span className={`mr-1 inline-block h-2.5 w-2.5 rounded-full ${color === "red" ? "bg-[#e66555]" : "bg-[#f0c95d]"}`} />{label}</p><strong className="mt-1 block font-[family-name:var(--font-mono)] text-lg text-parchment">{clock(value)}</strong></div>;
}
