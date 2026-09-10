"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react/ArrowCounterClockwise";
import { Cpu } from "@phosphor-icons/react/Cpu";
import { UsersThree } from "@phosphor-icons/react/UsersThree";

import Button from "@/components/ui/Button";
import {
  chooseReversiComputerMove,
  ReversiGame as ReversiState,
  REVERSI_SIZE,
  type ReversiColor,
} from "@/lib/reversi/rules";

export default function ReversiGame({ computer = false }: { computer?: boolean }) {
  const [game, setGame] = useState(() => new ReversiState());
  const legal = useMemo(() => game.legalMoves(), [game]);
  const legalKeys = useMemo(() => new Set(legal.map((move) => `${move.row}:${move.col}`)), [legal]);
  const score = game.score();
  const winner = game.winner();

  useEffect(() => {
    if (!computer || game.turn !== "white" || winner) return;
    const timer = setTimeout(() => {
      setGame((current) => {
        const move = chooseReversiComputerMove(current);
        return move ? current.play(move.row, move.col) ?? current : current.pass() ?? current;
      });
    }, 420);
    return () => clearTimeout(timer);
  }, [computer, game, winner]);

  const play = (row: number, col: number) => {
    if (winner || (computer && game.turn === "white")) return;
    setGame((current) => current.play(row, col) ?? current);
  };

  const pass = () => setGame((current) => current.pass() ?? current);
  const reset = () => setGame(new ReversiState());
  const turnLabel = game.turn === "black" ? (computer ? "Lượt của bạn" : "Lượt Đen") : computer ? "Máy đang nghĩ" : "Lượt Trắng";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brass">Reversi / Othello</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.05em] text-parchment">Lật thế trận bằng từng ô góc</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Đặt quân để kẹp và lật quân đối phương. Chiếm góc, giữ biên và kết thúc với nhiều quân hơn.</p>
        </div>
        <div className="flex gap-2">
          <Link href={computer ? "/reversi/local" : "/reversi/computer"} className="inline-flex min-h-10 items-center gap-2 rounded-[8px] border border-line px-3 text-sm font-semibold text-muted transition hover:border-brass/50 hover:text-parchment">
            {computer ? <UsersThree size={17} /> : <Cpu size={17} />}
            {computer ? "Hai người" : "Đấu máy"}
          </Link>
          <Button size="sm" onClick={reset}><ArrowCounterClockwise size={17} /> Ván mới</Button>
        </div>
      </header>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,620px)_minmax(240px,1fr)] lg:items-start">
        <section className="rounded-[18px] border border-line bg-[#164b43] p-2 shadow-[0_24px_70px_rgba(0,0,0,.28)] sm:p-4">
          <div className="grid aspect-square grid-cols-8 overflow-hidden rounded-[10px] border border-[#d9b96f]/40 bg-[#27715d]">
            {Array.from({ length: REVERSI_SIZE * REVERSI_SIZE }, (_, index) => {
              const row = Math.floor(index / REVERSI_SIZE);
              const col = index % REVERSI_SIZE;
              const cell = game.board[row][col];
              const isLegal = legalKeys.has(`${row}:${col}`);
              return (
                <button
                  key={`${row}-${col}`}
                  type="button"
                  aria-label={`Ô ${row + 1}, ${col + 1}`}
                  onClick={() => play(row, col)}
                  className="relative grid place-items-center border border-[#9ad5a0]/25 bg-[#27715d] transition hover:bg-[#32846b] disabled:cursor-default"
                  disabled={!isLegal || Boolean(winner) || (computer && game.turn === "white")}
                >
                  {isLegal && !winner && <span className="h-3 w-3 rounded-full bg-[#e6d49b]/65 sm:h-4 sm:w-4" />}
                  {cell && <span className={`aspect-square w-[72%] rounded-full border-2 shadow-[inset_-5px_-6px_10px_rgba(0,0,0,.28),0_3px_5px_rgba(0,0,0,.25)] ${cell === "black" ? "border-[#6d7775] bg-[#172329]" : "border-[#fff4d3] bg-[#f2e8cd]"}`} />}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <ScoreCard label={computer ? "Bạn · Đen" : "Đen"} value={score.black} active={game.turn === "black" && !winner} color="black" />
            <ScoreCard label={computer ? "Máy · Trắng" : "Trắng"} value={score.white} active={game.turn === "white" && !winner} color="white" />
          </div>
          <div className="rounded-[14px] border border-line bg-slate p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brass">Trạng thái</p>
            <p className="mt-3 text-xl font-bold text-parchment">{winner ? winner === "draw" ? "Hòa cờ" : `${winner === "black" ? "Đen" : "Trắng"} thắng` : turnLabel}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{winner ? `Kết quả ${score.black}–${score.white}.` : legal.length > 0 ? `${legal.length} nước hợp lệ đang mở.` : "Không còn nước hợp lệ, cần bỏ lượt."}</p>
            {!winner && legal.length === 0 && <Button className="mt-5 w-full" variant="primary" onClick={pass} disabled={computer && game.turn === "white"}>Bỏ lượt</Button>}
          </div>
          <div className="rounded-[14px] border border-line bg-slate p-5 text-sm leading-6 text-muted">
            <p><span className="font-semibold text-parchment">Luật nhanh:</span> quân mới phải kẹp ít nhất một dãy quân đối thủ giữa nó và quân cùng màu.</p>
            <p className="mt-2">Hai bên liên tiếp không đi được hoặc bàn đầy thì ván kết thúc.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ScoreCard({ label, value, active, color }: { label: string; value: number; active: boolean; color: ReversiColor }) {
  return (
    <div className={`rounded-[14px] border p-4 ${active ? "border-brass/55 bg-brass/[.07]" : "border-line bg-slate"}`}>
      <div className="flex items-center gap-2 text-sm text-muted"><span className={`h-4 w-4 rounded-full border ${color === "black" ? "border-[#6d7775] bg-[#172329]" : "border-[#fff4d3] bg-[#f2e8cd]"}`} />{label}</div>
      <strong className="mt-2 block text-3xl text-parchment">{value}</strong>
    </div>
  );
}
