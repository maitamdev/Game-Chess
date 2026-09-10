"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react/ArrowCounterClockwise";
import { Cpu } from "@phosphor-icons/react/Cpu";
import { UsersThree } from "@phosphor-icons/react/UsersThree";

import Button from "@/components/ui/Button";
import { allCheckersCoords, campFor, chooseChineseCheckersMove, ChineseCheckersGame as CheckersState, coordKey, CHECKERS_RADIUS, type ChineseCheckersCoord } from "@/lib/checkers/rules";

export default function ChineseCheckersGame({ computer = false }: { computer?: boolean }) {
  const [game, setGame] = useState(() => new CheckersState());
  const [selected, setSelected] = useState<ChineseCheckersCoord | null>(null);
  const winner = game.winner();
  const targets = useMemo(() => new Set(selected ? game.destinations(selected).map((move) => coordKey(move.to)) : []), [game, selected]);
  const coords = useMemo(() => allCheckersCoords(), []);

  useEffect(() => {
    if (!computer || game.turn !== "yellow" || winner) return;
    const timer = setTimeout(() => {
      setGame((current) => {
        const move = chooseChineseCheckersMove(current);
        return move ? current.play(move.from, move.to) ?? current : current;
      });
      setSelected(null);
    }, 400);
    return () => clearTimeout(timer);
  }, [computer, game, winner]);

  const click = (coord: ChineseCheckersCoord) => {
    if (winner || (computer && game.turn === "yellow")) return;
    const key = coordKey(coord);
    if (selected && targets.has(key)) {
      setGame((current) => current.play(selected, coord) ?? current);
      setSelected(null);
    } else if (game.board[key] === game.turn) setSelected(coord);
    else setSelected(null);
  };
  const reset = () => { setGame(new CheckersState()); setSelected(null); };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-brass">Chinese Checkers · 2 người</p><h1 className="mt-2 text-4xl font-extrabold tracking-[-0.05em] text-parchment">Nhảy liên hoàn về trại</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Đi một bước hoặc nhảy qua quân đang chiếm chỗ. Đưa đủ 10 quân của bạn sang trại đối diện.</p></div>
        <div className="flex gap-2"><Link href={computer ? "/checkers/local" : "/checkers/computer"} className="inline-flex min-h-10 items-center gap-2 rounded-[8px] border border-line px-3 text-sm font-semibold text-muted transition hover:border-brass/50 hover:text-parchment">{computer ? <UsersThree size={17} /> : <Cpu size={17} />}{computer ? "Hai người" : "Đấu máy"}</Link><Button size="sm" onClick={reset}><ArrowCounterClockwise size={17} /> Ván mới</Button></div>
      </header>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,620px)_250px] lg:items-start">
        <section className="rounded-[18px] border border-[#4a6d98]/55 bg-[#31527a] p-3 shadow-[0_24px_70px_rgba(0,0,0,.28)] sm:p-6">
          <div className="grid aspect-square grid-cols-9 gap-1 rounded-[12px] bg-[#263f62] p-2 sm:gap-1.5 sm:p-3">
            {Array.from({ length: (CHECKERS_RADIUS * 2 + 1) ** 2 }, (_, index) => {
              const row = Math.floor(index / (CHECKERS_RADIUS * 2 + 1)); const col = index % (CHECKERS_RADIUS * 2 + 1); const coord = { q: col - CHECKERS_RADIUS, r: row - CHECKERS_RADIUS }; const key = coordKey(coord); const valid = coords.some((cell) => cell.q === coord.q && cell.r === coord.r); const cell = game.board[key];
              if (!valid) return <span key={key} aria-hidden />;
              const selectedCell = selected && coordKey(selected) === key;
              const goal = campFor(game.turn === "red" ? "yellow" : "red").some((target) => coordKey(target) === key);
              return <button key={key} type="button" onClick={() => click(coord)} aria-label={`Ô ${row + 1}, ${col + 1}`} className={`relative grid place-items-center rounded-full border transition ${selectedCell ? "border-brass bg-brass/35" : targets.has(key) ? "border-[#f5df9b] bg-[#f5df9b]/30" : goal ? "border-white/20 bg-white/[.07]" : "border-white/10 bg-[#1d3150]"}`}><span className={`aspect-square w-[70%] rounded-full border shadow-[inset_-3px_-4px_6px_rgba(0,0,0,.28),0_2px_3px_rgba(0,0,0,.22)] ${cell === "red" ? "border-[#ffce8a] bg-[#d55b57]" : cell === "yellow" ? "border-[#fff0a8] bg-[#e1bc4f]" : "border-transparent"}`} /></button>;
            })}
          </div>
        </section>
        <aside className="space-y-4"><div className="rounded-[14px] border border-line bg-slate p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-brass">Trạng thái</p><p className="mt-3 text-xl font-bold text-parchment">{winner ? `${winner === "red" ? "Đỏ" : "Vàng"} về trại` : game.turn === "red" ? "Lượt Đỏ" : computer ? "Máy đang nghĩ" : "Lượt Vàng"}</p><p className="mt-2 text-sm leading-6 text-muted">{winner ? "Đủ 10 quân đã vào trại đối diện." : selected ? "Chọn ô sáng để đi hoặc nhảy tiếp." : "Chọn một quân của bạn."}</p></div><div className="rounded-[14px] border border-line bg-slate p-5 text-sm leading-6 text-muted"><p><span className="font-semibold text-parchment">Bạn:</span> Đỏ</p><p><span className="font-semibold text-parchment">Máy:</span> Vàng</p><p className="mt-2">Các điểm mờ là vùng trại mục tiêu.</p></div></aside>
      </div>
    </div>
  );
}
