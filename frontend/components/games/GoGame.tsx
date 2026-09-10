"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react/ArrowCounterClockwise";
import { Cpu } from "@phosphor-icons/react/Cpu";
import { UsersThree } from "@phosphor-icons/react/UsersThree";

import Button from "@/components/ui/Button";
import { chooseGoComputerMove, GoGame as GoState, GO_SIZE } from "@/lib/covay/rules";

export default function GoGame({ computer = false }: { computer?: boolean }) {
  const [game, setGame] = useState(() => new GoState());
  const legalKeys = useMemo(() => new Set(game.legalMoves().map((move) => `${move.row}:${move.col}`)), [game]);
  const winner = game.winner();
  const score = game.score();

  useEffect(() => {
    if (!computer || game.turn !== "white" || winner) return;
    const timer = setTimeout(() => {
      setGame((current) => {
        const move = chooseGoComputerMove(current);
        return move ? current.play(move.row, move.col) ?? current : current.pass() ?? current;
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [computer, game, winner]);

  const play = (row: number, col: number) => {
    if (!legalKeys.has(`${row}:${col}`) || winner || (computer && game.turn === "white")) return;
    setGame((current) => current.play(row, col) ?? current);
  };
  const pass = () => setGame((current) => current.pass() ?? current);
  const reset = () => setGame(new GoState());

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brass">Cờ Vây · 9×9</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.05em] text-parchment">Chiếm khí, nối vùng</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Đặt quân lên giao điểm, bắt nhóm hết khí và kết thúc bằng hai lần bỏ lượt. Bản này dùng luật ko đơn giản và chấm vùng cơ bản.</p>
        </div>
        <div className="flex gap-2">
          <Link href={computer ? "/covay/local" : "/covay/computer"} className="inline-flex min-h-10 items-center gap-2 rounded-[8px] border border-line px-3 text-sm font-semibold text-muted transition hover:border-brass/50 hover:text-parchment">{computer ? <UsersThree size={17} /> : <Cpu size={17} />}{computer ? "Hai người" : "Đấu máy"}</Link>
          <Button size="sm" onClick={reset}><ArrowCounterClockwise size={17} /> Ván mới</Button>
        </div>
      </header>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,620px)_250px] lg:items-start">
        <section className="rounded-[18px] border border-[#92714a]/50 bg-[#c99b61] p-3 shadow-[0_24px_70px_rgba(0,0,0,.28)] sm:p-6">
          <div className="grid aspect-square grid-cols-9 rounded-[8px] border border-[#6e4a2f]/55 bg-[#c99b61] p-[3%]">
            {Array.from({ length: GO_SIZE * GO_SIZE }, (_, index) => {
              const row = Math.floor(index / GO_SIZE); const col = index % GO_SIZE; const cell = game.board[row][col]; const key = `${row}:${col}`;
              return <button key={key} type="button" onClick={() => play(row, col)} disabled={!legalKeys.has(key) || Boolean(winner) || (computer && game.turn === "white")} aria-label={`Giao điểm ${row + 1}, ${col + 1}`} className="relative grid place-items-center border border-[#6e4a2f]/55 transition hover:bg-[#d5ae78] disabled:cursor-default"><span className="absolute h-[2px] w-full bg-[#6e4a2f]/55" /><span className="absolute h-full w-[2px] bg-[#6e4a2f]/55" />{cell && <span className={`relative z-10 aspect-square w-[78%] rounded-full border-2 shadow-[inset_-4px_-5px_8px_rgba(0,0,0,.3),0_3px_4px_rgba(0,0,0,.24)] ${cell === "black" ? "border-[#667078] bg-[#18232b]" : "border-[#fff5d5] bg-[#f2e7c5]"}`} />}{!cell && legalKeys.has(key) && !winner && <span className="relative z-10 h-2 w-2 rounded-full bg-[#fff0b7]/65" />}</button>;
            })}
          </div>
        </section>
        <aside className="space-y-4">
          <div className="grid grid-cols-2 gap-3"><Score label={computer ? "Bạn · Đen" : "Đen"} value={score.black} active={game.turn === "black" && !winner} dark /><Score label={computer ? "Máy · Trắng" : "Trắng"} value={score.white} active={game.turn === "white" && !winner} /></div>
          <div className="rounded-[14px] border border-line bg-slate p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-brass">Trạng thái</p><p className="mt-3 text-xl font-bold text-parchment">{winner ? winner === "draw" ? "Hòa" : `${winner === "black" ? "Đen" : "Trắng"} thắng` : game.turn === "black" ? "Lượt Đen" : computer ? "Máy đang nghĩ" : "Lượt Trắng"}</p><p className="mt-2 text-sm leading-6 text-muted">{winner ? `Điểm vùng ${score.black}–${score.white}.` : "Có thể bỏ lượt nếu muốn chuyển sang thế cuối ván."}</p><Button className="mt-5 w-full" variant="primary" onClick={pass} disabled={Boolean(winner) || (computer && game.turn === "white")}>Bỏ lượt</Button></div>
          <div className="rounded-[14px] border border-line bg-slate p-5 text-sm leading-6 text-muted">Quân bị bắt khi nhóm không còn giao điểm trống kề bên. Không được tự sát hoặc lặp lại ngay thế bàn trước.</div>
        </aside>
      </div>
    </div>
  );
}

function Score({ label, value, active, dark = false }: { label: string; value: number; active: boolean; dark?: boolean }) { return <div className={`rounded-[14px] border p-4 ${active ? "border-brass/55 bg-brass/[.07]" : "border-line bg-slate"}`}><div className="flex items-center gap-2 text-sm text-muted"><span className={`h-4 w-4 rounded-full border ${dark ? "border-[#667078] bg-[#18232b]" : "border-[#fff5d5] bg-[#f2e7c5]"}`} />{label}</div><strong className="mt-2 block text-3xl text-parchment">{value}</strong></div>; }
