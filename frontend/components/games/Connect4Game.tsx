"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react/ArrowCounterClockwise";
import { Cpu } from "@phosphor-icons/react/Cpu";
import { UsersThree } from "@phosphor-icons/react/UsersThree";

import Button from "@/components/ui/Button";
import {
  chooseConnect4ComputerColumn,
  Connect4Game as Connect4State,
  CONNECT4_COLS,
  CONNECT4_ROWS,
} from "@/lib/connect4/rules";

export default function Connect4Game({ computer = false }: { computer?: boolean }) {
  const [game, setGame] = useState(() => new Connect4State());
  const winner = game.winner();
  const validColumns = useMemo(() => new Set(game.validColumns()), [game]);

  useEffect(() => {
    if (!computer || game.turn !== "yellow" || winner) return;
    const timer = setTimeout(() => {
      setGame((current) => {
        const column = chooseConnect4ComputerColumn(current);
        return column === null ? current : current.play(column) ?? current;
      });
    }, 420);
    return () => clearTimeout(timer);
  }, [computer, game, winner]);

  const play = (column: number) => {
    if (winner || (computer && game.turn === "yellow")) return;
    setGame((current) => current.play(column) ?? current);
  };
  const reset = () => setGame(new Connect4State());

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brass">Connect Four</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.05em] text-parchment">Bốn quân nối thành hàng</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Thả quân vào cột, tạo chuỗi bốn quân ngang, dọc hoặc chéo trước đối thủ.</p>
        </div>
        <div className="flex gap-2">
          <Link href={computer ? "/connect4/local" : "/connect4/computer"} className="inline-flex min-h-10 items-center gap-2 rounded-[8px] border border-line px-3 text-sm font-semibold text-muted transition hover:border-brass/50 hover:text-parchment">
            {computer ? <UsersThree size={17} /> : <Cpu size={17} />}
            {computer ? "Hai người" : "Đấu máy"}
          </Link>
          <Button size="sm" onClick={reset}><ArrowCounterClockwise size={17} /> Ván mới</Button>
        </div>
      </header>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,660px)_250px] lg:items-start">
        <section className="rounded-[20px] border border-[#375f9b] bg-[#214a8c] p-3 shadow-[0_24px_70px_rgba(0,0,0,.28)] sm:p-6">
          <div className="grid grid-cols-7 gap-1.5 rounded-[12px] bg-[#1a3e78] p-2 sm:gap-2 sm:p-3">
            {Array.from({ length: CONNECT4_ROWS * CONNECT4_COLS }, (_, index) => {
              const row = Math.floor(index / CONNECT4_COLS);
              const col = index % CONNECT4_COLS;
              const cell = game.board[row][col];
              return (
                <button
                  key={`${row}-${col}`}
                  type="button"
                  aria-label={`Hàng ${row + 1}, cột ${col + 1}`}
                  onClick={() => play(col)}
                  disabled={!validColumns.has(col) || Boolean(winner) || (computer && game.turn === "yellow")}
                  className="aspect-square rounded-full bg-[#102d5a] p-1 transition hover:bg-[#163b73] disabled:cursor-default sm:p-2"
                >
                  <span className={`block aspect-square rounded-full border ${cell === "red" ? "border-[#ffb05e] bg-[#e66555] shadow-[inset_-5px_-5px_8px_rgba(126,29,23,.35)]" : cell === "yellow" ? "border-[#fff0a3] bg-[#f0c95d] shadow-[inset_-5px_-5px_8px_rgba(133,90,16,.28)]" : "border-[#274c87] bg-[#0d2850]"}`} />
                </button>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1.5 sm:gap-2">
            {Array.from({ length: CONNECT4_COLS }, (_, col) => <Button key={col} size="sm" variant="ghost" onClick={() => play(col)} disabled={!validColumns.has(col) || Boolean(winner) || (computer && game.turn === "yellow")} aria-label={`Thả vào cột ${col + 1}`}>↓</Button>)}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-[14px] border border-line bg-slate p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brass">Trạng thái</p>
            <p className="mt-3 text-xl font-bold text-parchment">{winner ? winner === "draw" ? "Hòa cờ" : `${winner === "red" ? "Đỏ" : "Vàng"} thắng` : game.turn === "red" ? (computer ? "Lượt của bạn" : "Lượt Đỏ") : computer ? "Máy đang nghĩ" : "Lượt Vàng"}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{winner ? "Bàn đã kín hoặc đã có chuỗi bốn quân." : "Chọn một cột còn trống để thả quân."}</p>
          </div>
          <div className="rounded-[14px] border border-line bg-slate p-5 text-sm leading-6 text-muted">
            <p><span className="font-semibold text-parchment">Bạn:</span> Đỏ</p>
            <p><span className="font-semibold text-parchment">Máy:</span> Vàng</p>
            <p className="mt-2">Máy ưu tiên cột trung tâm để tạo thế liên kết.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
