"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowCounterClockwise } from "@phosphor-icons/react/ArrowCounterClockwise";

import MoveList from "@/components/game/MoveList";
import Button from "@/components/ui/Button";
import { useOnlineGame } from "@/lib/online/useOnlineGame";
import { DotsGame, dotsEdgeKey, DOTS_BOX_COLS, DOTS_BOX_ROWS, type DotsColor, type DotsEdge } from "@/lib/dots/rules";

function replay(ucis: string[]): DotsGame {
  let game = new DotsGame();
  for (const uci of ucis) {
    const match = /^([hv])([0-4])([0-4])$/.exec(uci);
    if (!match) break;
    const next = game.play({ orientation: match[1] as "h" | "v", row: Number(match[2]), col: Number(match[3]) });
    if (!next) break;
    game = next;
  }
  return game;
}

function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export default function OnlineDotsGame() {
  const params = useParams<{ gameId: string }>();
  const router = useRouter();
  const gameId = params.gameId;
  const { state, notFound, connectionLost, myColor, confirmedUcis, displayUcis, pending, displayTimes, result, sendMove, resign, offerDraw, drawOfferFromOpponent, respondDraw } = useOnlineGame(gameId ?? null);
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const moves = useMemo(() => (displayUcis ?? []).map((uci, index) => ({ ply: index + 1, san: uci })), [displayUcis]);
  const shownIndex = viewIndex ?? moves.length;
  const shownGame = useMemo(() => replay((displayUcis ?? []).slice(0, shownIndex)), [displayUcis, shownIndex]);
  const liveGame = useMemo(() => replay(confirmedUcis ?? []), [confirmedUcis]);
  const myColorLocal: DotsColor | null = myColor === "white" ? "red" : myColor === "black" ? "blue" : null;
  const interactive = !result && viewIndex === null && pending === null && myColorLocal === liveGame.turn;
  const legalKeys = useMemo(() => new Set(liveGame.legalMoves().map(dotsEdgeKey)), [liveGame]);
  const score = shownGame.score();

  if (notFound) return <div className="mx-auto max-w-5xl px-4 py-12 text-center text-sm text-muted">Không tìm thấy ván đấu.</div>;

  const play = (edge: DotsEdge) => {
    if (!interactive || !legalKeys.has(dotsEdgeKey(edge))) return;
    sendMove(`${edge.orientation}${edge.row}${edge.col}`);
  };
  const winner = result ? result.raw === "white" ? "Đỏ" : result.raw === "black" ? "Xanh" : "Hòa" : null;
  const edgeButton = (edge: DotsEdge, style: React.CSSProperties) => {
    const claimed = !((shownGame[edge.orientation === "h" ? "horizontal" : "vertical"] as boolean[][])[edge.row]?.[edge.col] ?? false);
    const liveLegal = interactive && legalKeys.has(dotsEdgeKey(edge));
    return <button key={dotsEdgeKey(edge)} type="button" aria-label={`${edge.orientation === "h" ? "Cạnh ngang" : "Cạnh dọc"} ${edge.row + 1}, ${edge.col + 1}`} onClick={() => play(edge)} disabled={!liveLegal} style={style} className={`absolute z-[2] rounded-full transition ${claimed ? "bg-brass" : "bg-white/10 hover:bg-brass/75"}`} />;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-7">
      {(connectionLost || drawOfferFromOpponent) && <div className="mb-4 flex flex-wrap items-center gap-3">{connectionLost && <p className="rounded-[6px] border border-rust bg-rust/10 px-4 py-2 text-sm text-rust">Mất kết nối, đang thử lại...</p>}{drawOfferFromOpponent && !result && <div className="flex items-center gap-2 rounded-[6px] border border-line bg-slate px-4 py-2 text-sm"><span>Đối thủ đề nghị hòa.</span><Button size="sm" variant="primary" onClick={() => respondDraw(true)}>Đồng ý</Button><Button size="sm" onClick={() => respondDraw(false)}>Từ chối</Button></div>}</div>}
      <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-brass">Dots &amp; Boxes · online</p><h1 className="mt-2 text-4xl font-extrabold tracking-[-0.05em] text-parchment">Kẻ cạnh, ăn ô, giữ lượt</h1><p className="mt-3 text-sm leading-6 text-muted">Server giữ luật khép ô, điểm số, đồng hồ và biên bản cạnh.</p></div><div className="flex gap-2">{result ? <Button size="sm" onClick={() => router.push(`/game/${gameId}`)}>Xem lại ván</Button> : <><Button size="sm" variant="danger" onClick={resign}>Đầu hàng</Button><Button size="sm" onClick={offerDraw}>½ Cầu hòa</Button></>}<Button size="sm" onClick={() => router.push("/dots/online")}><ArrowCounterClockwise size={16} /> Sảnh</Button></div></header>

      <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,620px)_minmax(240px,1fr)] lg:items-start"><section className="rounded-[18px] border border-line bg-slate p-5 shadow-[0_24px_70px_rgba(0,0,0,.28)] sm:p-8"><div className="relative aspect-square rounded-[12px] border border-brass/25 bg-[#10242b]">{Array.from({ length: DOTS_BOX_ROWS * DOTS_BOX_COLS }, (_, index) => { const row = Math.floor(index / DOTS_BOX_COLS); const col = index % DOTS_BOX_COLS; const owner = shownGame.boxes[row][col]; return <div key={`box-${row}-${col}`} className={`absolute flex items-center justify-center border border-white/[.035] text-2xl font-black ${owner === "red" ? "bg-[#b94d3c]/35 text-[#f0a394]" : owner === "blue" ? "bg-[#477da0]/35 text-[#a7d2e7]" : "bg-transparent"}`} style={{ left: `${col * 25}%`, top: `${row * 25}%`, width: "25%", height: "25%" }}>{owner ? owner === "red" ? "R" : "B" : ""}</div>; })}{Array.from({ length: (DOTS_BOX_ROWS + 1) * DOTS_BOX_COLS }, (_, index) => { const row = Math.floor(index / DOTS_BOX_COLS); const col = index % DOTS_BOX_COLS; return edgeButton({ orientation: "h", row, col }, { top: `${row * 25}%`, left: `${col * 25 + 12.5}%`, width: "25%", height: "10px", transform: "translate(-50%, -50%)" }); })}{Array.from({ length: DOTS_BOX_ROWS * (DOTS_BOX_COLS + 1) }, (_, index) => { const row = Math.floor(index / (DOTS_BOX_COLS + 1)); const col = index % (DOTS_BOX_COLS + 1); return edgeButton({ orientation: "v", row, col }, { top: `${row * 25 + 12.5}%`, left: `${col * 25}%`, width: "10px", height: "25%", transform: "translate(-50%, -50%)" }); })}{Array.from({ length: (DOTS_BOX_ROWS + 1) * (DOTS_BOX_COLS + 1) }, (_, index) => { const row = Math.floor(index / (DOTS_BOX_COLS + 1)); const col = index % (DOTS_BOX_COLS + 1); return <span key={`dot-${row}-${col}`} className="absolute z-[3] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d8c293] shadow-[0_0_0_3px_rgba(16,36,43,.75)] sm:h-4 sm:w-4" style={{ top: `${row * 25}%`, left: `${col * 25}%` }} />; })}</div></section><aside className="space-y-4"><div className="grid grid-cols-2 gap-3"><ScoreCard label={state?.white.username ?? "Đỏ"} value={score.red} active={state?.turn === "white" && !result} color="red" /><ScoreCard label={state?.black.username ?? "Xanh"} value={score.blue} active={state?.turn === "black" && !result} color="blue" /></div><div className="grid grid-cols-2 gap-3"><ClockCard label={state?.white.username ?? "Đỏ"} value={displayTimes.white} active={state?.turn === "white" && !result} /><ClockCard label={state?.black.username ?? "Xanh"} value={displayTimes.black} active={state?.turn === "black" && !result} /></div><div className="rounded-[14px] border border-line bg-slate p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-brass">Trạng thái</p><p className="mt-3 text-xl font-bold text-parchment">{winner ?? (state?.turn === "white" ? "Lượt Đỏ" : "Lượt Xanh")}</p><p className="mt-2 text-sm leading-6 text-muted">{winner ? `Kết quả ${score.red}-${score.blue}.` : interactive ? "Chọn một cạnh để đi." : "Đang chờ đối thủ hoặc đồng bộ server."}</p></div><MoveList moves={moves} viewIndex={shownIndex} onSelect={(index) => setViewIndex(index >= moves.length ? null : index)} /></aside></div>
    </div>
  );
}

function ScoreCard({ label, value, active, color }: { label: string; value: number; active: boolean; color: "red" | "blue" }) { return <div className={`rounded-[14px] border p-4 ${active ? "border-brass/55 bg-brass/[.07]" : "border-line bg-slate"}`}><p className="truncate text-xs text-muted"><span className={`mr-1 inline-block h-2.5 w-2.5 rounded-full ${color === "red" ? "bg-[#b94d3c]" : "bg-[#477da0]"}`} />{label}</p><strong className="mt-1 block text-3xl text-parchment">{value}</strong></div>; }
function ClockCard({ label, value, active }: { label: string; value: number; active: boolean }) { return <div className={`rounded-[14px] border p-3 ${active ? "border-brass/55 bg-brass/[.07]" : "border-line bg-slate"}`}><p className="truncate text-xs text-muted">{label}</p><strong className="mt-1 block font-[family-name:var(--font-mono)] text-lg text-parchment">{clock(value)}</strong></div>; }
