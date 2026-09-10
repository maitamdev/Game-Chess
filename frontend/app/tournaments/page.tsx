"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ArrowRight";
import { FlagBanner } from "@phosphor-icons/react/FlagBanner";
import { Trophy } from "@phosphor-icons/react/Trophy";

import { api } from "@/lib/api";
import { GAME_DEFINITIONS, BOARD_GAME_IDS } from "@/lib/games/registry";

interface Tournament {
  id: string;
  slug: string;
  title: string;
  game_type: string;
  format: string;
  status: string;
  max_players: number;
  participant_count: number;
  starts_at: string | null;
  ends_at: string | null;
  season: { id: string; slug: string; name: string } | null;
}

interface Season {
  id: string;
  slug: string;
  name: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
}

const FILTERS = [
  ["all", "Tất cả"],
  ["open", "Sắp mở"],
  ["live", "Đang diễn ra"],
  ["finished", "Đã kết thúc"],
] as const;

function dateLabel(value: string | null): string {
  if (!value) return "Chưa chốt lịch";
  return new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function gameTitle(value: string): string {
  return value in GAME_DEFINITIONS
    ? GAME_DEFINITIONS[value as keyof typeof GAME_DEFINITIONS].title
    : value;
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");
  const [game, setGame] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api<{ tournaments: Tournament[] }>(
        `/api/tournaments${filter === "all" ? "" : `?status=${filter}`}`,
      ),
      api<{ seasons: Season[] }>("/api/seasons"),
    ])
      .then(([tournamentData, seasonData]) => {
        if (cancelled) return;
        setTournaments(tournamentData.tournaments);
        setSeasons(seasonData.seasons);
        setError(false);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter]);

  const visible = useMemo(
    () => (game === "all" ? tournaments : tournaments.filter((item) => item.game_type === game)),
    [game, tournaments],
  );

  return (
    <div className="app-shell py-10 sm:py-14">
      <header className="grid gap-7 rounded-[18px] border border-brass/35 bg-[linear-gradient(125deg,rgba(214,174,85,.14),rgba(16,28,35,.94)_55%,rgba(7,17,23,.98))] p-7 sm:p-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(240px,.8fr)] lg:p-14">
        <div>
          <span className="inline-flex items-center gap-2 text-brass"><FlagBanner size={20} weight="duotone" aria-hidden /><span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em]">Đấu trường theo mùa</span></span>
          <h1 className="mt-5 max-w-2xl text-4xl font-extrabold tracking-[-0.055em] sm:text-6xl">Giải đấu để mỗi ván có ý nghĩa hơn.</h1>
          <p className="mt-5 max-w-xl leading-7 text-muted">Đăng ký một game, tích điểm theo mùa và để tên mình xuất hiện trên bảng thành tích dài hạn của Kỳ Đài.</p>
        </div>
        <div className="flex flex-col justify-end rounded-[14px] border border-white/10 bg-ink/35 p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brass">Mùa hiện tại</p>
          {seasons[0] ? <><strong className="mt-3 text-2xl text-parchment">{seasons[0].name}</strong><p className="mt-2 text-sm text-muted">{dateLabel(seasons[0].starts_at)} – {dateLabel(seasons[0].ends_at)} · {seasons[0].status === "active" ? "Đang mở" : "Theo dõi lịch"}</p></> : <p className="mt-3 text-sm text-muted">Mùa mới đang được chuẩn bị.</p>}
          <Link href="/leaderboard" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brass hover:text-[#f2d486]">Xem bảng xếp hạng <ArrowRight size={16} /></Link>
        </div>
      </header>

      <section className="mt-8 flex flex-col gap-3 border-y border-line py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">{FILTERS.map(([id, label]) => <button key={id} type="button" onClick={() => setFilter(id)} className={`shrink-0 rounded-[8px] border px-4 py-2 text-sm font-semibold transition ${filter === id ? "border-brass bg-brass/12 text-brass" : "border-line text-muted hover:border-brass/45 hover:text-parchment"}`}>{label}</button>)}</div>
        <select value={game} onChange={(event) => setGame(event.target.value)} className="min-h-10 rounded-[8px] border border-line bg-slate px-3 text-sm text-parchment outline-none focus:border-brass"><option value="all">Tất cả game</option>{BOARD_GAME_IDS.map((id) => <option key={id} value={id}>{gameTitle(id)}</option>)}</select>
      </section>

      <section className="mt-7">
        <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.17em] text-brass">Lịch thi đấu</p><h2 className="mt-2 text-2xl font-bold text-parchment">Chọn thử thách của bạn</h2></div><span className="text-sm text-muted">{visible.length} giải</span></div>
        {loading ? <div className="mt-5 grid gap-3 md:grid-cols-2"><Skeleton /><Skeleton /><Skeleton /><Skeleton /></div> : error ? <div className="mt-5 rounded-[12px] border border-rust/45 bg-rust/10 p-7 text-sm text-muted">Chưa tải được lịch giải. Thử tải lại sau nhé.</div> : visible.length === 0 ? <div className="mt-5 rounded-[14px] border border-dashed border-line px-6 py-14 text-center"><Trophy size={34} className="mx-auto text-muted" /><p className="mt-4 font-semibold text-parchment">Chưa có giải phù hợp</p><p className="mt-1 text-sm text-muted">Lịch mới sẽ xuất hiện ở đây khi ban tổ chức mở đăng ký.</p></div> : <div className="mt-5 grid gap-4 md:grid-cols-2">{visible.map((item) => <TournamentCard key={item.id} tournament={item} />)}</div>}
      </section>
    </div>
  );
}

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const open = tournament.status === "open";
  return <Link href={`/tournaments/${tournament.slug}`} className="group flex min-h-[235px] flex-col rounded-[14px] border border-line bg-slate p-6 transition duration-300 hover:-translate-y-0.5 hover:border-brass/55 sm:p-7"><div className="flex items-start justify-between gap-4"><span className="rounded-full border border-brass/35 bg-brass/10 px-3 py-1 text-xs font-bold text-brass">{gameTitle(tournament.game_type)}</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${open ? "bg-sage/15 text-sage" : tournament.status === "live" ? "bg-brass/15 text-brass" : "bg-white/[.06] text-muted"}`}>{open ? "Mở đăng ký" : tournament.status === "live" ? "Đang diễn ra" : tournament.status}</span></div><h3 className="mt-7 text-xl font-bold tracking-[-0.03em] text-parchment">{tournament.title}</h3><p className="mt-2 flex-1 text-sm leading-6 text-muted">{tournament.format === "single_elimination" ? "Loại trực tiếp" : tournament.format === "leaderboard" ? "Tích điểm bảng tổng" : "Swiss nhiều vòng"} · {dateLabel(tournament.starts_at)} bắt đầu</p><div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-xs text-muted"><span>{tournament.participant_count}/{tournament.max_players} người</span><span className="inline-flex items-center gap-1 font-bold text-brass transition group-hover:gap-2">Xem giải <ArrowRight size={15} /></span></div></Link>;
}

function Skeleton() {
  return <div className="h-[235px] animate-pulse rounded-[14px] border border-line bg-slate" />;
}
