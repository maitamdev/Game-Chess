"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react/ArrowCounterClockwise";
import { Cpu } from "@phosphor-icons/react/Cpu";
import { UsersThree } from "@phosphor-icons/react/UsersThree";

import Button from "@/components/ui/Button";
import {
  chooseGanhComputerMove,
  GanhGame as GanhState,
  GANH_SIZE,
} from "@/lib/coganh/rules";

export default function GanhGame({ computer = false }: { computer?: boolean }) {
  const [game, setGame] = useState(() => new GanhState());
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const winner = game.winner();
  const legal = useMemo(() => game.legalMoves(), [game]);
  const targets = useMemo(() => new Set(legal.filter((move) => !selected || (move.fromRow === selected[0] && move.fromCol === selected[1])).map((move) => `${move.toRow}:${move.toCol}`)), [legal, selected]);
  const score = game.score();

  useEffect(() => {
    if (!computer || game.turn !== "blue" || winner) return;
    const timer = setTimeout(() => {
      setGame((current) => {
        const move = chooseGanhComputerMove(current);
        return move ? current.play(move.fromRow, move.fromCol, move.toRow, move.toCol) ?? current : current;
      });
      setSelected(null);
    }, 420);
    return () => clearTimeout(timer);
  }, [computer, game, winner]);

  const click = (row: number, col: number) => {
    if (winner || (computer && game.turn === "blue")) return;
    const cell = game.board[row][col];
    if (selected && targets.has(`${row}:${col}`)) {
      setGame((current) => current.play(selected[0], selected[1], row, col) ?? current);
      setSelected(null);
      return;
    }
    if (cell === game.turn) setSelected([row, col]);
    else setSelected(null);
  };

  const reset = () => {
    setGame(new GanhState());
    setSelected(null);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brass">Cờ Gánh · game dân gian Việt</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.05em] text-parchment">Gánh, vây và thu phục</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Di chuyển từng bước trên lưới 5×5. Đưa quân vào giữa một đôi đối thủ để gánh, hoặc vây kín để đổi màu quân.</p>
        </div>
        <div className="flex gap-2">
          <Link href={computer ? "/coganh/local" : "/coganh/computer"} className="inline-flex min-h-10 items-center gap-2 rounded-[8px] border border-line px-3 text-sm font-semibold text-muted transition hover:border-brass/50 hover:text-parchment">
            {computer ? <UsersThree size={17} /> : <Cpu size={17} />}
            {computer ? "Hai người" : "Đấu máy"}
          </Link>
          <Button size="sm" onClick={reset}><ArrowCounterClockwise size={17} /> Ván mới</Button>
        </div>
      </header>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,620px)_minmax(240px,1fr)] lg:items-start">
        <section className="rounded-[18px] border border-[#9f704c]/45 bg-[#74513d] p-3 shadow-[0_24px_70px_rgba(0,0,0,.28)] sm:p-6">
          <div className="relative grid aspect-square grid-cols-5 overflow-hidden rounded-[10px] border-2 border-[#e1bd7c]/80 bg-[#b68156]">
            {Array.from({ length: GANH_SIZE * GANH_SIZE }, (_, index) => {
              const row = Math.floor(index / GANH_SIZE);
              const col = index % GANH_SIZE;
              const cell = game.board[row][col];
              const key = `${row}:${col}`;
              return (
                <button key={key} type="button" onClick={() => click(row, col)} className={`relative grid place-items-center border border-[#6f4e3b]/50 transition hover:bg-[#d2a36d] ${selected?.[0] === row && selected?.[1] === col ? "bg-[#ead083]/60" : targets.has(key) ? "bg-[#ecd595]/35" : ""}`} aria-label={`Giao điểm ${row + 1}, ${col + 1}`}>
                  <span className="pointer-events-none absolute inset-0 m-auto h-[2px] w-full bg-[#6f4e3b]/35" />
                  <span className="pointer-events-none absolute inset-0 m-auto h-full w-[2px] bg-[#6f4e3b]/35" />
                  {cell && <span className={`relative z-10 aspect-square w-[62%] rounded-full border-2 shadow-[inset_-4px_-5px_8px_rgba(0,0,0,.28),0_3px_5px_rgba(0,0,0,.22)] ${cell === "red" ? "border-[#ffd18b] bg-[#b9433e]" : "border-[#9bb0c7] bg-[#2b536f]"}`} />}
                  {!cell && targets.has(key) && <span className="relative z-10 h-3 w-3 rounded-full bg-[#fff3bc]/70" />}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Score label={computer ? "Bạn · Đỏ" : "Đỏ"} value={score.red} active={game.turn === "red" && !winner} />
            <Score label={computer ? "Máy · Xanh" : "Xanh"} value={score.blue} active={game.turn === "blue" && !winner} />
          </div>
          <div className="rounded-[14px] border border-line bg-slate p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brass">Trạng thái</p>
            <p className="mt-3 text-xl font-bold text-parchment">{winner ? winner === "draw" ? "Hòa" : `${winner === "red" ? "Đỏ" : "Xanh"} thắng` : game.turn === "red" ? "Lượt Đỏ" : computer ? "Máy đang nghĩ" : "Lượt Xanh"}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{winner ? "Đối thủ đã hết quân hoặc không còn nước đi." : selected ? "Chọn một giao điểm sáng để di chuyển." : "Chọn một quân của bạn."}</p>
          </div>
          <div className="rounded-[14px] border border-line bg-slate p-5 text-sm leading-6 text-muted">
            <p><span className="font-semibold text-parchment">Di chuyển:</span> một bước ngang, dọc hoặc chéo tới giao điểm trống.</p>
            <p className="mt-2"><span className="font-semibold text-parchment">Gánh:</span> đứng giữa hai quân đối thủ để thu phục cả đôi.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Score({ label, value, active }: { label: string; value: number; active: boolean }) {
  return <div className={`rounded-[14px] border p-4 ${active ? "border-brass/55 bg-brass/[.07]" : "border-line bg-slate"}`}><p className="text-sm text-muted">{label}</p><strong className="mt-2 block text-3xl text-parchment">{value}</strong></div>;
}
