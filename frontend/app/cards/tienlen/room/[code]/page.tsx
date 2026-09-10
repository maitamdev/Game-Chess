"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowClockwise } from "@phosphor-icons/react/ArrowClockwise";
import { Copy } from "@phosphor-icons/react/Copy";
import { Crown } from "@phosphor-icons/react/Crown";
import { SignOut } from "@phosphor-icons/react/SignOut";
import { User } from "@phosphor-icons/react/User";
import { UsersThree } from "@phosphor-icons/react/UsersThree";

import TienLenCard from "@/components/cards/TienLenCard";
import RoomChat from "@/components/online/RoomChat";
import Button from "@/components/ui/Button";
import { api, ApiError } from "@/lib/api";
import {
  isLegalPlay,
  type TienLenPlay,
} from "@/lib/cards/tienlen";
import type { TienLenPublicView } from "@/lib/cards/tienlenEngine";
import type { StandardCard } from "@/lib/cards/deck";

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
  game?: TienLenPublicView;
}

const PLAYER_COLORS = [
  "border-brass/45 bg-brass/10",
  "border-[#73a8bd]/45 bg-[#73a8bd]/10",
  "border-[#c77d91]/45 bg-[#c77d91]/10",
  "border-[#b7a15e]/45 bg-[#b7a15e]/10",
];

