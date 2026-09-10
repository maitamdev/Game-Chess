"use client";

import { useEffect, useState } from "react";
import { Trophy } from "@phosphor-icons/react/Trophy";

import { api } from "@/lib/api";

interface Entry {
  rank: number;
  player: { id: string; username: string };
  rating: number;
  games: number;
  wins: number;
  draws: number;
  losses: number;
}

const games = [
  ["chess", "Cờ vua"],
  ["xiangqi", "Cờ tướng"],
  ["caro", "Caro"],
  ["jungle", "Cờ thú"],
  ["oanquan", "Ô ăn quan"],
  ["reversi", "Reversi"],
  ["connect4", "Connect Four"],
] as const;

export default function LeaderboardPage() {
  const [game, setGame] = useState("chess");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void api<{ entries: Entry[] }>(`/api/leaderboard?game=${game}`)
      .then((data) => setEntries(data.entries))
      .finally(() => setLoading(false));
  }, [game]);

  return (
    <div className="app-shell py-10 sm:py-14">
      <header className="max-w-2xl">
        <span className="grid h-12 w-12 place-items-center rounded-[12px] border border-brass/35 bg-brass/10 text-brass"><Trophy size={27} weight="duotone" aria-hidden /></span>
        <h1 className="mt-6 text-4xl font-extrabold tracking-[-0.045em]">Leaderboard</h1>
        <p className="mt-4 leading-7 text-muted">Xếp hạng rating theo từng game. Chỉ những ván online đã kết thúc mới được tính.</p>
      </header>
      <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
        {games.map(([id, label]) => <button key={id} type="button" onClick={() => setGame(id)} className={`shrink-0 rounded-[8px] border px-4 py-2 text-sm font-semibold transition ${game === id ? "border-brass bg-brass/12 text-brass" : "border-line text-muted hover:border-brass/45"}`}>{label}</button>)}
      </div>
      <section className="mt-4 overflow-hidden rounded-[14px] border border-line bg-slate">
        {loading ? <div className="p-8 text-sm text-muted">Đang tải bảng xếp hạng...</div> : entries.length === 0 ? <div className="p-8 text-sm text-muted">Chưa có người chơi được xếp hạng.</div> : <div className="divide-y divide-line">{entries.map((entry) => <div key={entry.player.id} className="grid grid-cols-[48px_minmax(0,1fr)_90px_110px] items-center gap-3 px-4 py-4 sm:px-6"><span className={`font-[family-name:var(--font-mono)] text-lg font-bold ${entry.rank <= 3 ? "text-brass" : "text-muted"}`}>#{entry.rank}</span><div className="min-w-0"><p className="truncate font-semibold text-parchment">{entry.player.username}</p><p className="mt-1 text-xs text-muted">{entry.wins} thắng · {entry.draws} hòa · {entry.losses} thua</p></div><strong className="font-[family-name:var(--font-mono)] text-right text-lg text-brass">{entry.rating}</strong><span className="text-right text-xs text-muted">{entry.games} ván</span></div>)}</div>}
      </section>
    </div>
  );
}
