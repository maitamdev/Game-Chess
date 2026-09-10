"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react/ArrowCounterClockwise";
import { Cpu } from "@phosphor-icons/react/Cpu";
import { UsersThree } from "@phosphor-icons/react/UsersThree";
import Button from "@/components/ui/Button";
import { chooseDotsMove, dotsEdgeKey, DotsGame as DotsState, DOTS_BOX_COLS, DOTS_BOX_ROWS, type DotsEdge } from "@/lib/dots/rules";

export default function DotsGame({ computer = false }: { computer?: boolean }) {
  const [game, setGame] = useState(() => new DotsState());
  const winner = game.winner();
  const legalKeys = useMemo(() => new Set(game.legalMoves().map(dotsEdgeKey)), [game]);
  const score = game.score();

  useEffect(() => {
    if (!computer || game.turn !== "blue" || winner) return;
    const timer = setTimeout(() => {
      setGame((current) => {
        const move = chooseDotsMove(current);
        return move ? current.play(move) ?? current : current;
      });
    }, 420);
    return () => clearTimeout(timer);
  }, [computer, game, winner]);

  const play = (edge: DotsEdge) => {
    if (winner || (computer && game.turn === "blue")) return;
    setGame((current) => current.play(edge) ?? current);
  };
  const reset = () => setGame(new DotsState());
  const edgeButton = (edge: DotsEdge, style: React.CSSProperties) => {
    const key = dotsEdgeKey(edge);
    const claimed = !legalKeys.has(key);
    return <button key={key} type="button" aria-label={`${edge.orientation === "h" ? "Cạnh ngang" : "Cạnh dọc"} ${edge.row + 1}, ${edge.col + 1}`} onClick={() => play(edge)} disabled={claimed || Boolean(winner) || (computer && game.turn === "blue")} style={style} className={`absolute z-[2] rounded-full transition ${claimed ? "bg-brass" : "bg-white/10 hover:bg-brass/75"}`} />;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brass">Dots &amp; Boxes</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.05em] text-parchment">Kẻ cạnh, ăn ô, giữ lượt</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Đặt một cạnh mỗi lượt. Ai khép được ô sẽ ghi điểm và được đi tiếp.</p>
        </div>
        <div className="flex gap-2">
          <Link href={computer ? "/dots/local" : "/dots/computer"} className="inline-flex min-h-10 items-center gap-2 rounded-[8px] border border-line px-3 text-sm font-semibold text-muted transition hover:border-brass/50 hover:text-parchment">
            {computer ? <UsersThree size={17} /> : <Cpu size={17} />}
            {computer ? "Hai người" : "Đấu máy"}
          </Link>
          <Button size="sm" onClick={reset}><ArrowCounterClockwise size={17} /> Ván mới</Button>
        </div>
      </header>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,620px)_minmax(240px,1fr)] lg:items-start">
        <section className="rounded-[18px] border border-line bg-slate p-5 shadow-[0_24px_70px_rgba(0,0,0,.28)] sm:p-8">
          <div className="relative aspect-square rounded-[12px] border border-brass/25 bg-[#10242b]">
            {Array.from({ length: DOTS_BOX_ROWS * DOTS_BOX_COLS }, (_, index) => {
              const row = Math.floor(index / DOTS_BOX_COLS);
              const col = index % DOTS_BOX_COLS;
              const owner = game.boxes[row][col];
              return <div key={`box-${row}-${col}`} className={`absolute flex items-center justify-center border border-white/[.035] text-2xl font-black ${owner === "red" ? "bg-[#b94d3c]/35 text-[#f0a394]" : owner === "blue" ? "bg-[#477da0]/35 text-[#a7d2e7]" : "bg-transparent"}`} style={{ left: `${col * 25}%`, top: `${row * 25}%`, width: "25%", height: "25%" }}>{owner ? (owner === "red" ? "R" : "B") : ""}</div>;
            })}
            {Array.from({ length: (DOTS_BOX_ROWS + 1) * DOTS_BOX_COLS }, (_, index) => { const row = Math.floor(index / DOTS_BOX_COLS); const col = index % DOTS_BOX_COLS; return edgeButton({ orientation: "h", row, col }, { top: `${row * 25}%`, left: `${col * 25 + 12.5}%`, width: "25%", height: "10px", transform: "translate(-50%, -50%)" }); })}
            {Array.from({ length: DOTS_BOX_ROWS * (DOTS_BOX_COLS + 1) }, (_, index) => { const row = Math.floor(index / (DOTS_BOX_COLS + 1)); const col = index % (DOTS_BOX_COLS + 1); return edgeButton({ orientation: "v", row, col }, { top: `${row * 25 + 12.5}%`, left: `${col * 25}%`, width: "10px", height: "25%", transform: "translate(-50%, -50%)" }); })}
            {Array.from({ length: (DOTS_BOX_ROWS + 1) * (DOTS_BOX_COLS + 1) }, (_, index) => { const row = Math.floor(index / (DOTS_BOX_COLS + 1)); const col = index % (DOTS_BOX_COLS + 1); return <span key={`dot-${row}-${col}`} className="absolute z-[3] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d8c293] shadow-[0_0_0_3px_rgba(16,36,43,.75)] sm:h-4 sm:w-4" style={{ top: `${row * 25}%`, left: `${col * 25}%` }} />; })}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <ScoreCard label={computer ? "Bạn · Đỏ" : "Đỏ"} value={score.red} active={game.turn === "red" && !winner} color="red" />
            <ScoreCard label={computer ? "Máy · Xanh" : "Xanh"} value={score.blue} active={game.turn === "blue" && !winner} color="blue" />
          </div>
          <div className="rounded-[14px] border border-line bg-slate p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brass">Trạng thái</p>
            <p className="mt-3 text-xl font-bold text-parchment">{winner ? winner === "draw" ? "Hòa điểm" : `${winner === "red" ? "Đỏ" : "Xanh"} thắng` : game.turn === "red" ? (computer ? "Lượt của bạn" : "Lượt Đỏ") : computer ? "Máy đang nghĩ" : "Lượt Xanh"}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{winner ? `Kết quả ${score.red}-${score.blue}.` : `${game.legalMoves().length} cạnh chưa dùng.`}</p>
          </div>
          <div className="rounded-[14px] border border-line bg-slate p-5 text-sm leading-6 text-muted">
            <p><span className="font-semibold text-parchment">Mẹo:</span> đừng để lại một ô có ba cạnh cho đối thủ.</p>
            <p className="mt-2">Đỏ đi trước. Màu của ô cho biết ai đã khép ô đó.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ScoreCard({ label, value, active, color }: { label: string; value: number; active: boolean; color: "red" | "blue" }) {
  return <div className={`rounded-[14px] border p-4 ${active ? "border-brass/55 bg-brass/[.07]" : "border-line bg-slate"}`}><div className="flex items-center gap-2 text-sm text-muted"><span className={`h-4 w-4 rounded-full border ${color === "red" ? "border-[#f4b0a0] bg-[#b94d3c]" : "border-[#a7d2e7] bg-[#477da0]"}`} />{label}</div><strong className="mt-2 block text-3xl text-parchment">{value}</strong></div>;
}
