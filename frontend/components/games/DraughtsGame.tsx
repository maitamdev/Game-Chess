"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react/ArrowCounterClockwise";
import { Cpu } from "@phosphor-icons/react/Cpu";
import { CrownSimple } from "@phosphor-icons/react/CrownSimple";
import { UsersThree } from "@phosphor-icons/react/UsersThree";
import Button from "@/components/ui/Button";
import { chooseDraughtsMove, DraughtsGame as DraughtsState, DRAUGHTS_SIZE, type DraughtsCoord } from "@/lib/draughts/rules";

export default function DraughtsGame({ computer = false }: { computer?: boolean }) {
  const [game, setGame] = useState(() => new DraughtsState());
  const [selected, setSelected] = useState<DraughtsCoord | null>(null);
  const winner = game.winner();
  const legal = useMemo(() => game.legalMoves(), [game]);
  const legalKeys = useMemo(() => new Set(legal.map((move) => `${move.to.row}:${move.to.col}`)), [legal]);

  useEffect(() => {
    if (!computer || game.turn !== "black" || winner) return;
    const timer = setTimeout(() => {
      setGame((current) => {
        const move = chooseDraughtsMove(current);
        return move ? current.play(move) ?? current : current;
      });
      setSelected(null);
    }, 420);
    return () => clearTimeout(timer);
  }, [computer, game, winner]);

  const clickSquare = (row: number, col: number) => {
    if (winner || (computer && game.turn === "black")) return;
    if (selected) {
      const move = legal.find((candidate) => candidate.from.row === selected.row && candidate.from.col === selected.col && candidate.to.row === row && candidate.to.col === col);
      if (move) {
        setGame((current) => current.play(move) ?? current);
        setSelected(null);
        return;
      }
    }
    if (game.board[row][col]?.color === game.turn) setSelected({ row, col });
    else setSelected(null);
  };

  const reset = () => {
    setGame(new DraughtsState());
    setSelected(null);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brass">Cờ Đam 8×8</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.05em] text-parchment">Bắt quân, lên vua, khóa đường</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Ăn là bắt buộc. Khi còn đường ăn, mọi nước đi thường đều bị khóa lại.</p>
        </div>
        <div className="flex gap-2">
          <Link href={computer ? "/draughts/local" : "/draughts/computer"} className="inline-flex min-h-10 items-center gap-2 rounded-[8px] border border-line px-3 text-sm font-semibold text-muted transition hover:border-brass/50 hover:text-parchment">
            {computer ? <UsersThree size={17} /> : <Cpu size={17} />}
            {computer ? "Hai người" : "Đấu máy"}
          </Link>
          <Button size="sm" onClick={reset}><ArrowCounterClockwise size={17} /> Ván mới</Button>
        </div>
      </header>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,620px)_minmax(240px,1fr)] lg:items-start">
        <section className="rounded-[18px] border border-[#795f3b] bg-[#34271f] p-3 shadow-[0_24px_70px_rgba(0,0,0,.3)] sm:p-5">
          <div className="grid aspect-square grid-cols-8 overflow-hidden rounded-[10px] border border-[#d7ae65]/45">
            {Array.from({ length: DRAUGHTS_SIZE * DRAUGHTS_SIZE }, (_, index) => {
              const row = Math.floor(index / DRAUGHTS_SIZE);
              const col = index % DRAUGHTS_SIZE;
              const piece = game.board[row][col];
              const dark = (row + col) % 2 === 1;
              const isSelected = selected?.row === row && selected.col === col;
              const isLegal = legalKeys.has(`${row}:${col}`);
              return (
                <button key={`${row}-${col}`} type="button" onClick={() => clickSquare(row, col)} aria-label={`Ô ${row + 1}, ${col + 1}`} className={`relative grid place-items-center transition ${dark ? "bg-[#70502f] hover:bg-[#8a6338]" : "bg-[#d4b57d] hover:bg-[#e2c997]"} ${isSelected ? "z-[1] ring-4 ring-inset ring-brass" : ""}`}>
                  {isLegal && <span className="absolute h-3 w-3 rounded-full bg-brass/90 shadow-[0_0_0_4px_rgba(7,17,23,.18)] sm:h-4 sm:w-4" />}
                  {piece && <span className={`relative z-[1] grid aspect-square w-[76%] place-items-center rounded-full border-2 shadow-[inset_-5px_-6px_10px_rgba(0,0,0,.28),0_4px_6px_rgba(0,0,0,.25)] ${piece.color === "red" ? "border-[#f4b0a0] bg-[#b94d3c]" : "border-[#b9c7ca] bg-[#293940]"}`}>{piece.king && <CrownSimple size={20} weight="fill" className="text-[#f4dc9d]" aria-label="Quân vua" />}</span>}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <ScoreCard label={computer ? "Bạn · Đỏ" : "Đỏ"} value={game.board.flat().filter((piece) => piece?.color === "red").length} active={game.turn === "red" && !winner} color="red" />
            <ScoreCard label={computer ? "Máy · Đen" : "Đen"} value={game.board.flat().filter((piece) => piece?.color === "black").length} active={game.turn === "black" && !winner} color="black" />
          </div>
          <div className="rounded-[14px] border border-line bg-slate p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brass">Trạng thái</p>
            <p className="mt-3 text-xl font-bold text-parchment">{winner ? `${winner === "red" ? "Đỏ" : "Đen"} thắng` : game.turn === "red" ? (computer ? "Lượt của bạn" : "Lượt Đỏ") : computer ? "Máy đang nghĩ" : "Lượt Đen"}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{winner ? "Đối thủ đã hết quân hoặc không còn nước đi." : legal.some((move) => move.jumped) ? "Đang có nước bắt bắt buộc." : `${legal.length} nước đi đang mở.`}</p>
          </div>
          <div className="rounded-[14px] border border-line bg-slate p-5 text-sm leading-6 text-muted">
            <p><span className="font-semibold text-parchment">Đỏ:</span> đi lên và đi trước.</p>
            <p className="mt-2"><span className="font-semibold text-parchment">Vua:</span> đi chéo hai chiều sau khi chạm hàng cuối.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ScoreCard({ label, value, active, color }: { label: string; value: number; active: boolean; color: "red" | "black" }) {
  return <div className={`rounded-[14px] border p-4 ${active ? "border-brass/55 bg-brass/[.07]" : "border-line bg-slate"}`}><div className="flex items-center gap-2 text-sm text-muted"><span className={`h-4 w-4 rounded-full border ${color === "red" ? "border-[#f4b0a0] bg-[#b94d3c]" : "border-[#b9c7ca] bg-[#293940]"}`} />{label}</div><strong className="mt-2 block text-3xl text-parchment">{value}</strong></div>;
}