export default function TienLenRoomPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params.code.toUpperCase();
  const [sessionReady, setSessionReady] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let stopped = false;
    void api("/api/session")
      .then(() => {
        if (!stopped) setSessionReady(true);
      })
      .catch(() => {
        if (!stopped) router.replace("/cards/tienlen/rooms");
      });
    return () => {
      stopped = true;
    };
  }, [router]);

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
          const joined = await api<Room>("/api/card-rooms/join", {
            body: { code },
          });
          setRoom(joined);
          setError(null);
          return;
        } catch (joinCause) {
          setError(
            joinCause instanceof ApiError
              ? joinCause.message
              : "Không vào được phòng",
          );
          return;
        }
      }
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Mất kết nối với phòng",
      );
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

  const act = async (
    action:
      | { type: "play_cards"; cardIds: string[] }
      | { type: "pass" },
  ) => {
    setBusy(true);
    try {
      setRoom(
        await api<Room>("/api/card-rooms/action", {
          body: { code, action },
        }),
      );
      setSelectedIds([]);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Nước đi không gửi được");
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    await api("/api/card-rooms/leave", { body: { code } }).catch(() => undefined);
    router.push("/cards/tienlen");
  };

  const rematch = async () => {
    setBusy(true);
    try {
      setRoom(await api<Room>("/api/card-rooms/rematch", { body: { code } }));
      setSelectedIds([]);
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

  const game = room?.game;
  const selectedCards = useMemo(
    () =>
      game?.hand.filter((card) => selectedIds.includes(card.id)) ?? [],
    [game?.hand, selectedIds],
  );
  const selectedPlay = useMemo(
    () => isLegalPlay(selectedCards, game?.lastPlay?.play ?? null),
    [game?.lastPlay?.play, selectedCards],
  );
  const canAct = Boolean(
    game &&
      room &&
      game.currentSeat === room.me_seat &&
      game.winnerSeat === null &&
      !busy,
  );

  const toggleCard = (card: StandardCard) => {
    if (!canAct) return;
    setSelectedIds((current) =>
      current.includes(card.id)
        ? current.filter((id) => id !== card.id)
        : [...current, card.id],
    );
  };

  if (!room) {
    return (
      <div className="app-shell py-16">
        <div className="mx-auto max-w-lg rounded-[14px] border border-line bg-slate p-7 text-center">
          <div className="mx-auto h-2 w-32 animate-pulse rounded-full bg-brass/40" />
          <p className="mt-5 text-sm text-muted">
            {error ?? "Đang kết nối tới bàn Tiến Lên..."}
          </p>
          {error && (
            <Button className="mt-5" onClick={() => router.push("/cards/tienlen")}> 
              Về sảnh Tiến Lên
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="tl-page min-h-[100dvh] pb-12">
      <header className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 pb-5 pt-7 sm:px-8 lg:px-14">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Tiến Lên online · 4 người
          </p>
          <button
            type="button"
            onClick={copyCode}
            className="mt-1 inline-flex items-center gap-2 font-[family-name:var(--font-mono)] text-xl font-bold tracking-[0.1em] text-brass"
          >
            {code}
            <Copy size={17} aria-label="Sao chép mã phòng" />
          </button>
          {copied && <span className="ml-2 text-xs text-sage">Đã sao chép</span>}
        </div>
        <Button size="sm" onClick={() => void leave()}>
          <SignOut size={16} aria-hidden />
          Rời phòng
        </Button>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-14">
        {room.status === "waiting" ? (
          <section className="rounded-[16px] border border-line bg-slate p-5 sm:p-8">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-[12px] border border-brass/35 bg-brass/10 text-brass">
                <UsersThree size={27} weight="duotone" aria-hidden />
              </span>
              <div>
                <h1 className="text-2xl font-bold">Đang chờ đủ người chơi</h1>
                <p className="mt-1 text-sm text-muted">
                  {room.players.length}/4 ghế đã có người · cần đủ 4 người để bắt đầu
                </p>
              </div>
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, seat) => {
                const player = room.players.find((item) => item.seat === seat);
                return (
                  <div
                    key={seat}
                    className={`flex min-h-20 items-center gap-3 rounded-[11px] border px-4 ${
                      player
                        ? PLAYER_COLORS[seat]
                        : "border-dashed border-line bg-ink/25"
                    }`}
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-ink/70 text-muted">
                      <User size={20} weight="duotone" aria-hidden />
                    </span>
                    <div>
                      <p className={player ? "font-semibold" : "text-sm text-muted"}>
                        {player?.username ?? `Ghế ${seat + 1}`}
                      </p>
                      {player?.is_host && (
                        <span className="mt-1 inline-flex items-center gap-1 text-xs text-brass">
                          <Crown size={13} weight="fill" aria-hidden /> Chủ phòng
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-7 border-t border-line pt-6">
              {room.is_host ? (
                <Button
                  variant="primary"
                  onClick={() => void start()}
                  disabled={busy || room.players.length !== 4}
                >
                  {busy ? "Đang bắt đầu..." : "Bắt đầu ván"}
                </Button>
              ) : (
                <p className="inline-flex items-center gap-2 text-sm text-muted">
                  <ArrowClockwise className="animate-spin" size={16} aria-hidden />
                  Chờ chủ phòng bắt đầu khi đủ 4 người
                </p>
              )}
            </div>
          </section>
        ) : game ? (
          <section className="tl-table relative overflow-hidden rounded-[18px] border border-[#d6ae55]/35 p-4 shadow-[0_30px_90px_rgba(0,0,0,.35)] sm:p-7 lg:p-9">
            <div className="grid gap-4 sm:grid-cols-3">
              {room.players.map((player) => (
                <div
                  key={player.id}
                  className={`rounded-[10px] border px-3 py-3 ${
                    game.currentSeat === player.seat
                      ? PLAYER_COLORS[player.seat]
                      : "border-white/10 bg-black/20"
                  }`}
                >
                  <p className="truncate text-sm font-bold text-[#f4f0e8]">
                    {player.username}
                    {player.seat === room.me_seat ? " (Bạn)" : ""}
                  </p>
                  <p className="mt-1 text-xs text-[#a8b6b8]">
                    {game.handCounts[player.seat]} lá
                    {game.currentSeat === player.seat ? " · Đang đi" : ""}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex min-h-[240px] flex-col items-center justify-center rounded-[16px] border border-white/[.08] bg-[#06201e]/45 px-4 py-7">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9eb6ae]">
                Bộ đang trên bàn
              </p>
              {game.lastPlay ? (
                <>
                  <div className="mt-5 flex justify-center -space-x-5 sm:-space-x-4">
                    {game.lastPlay.play.cards.map((card) => (
                      <TienLenCard key={card.id} card={card} small />
                    ))}
                  </div>
                  <p className="mt-5 text-center text-sm font-semibold text-[#f4f0e8]">
                    {room.players.find((player) => player.seat === game.lastPlay?.seat)?.username ??
                      `Ghế ${game.lastPlay.seat + 1}`} đã đánh bộ bài
                  </p>
                </>
              ) : (
                <p className="mt-6 text-center text-sm text-[#a8b6b8]">
                  Chưa có bộ bài nào. Người được quyền sẽ mở lượt.
                </p>
              )}
              <p className="mt-4 rounded-full border border-white/10 px-3 py-1 text-xs text-[#d8e1df]">
                {game.winnerSeat === null
                  ? game.currentSeat === room.me_seat
                    ? "Lượt của bạn"
                    : `Lượt của ${room.players.find((player) => player.seat === game.currentSeat)?.username ?? `ghế ${game.currentSeat + 1}`}`
                  : `Thắng: ${room.players.find((player) => player.seat === game.winnerSeat)?.username ?? "người chơi"}`}
              </p>
            </div>

            <div className="mt-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d6ae55]">
                    Bài của bạn
                  </p>
                  <p className="mt-1 text-sm text-[#a8b6b8]">
                    {game.hand.length} lá còn lại
                    {selectedIds.length ? ` · đã chọn ${selectedIds.length}` : ""}
                  </p>
                </div>
                <p className="text-xs text-[#9eb6ae]">{game.message}</p>
              </div>
              <div className="tl-hand mt-4 flex min-h-[150px] items-end justify-center overflow-x-auto px-2 pb-2 pt-5">
                {game.hand.map((card) => (
                  <TienLenCard
                    key={card.id}
                    card={card}
                    selected={selectedIds.includes(card.id)}
                    onClick={() => toggleCard(card)}
                  />
                ))}
              </div>
              <div className="mt-3 flex flex-col justify-center gap-3 sm:flex-row">
                <Button
                  variant="primary"
                  onClick={() => void act({ type: "play_cards", cardIds: selectedIds })}
                  disabled={!canAct || !selectedPlay}
                >
                  Đánh bài
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => void act({ type: "pass" })}
                  disabled={!canAct || !game.lastPlay}
                >
                  Bỏ lượt
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        <div className="mt-5">
          <RoomChat code={code} />
        </div>

        {room.status === "finished" && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 rounded-[14px] border border-brass/25 bg-brass/[.06] p-4">
            <p className="text-sm text-muted">Ván đã kết thúc.</p>
            {room.is_host ? (
              <Button variant="primary" onClick={() => void rematch()} disabled={busy}>Chơi ván mới</Button>
            ) : (
              <p className="text-sm text-muted">Chờ chủ phòng bắt đầu ván mới.</p>
            )}
          </div>
        )}

        <div className="mt-5">
          <RoomChat code={code} />
        </div>

        {error && (
          <p className="mt-4 rounded-[9px] border border-rust/50 bg-rust/10 px-4 py-3 text-sm text-[#e48a78]">
            {error}
          </p>
        )}
      </main>
    </div>
  );
}
