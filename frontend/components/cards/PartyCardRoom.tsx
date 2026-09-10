"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowClockwise } from "@phosphor-icons/react/ArrowClockwise";
import { Copy } from "@phosphor-icons/react/Copy";
import { Crown } from "@phosphor-icons/react/Crown";
import { SignOut } from "@phosphor-icons/react/SignOut";
import { User } from "@phosphor-icons/react/User";
import { UsersThree } from "@phosphor-icons/react/UsersThree";

import PlayingCard from "@/components/cards/PlayingCard";
import RoomChat from "@/components/online/RoomChat";
import Button from "@/components/ui/Button";
import { api, ApiError } from "@/lib/api";
import type { BaiCaoPublicView, XiDachPublicView } from "@/lib/cards/partyEngine";

type PartyGameType = "xidach" | "baicao";
type PartyView = XiDachPublicView | BaiCaoPublicView;

interface RoomPlayer {
  id: string;
  username: string;
  seat: number;
  is_host: boolean;
}

interface Room {
  code: string;
  status: "waiting" | "playing" | "finished";
  max_players: number;
  is_host: boolean;
  me_seat: number;
  players: RoomPlayer[];
  version: number;
  game?: PartyView;
}

export default function PartyCardRoom({ gameType }: { gameType: PartyGameType }) {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params.code.toUpperCase();
  const [sessionReady, setSessionReady] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const homePath = `/cards/${gameType}`;
  const title = gameType === "xidach" ? "Xì Dách online" : "Bài Cào online";

  useEffect(() => {
    let stopped = false;
    void api("/api/session")
      .then(() => {
        if (!stopped) setSessionReady(true);
      })
      .catch(() => {
        if (!stopped) router.replace(`${homePath}/rooms`);
      });
    return () => {
      stopped = true;
    };
  }, [homePath, router]);

  const loadRoom = useCallback(async () => {
    try {
      const data = await api<Room>(
        `/api/card-rooms/status?code=${encodeURIComponent(code)}`,
      );
      setRoom(data);
      setError(null);
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "NOT_IN_ROOM") {
        try {
          setRoom(await api<Room>("/api/card-rooms/join", { body: { code } }));
          setError(null);
          return;
        } catch (joinCause) {
          setError(joinCause instanceof ApiError ? joinCause.message : "Không vào được phòng");
          return;
        }
      }
      setError(cause instanceof ApiError ? cause.message : "Mất kết nối với phòng");
    }
  }, [code]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadRoom();
    const timer = setInterval(loadRoom, 1100);
    return () => clearInterval(timer);
  }, [loadRoom, sessionReady]);

  const start = async () => {
    setBusy(true);
    try {
      setRoom(await api<Room>("/api/card-rooms/start", { body: { code } }));
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Không bắt đầu được");
    } finally {
      setBusy(false);
    }
  };

  const act = async (action: { type: "hit" } | { type: "stand" } | { type: "reveal" }) => {
    setBusy(true);
    try {
      setRoom(await api<Room>("/api/card-rooms/action", { body: { code, action } }));
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Hành động không gửi được");
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    await api("/api/card-rooms/leave", { body: { code } }).catch(() => undefined);
    router.push(homePath);
  };

  const rematch = async () => {
    setBusy(true);
    try {
      setRoom(await api<Room>("/api/card-rooms/rematch", { body: { code } }));
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Không bắt đầu lại được");
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  if (!room) {
    return (
      <div className="app-shell py-16">
        <div className="mx-auto max-w-lg rounded-[14px] border border-line bg-slate p-7 text-center">
          <div className="mx-auto h-2 w-32 animate-pulse rounded-full bg-brass/40" />
          <p className="mt-5 text-sm text-muted">{error ?? `Đang kết nối tới ${title}...`}</p>
          {error && <Button className="mt-5" onClick={() => router.push(homePath)}>Về sảnh</Button>}
        </div>
      </div>
    );
  }

  const game = room.game;
  return (
    <div className="app-shell py-5 sm:py-8">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{title} · 2–4 người</p>
          <button type="button" onClick={copyCode} className="mt-1 inline-flex items-center gap-2 font-[family-name:var(--font-mono)] text-xl font-bold tracking-[0.1em] text-brass">
            {code}<Copy size={17} aria-label="Sao chép mã phòng" />
          </button>
          {copied && <span className="ml-2 text-xs text-sage">Đã sao chép</span>}
        </div>
        <Button size="sm" onClick={() => void leave()}><SignOut size={16} aria-hidden /> Rời phòng</Button>
      </header>

      {room.status === "waiting" ? (
        <Waiting room={room} title={title} busy={busy} onStart={() => void start()} />
      ) : game ? (
        game.gameType === "xidach" ? (
          <XiDachTable room={room} game={game} busy={busy} onAct={(action) => void act(action)} />
        ) : (
          <BaiCaoTable room={room} game={game} busy={busy} onAct={() => void act({ type: "reveal" })} />
        )
      ) : null}

      {room.status === "finished" && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 rounded-[14px] border border-brass/25 bg-brass/[.06] p-4">
          <p className="text-sm text-muted">Ván đã kết thúc.</p>
          {room.is_host && <Button variant="primary" onClick={() => void rematch()} disabled={busy}>Chơi ván mới</Button>}
          {!room.is_host && <p className="text-sm text-muted">Chờ chủ phòng bắt đầu ván mới.</p>}
        </div>
      )}

      <div className="mt-5">
        <RoomChat code={code} />
      </div>

      {error && <p className="mt-4 rounded-[9px] border border-rust/50 bg-rust/10 px-4 py-3 text-sm text-[#e48a78]">{error}</p>}
    </div>
  );
}

function Waiting({ room, title, busy, onStart }: { room: Room; title: string; busy: boolean; onStart: () => void }) {
  return (
    <section className="rounded-[16px] border border-line bg-slate p-5 sm:p-8">
      <div className="flex items-start gap-4"><span className="grid h-12 w-12 place-items-center rounded-[12px] border border-brass/35 bg-brass/10 text-brass"><UsersThree size={27} weight="duotone" aria-hidden /></span><div><h1 className="text-2xl font-bold text-parchment">Đang chờ người chơi</h1><p className="mt-1 text-sm text-muted">{title} · {room.players.length}/{room.max_players} ghế đã có người</p></div></div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">{Array.from({ length: room.max_players }, (_, seat) => { const player = room.players.find((item) => item.seat === seat); return <div key={seat} className={`flex min-h-20 items-center gap-3 rounded-[11px] border px-4 ${player ? "border-brass/30 bg-brass/[.06]" : "border-dashed border-line bg-ink/25"}`}><span className="grid h-10 w-10 place-items-center rounded-full bg-ink/70 text-muted"><User size={20} weight="duotone" aria-hidden /></span><div><p className={player ? "font-semibold text-parchment" : "text-sm text-muted"}>{player?.username ?? `Ghế ${seat + 1}`}</p>{player?.is_host && <span className="mt-1 inline-flex items-center gap-1 text-xs text-brass"><Crown size={13} weight="fill" aria-hidden /> Chủ phòng</span>}</div></div>; })}</div>
      <div className="mt-7 border-t border-line pt-6">{room.is_host ? <Button variant="primary" onClick={onStart} disabled={busy || room.players.length < 2}>{busy ? "Đang bắt đầu..." : "Bắt đầu ván"}</Button> : <p className="inline-flex items-center gap-2 text-sm text-muted"><ArrowClockwise className="animate-spin" size={16} aria-hidden /> Chờ chủ phòng bắt đầu</p>}</div>
    </section>
  );
}

function XiDachTable({ room, game, busy, onAct }: { room: Room; game: XiDachPublicView; busy: boolean; onAct: (action: { type: "hit" } | { type: "stand" }) => void }) {
  const currentName = room.players.find((player) => player.seat === game.currentSeat)?.username;
  return (
    <section className="card-table rounded-[18px] border border-line p-4 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brass">Nhà cái</p><div className="mt-3 flex items-end gap-2">{game.dealerVisible.map((card) => <PlayingCard key={card.id} card={card} table />)}{game.dealerCount > game.dealerVisible.length && <PlayingCard hidden table />}</div></div><p className="rounded-full border border-white/10 px-3 py-2 text-xs text-muted">{game.phase === "finished" ? "Đã ngã ngũ" : `Lượt ${currentName ?? "người chơi"}`}</p></div>
      <div className="mt-8 border-t border-line pt-6"><p className="text-xs font-bold uppercase tracking-[0.16em] text-brass">Bàn người chơi</p><div className="mt-4 grid gap-4 sm:grid-cols-2">{room.players.map((player) => { const active = player.seat === game.currentSeat; const result = game.results.find((item) => item.seat === player.seat); return <article key={player.id} className={`rounded-[12px] border p-4 ${active ? "border-brass/50 bg-brass/[.06]" : "border-line bg-ink/25"}`}><div className="flex items-center justify-between gap-3"><p className="font-semibold text-parchment">{player.username}{player.seat === room.me_seat ? " (Bạn)" : ""}</p><span className="text-xs text-muted">{game.handCounts[player.seat]} lá</span></div>{player.seat === room.me_seat ? <div className="mt-4 flex items-end gap-2 overflow-x-auto">{game.hand.map((card) => <PlayingCard key={card.id} card={card} compact />)}</div> : <div className="mt-4 flex items-center gap-1">{Array.from({ length: game.handCounts[player.seat] }, (_, index) => <PlayingCard key={index} hidden compact />)}</div>}{result && <p className={`mt-3 text-sm font-bold ${result.outcome === "win" ? "text-sage" : result.outcome === "draw" ? "text-brass" : "text-[#e99a88]"}`}>{result.kind} · {result.score} điểm · {result.outcome === "win" ? "Thắng" : result.outcome === "draw" ? "Hòa" : "Thua"}</p>}</article>; })}</div></div>
      {game.phase !== "finished" && game.currentSeat === room.me_seat && <div className="mt-7 flex justify-center gap-3"><Button variant="primary" onClick={() => onAct({ type: "hit" })} disabled={busy}>Rút thêm</Button><Button variant="ghost" onClick={() => onAct({ type: "stand" })} disabled={busy}>Dừng</Button></div>}
      <p className="mt-5 text-center text-sm text-muted">{game.message}</p>
    </section>
  );
}

function BaiCaoTable({ room, game, busy, onAct }: { room: Room; game: BaiCaoPublicView; busy: boolean; onAct: () => void }) {
  const resultForMe = game.results.find((result) => result.seat === room.me_seat);
  return (
    <section className="card-table rounded-[18px] border border-line p-4 sm:p-7"><header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brass">Bài Cào online</p><h1 className="mt-2 text-2xl font-bold text-parchment">Lật bài và so nút</h1></div><p className="rounded-full border border-white/10 px-3 py-2 text-xs text-muted">{game.currentSeat === room.me_seat ? "Lượt của bạn" : `Ghế ${game.currentSeat + 1} đang lật`}</p></header><div className="mt-7 grid gap-4 sm:grid-cols-2">{room.players.map((player) => { const own = player.seat === room.me_seat; const result = game.results.find((item) => item.seat === player.seat); return <article key={player.id} className={`rounded-[12px] border p-4 ${player.seat === game.currentSeat ? "border-brass/50 bg-brass/[.06]" : "border-line bg-ink/25"}`}><div className="flex items-center justify-between gap-3"><p className="font-semibold text-parchment">{player.username}{own ? " (Bạn)" : ""}</p><span className="text-xs text-muted">{game.revealed[player.seat] ? "Đã lật" : "Chưa lật"}</span></div><div className="mt-4 flex items-end gap-2">{own ? game.hand.map((card) => <PlayingCard key={card.id} card={card} compact />) : Array.from({ length: 3 }, (_, index) => <PlayingCard key={index} hidden compact />)}</div>{result && <p className={`mt-3 text-sm font-bold ${result.outcome === "win" ? "text-sage" : result.outcome === "draw" ? "text-brass" : "text-[#e99a88]"}`}>{result.score} nút · {result.outcome === "win" ? "Thắng" : result.outcome === "draw" ? "Hòa" : "Thua"}</p>}</article>; })}</div>{game.phase !== "finished" && game.currentSeat === room.me_seat && <div className="mt-7 flex justify-center"><Button variant="primary" onClick={onAct} disabled={busy}>Lật bài</Button></div>}{resultForMe && <p className="mt-5 text-center text-lg font-bold text-brass">Bạn được {resultForMe.score} nút.</p>}<p className="mt-3 text-center text-sm text-muted">{game.message}</p></section>
  );
}
