"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/ArrowLeft";
import { CheckCircle } from "@phosphor-icons/react/CheckCircle";
import { FlagBanner } from "@phosphor-icons/react/FlagBanner";
import { Trophy } from "@phosphor-icons/react/Trophy";

import Button from "@/components/ui/Button";
import { api, ApiError } from "@/lib/api";
import { GAME_DEFINITIONS } from "@/lib/games/registry";

interface TournamentDetail {
  id: string;
  slug: string;
  title: string;
  game_type: string;
  format: string;
  status: string;
  max_players: number;
  starts_at: string | null;
  ends_at: string | null;
  viewer_registered: boolean;
  season: { name: string } | null;
  participants: Array<{ rank: number; player: { id: string; username: string }; score: number; wins: number; draws: number; losses: number; status: string }>;
  matches: Array<{ id: string; round: number; match_number: number; player_a_id: string | null; player_b_id: string | null; status: string }>;
}

function label(value: string | null): string {
  return value ? new Date(value).toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" }) : "Chưa chốt";
}

export default function TournamentDetailPage() {
  const params = useParams<{ tournamentId: string }>();
  const router = useRouter();
  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    void api<TournamentDetail>(`/api/tournaments/${params.tournamentId}`)
      .then(setTournament)
      .catch((cause) => setMessage(cause instanceof ApiError ? cause.message : "Không tải được giải đấu"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [params.tournamentId]);

  const join = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const next = await api<TournamentDetail>(`/api/tournaments/${params.tournamentId}/join`, { body: {} });
      setTournament(next);
      setMessage("Đã ghi danh. Hẹn gặp bạn trên bàn đấu.");
    } catch (cause) {
      setMessage(cause instanceof ApiError ? cause.message : "Chưa thể đăng ký lúc này");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="app-shell py-12 text-sm text-muted">Đang tải thông tin giải...</div>;
  if (!tournament) return <div className="app-shell py-12"><p className="text-sm text-muted">{message ?? "Không tìm thấy giải đấu."}</p><Link href="/tournaments" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brass"><ArrowLeft size={16} /> Về sảnh giải</Link></div>;

  const gameTitle = tournament.game_type in GAME_DEFINITIONS ? GAME_DEFINITIONS[tournament.game_type as keyof typeof GAME_DEFINITIONS].title : tournament.game_type;
  const canJoin = tournament.status === "open" && !tournament.viewer_registered;

  return <div className="app-shell py-10 sm:py-14"><Link href="/tournaments" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-brass"><ArrowLeft size={16} /> Sảnh giải đấu</Link><header className="mt-7 grid gap-6 rounded-[18px] border border-brass/35 bg-[linear-gradient(125deg,rgba(214,174,85,.14),rgba(16,28,35,.94)_58%,rgba(7,17,23,.98))] p-7 sm:p-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:p-14"><div><span className="inline-flex items-center gap-2 text-brass"><FlagBanner size={20} weight="duotone" aria-hidden /><span className="font-mono text-[11px] uppercase tracking-[0.18em]">{gameTitle} · {tournament.season?.name ?? "Giải độc lập"}</span></span><h1 className="mt-5 text-4xl font-extrabold tracking-[-0.055em] sm:text-6xl">{tournament.title}</h1><p className="mt-5 max-w-2xl leading-7 text-muted">{tournament.format === "single_elimination" ? "Loại trực tiếp, mỗi trận là một bước gần hơn tới chiếc cúp." : tournament.format === "leaderboard" ? "Tích lũy điểm trong thời gian mở giải để leo lên bảng tổng." : "Swiss nhiều vòng, ghép đối thủ theo thành tích để mỗi trận đều đáng chơi."}</p></div><div className="flex flex-col justify-end rounded-[14px] border border-white/10 bg-ink/35 p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-brass">Trạng thái</p><strong className="mt-3 text-2xl text-parchment">{tournament.status === "open" ? "Đang mở đăng ký" : tournament.status === "live" ? "Đang thi đấu" : tournament.status}</strong><p className="mt-2 text-sm text-muted">Bắt đầu: {label(tournament.starts_at)}</p>{canJoin ? <Button variant="primary" className="mt-5 w-full" onClick={() => void join()} disabled={busy}>{busy ? "Đang ghi danh..." : "Đăng ký tham gia"}</Button> : tournament.viewer_registered ? <p className="mt-5 inline-flex items-center justify-center gap-2 rounded-[8px] border border-sage/40 bg-sage/10 px-4 py-3 text-sm font-bold text-sage"><CheckCircle size={18} /> Đã ghi danh</p> : null}</div></header>{message && <p className="mt-4 rounded-[8px] border border-brass/35 bg-brass/10 px-4 py-3 text-sm text-brass">{message}</p>}<div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.72fr)]"><section className="overflow-hidden rounded-[14px] border border-line bg-slate"><div className="flex items-center justify-between border-b border-line px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brass">Bảng xếp hạng</p><h2 className="mt-1 text-xl font-bold text-parchment">Những người đang tranh tài</h2></div><span className="text-sm text-muted">{tournament.participants.length}/{tournament.max_players}</span></div>{tournament.participants.length === 0 ? <p className="p-8 text-sm text-muted">Chưa có người đăng ký. Hãy là người đầu tiên.</p> : <div className="divide-y divide-line">{tournament.participants.map((entry) => <div key={entry.player.id} className="grid grid-cols-[42px_minmax(0,1fr)_74px_92px] items-center gap-3 px-5 py-4"><span className={`font-mono text-lg font-bold ${entry.rank <= 3 ? "text-brass" : "text-muted"}`}>#{entry.rank}</span><div className="min-w-0"><p className="truncate font-semibold text-parchment">{entry.player.username}</p><p className="mt-1 text-xs text-muted">{entry.wins} thắng · {entry.draws} hòa · {entry.losses} thua</p></div><strong className="text-right font-mono text-brass">{entry.score}</strong><span className="text-right text-xs text-muted">{entry.status}</span></div>)}</div>}</section><aside className="space-y-4"><div className="rounded-[14px] border border-line bg-slate p-5"><div className="flex items-center gap-3"><Trophy size={22} className="text-brass" /><h2 className="font-bold text-parchment">Thể lệ nhanh</h2></div><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-muted">Game</dt><dd className="font-semibold text-parchment">{gameTitle}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted">Thể thức</dt><dd className="font-semibold text-parchment">{tournament.format}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted">Kết thúc</dt><dd className="text-right font-semibold text-parchment">{label(tournament.ends_at)}</dd></div></dl></div><div className="rounded-[14px] border border-line bg-slate p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-brass">Lịch cặp đấu</p>{tournament.matches.length === 0 ? <p className="mt-3 text-sm leading-6 text-muted">Cặp đấu sẽ được ghép sau khi đóng đăng ký.</p> : <div className="mt-4 space-y-2">{tournament.matches.slice(0, 8).map((match) => <div key={match.id} className="flex items-center justify-between rounded-[8px] border border-line bg-ink/45 px-3 py-2 text-xs"><span>Vòng {match.round} · Bàn {match.match_number}</span><span className="text-muted">{match.status}</span></div>)}</div>}</div></aside></div></div>;
}
