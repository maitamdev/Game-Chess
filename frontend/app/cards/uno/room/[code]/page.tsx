"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowClockwise } from "@phosphor-icons/react/ArrowClockwise";
import { Copy } from "@phosphor-icons/react/Copy";
import { Crown } from "@phosphor-icons/react/Crown";
import { SignOut } from "@phosphor-icons/react/SignOut";
import { User } from "@phosphor-icons/react/User";
import { UsersThree } from "@phosphor-icons/react/UsersThree";
import UnoCardView, {
  UNO_TONES,
  UnoCardBack,
} from "@/components/cards/UnoCardView";
import Button from "@/components/ui/Button";
import { api, ApiError } from "@/lib/api";
import {
  canPlayUnoCard,
  type UnoCard,
  type UnoColor,
  type UnoPublicView,
} from "@/lib/cards/unoEngine";

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
  game?: UnoPublicView;
}

const COLORS: UnoColor[] = ["red", "yellow", "green", "blue"];
const COLOR_LABELS: Record<UnoColor, string> = {
  red: "Đỏ",
  yellow: "Vàng",
  green: "Lục",
  blue: "Lam",
};

export default function UnoRoomPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params.code.toUpperCase();
  const [sessionReady, setSessionReady] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pendingWild, setPendingWild] = useState<UnoCard | null>(null);

  useEffect(() => {
    let stopped = false;
    void api("/api/session")
      .then(() => {
        if (stopped) return;
        setSessionReady(true);
      })
      .catch(() => {
        if (!stopped) router.replace("/rooms");
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
      setError(cause instanceof ApiError ? cause.message : "Mất kết nối với phòng");
    }
  }, [code]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadRoom();
    const timer = setInterval(loadRoom, 1000);
    return () => clearInterval(timer);
  }, [sessionReady, loadRoom]);

  const start = async () => {
    setBusy(true);
    try {
      setRoom(
        await api<Room>("/api/card-rooms/start", {
          body: { code },
        }),
      );
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Không bắt đầu được");
    } finally {
      setBusy(false);
    }
  };

  const act = async (
    action:
      | { type: "draw" }
      | { type: "play"; cardId: number; color?: UnoColor },
  ) => {
    setBusy(true);
    try {
      setRoom(
        await api<Room>("/api/card-rooms/action", {
          body: { code, action },
        }),
      );
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Nước đi không gửi được");
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    try {
      await api("/api/card-rooms/leave", { body: { code } });
    } finally {
      router.push("/cards/uno");
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
  const playableIds = useMemo(() => {
    if (!game || room?.me_seat !== game.currentSeat || game.winnerSeat !== null) {
      return new Set<number>();
    }
    return new Set(
      game.hand
        .filter((card) => canPlayUnoCard(card, game.topCard, game.activeColor))
        .map((card) => card.id),
    );
  }, [game, room?.me_seat]);

  const playCard = (card: UnoCard) => {
    if (!playableIds.has(card.id) || busy) return;
    if (card.value === "wild" || card.value === "wild4") {
      setPendingWild(card);
      return;
    }
    void act({ type: "play", cardId: card.id });
  };

  if (!room) {
    return (
      <div className="app-shell py-16">
        <div className="mx-auto max-w-lg rounded-[14px] border border-line bg-slate p-7 text-center">
          <div className="mx-auto h-2 w-32 animate-pulse rounded-full bg-brass/40" />
          <p className="mt-5 text-sm text-muted">
            {error ?? "Đang kết nối tới phòng bài..."}
          </p>
          {error && (
            <Button className="mt-5" onClick={() => router.push("/cards/uno")}>
              Về sảnh UNO
            </Button>
          )}
        </div>
      </div>
    );
  }

  const currentName = game
    ? room.players.find((player) => player.seat === game.currentSeat)?.username
    : null;

  return (
    <div className="app-shell py-5 sm:py-7">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted">Phòng UNO</p>
          <button
            type="button"
            onClick={copyCode}
            className="mt-1 inline-flex items-center gap-2 rounded-[7px] font-[family-name:var(--font-mono)] text-xl font-bold tracking-[0.1em] text-brass"
          >
            {code}
            <Copy size={17} aria-label="Sao chép mã phòng" />
          </button>
          {copied && <span className="ml-2 text-xs text-sage">Đã sao chép</span>}
        </div>
        <Button size="sm" onClick={leave}>
          <SignOut size={16} aria-hidden />
          Rời phòng
        </Button>
      </header>

      {room.status === "waiting" ? (
        <section className="rounded-[16px] border border-line bg-slate p-5 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-[12px] border border-brass/35 bg-brass/10 text-brass">
              <UsersThree size={27} weight="duotone" aria-hidden />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-[-0.03em]">Đang chờ người chơi</h1>
              <p className="mt-1 text-sm text-muted">
                {room.players.length}/{room.max_players} ghế đã có người
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: room.max_players }, (_, seat) => {
              const player = room.players.find((item) => item.seat === seat);
              return (
                <div
                  key={seat}
                  className={`flex min-h-20 items-center gap-3 rounded-[11px] border px-4 ${
                    player
                      ? "border-brass/30 bg-brass/[.06]"
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
                        <Crown size={13} weight="fill" aria-hidden />
                        Chủ phòng
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
                onClick={start}
                disabled={busy || room.players.length < 2}
              >
                {busy ? "Đang bắt đầu..." : "Bắt đầu ván"}
              </Button>
            ) : (
              <p className="inline-flex items-center gap-2 text-sm text-muted">
                <ArrowClockwise className="animate-spin" size={16} aria-hidden />
                Chờ chủ phòng bắt đầu
              </p>
            )}
          </div>
        </section>
      ) : game ? (
        <section className="card-table relative min-h-[660px] overflow-hidden rounded-[18px] border border-line p-3 sm:p-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {room.players
              .filter((player) => player.seat !== room.me_seat)
              .map((player) => (
                <div
                  key={player.id}
                  className={`flex min-w-0 items-center gap-2 rounded-[10px] border px-3 py-2 ${
                    game.currentSeat === player.seat
                      ? "border-brass/60 bg-brass/10"
                      : "border-white/10 bg-black/20"
                  }`}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold">
                    {player.username.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{player.username}</p>
                    <p className="text-[11px] text-white/50">
                      {game.handCounts[player.seat]} lá
                    </p>
                  </div>
                </div>
              ))}
          </div>

          <div className="flex min-h-[360px] flex-col items-center justify-center py-5">
            <div className="mb-6 rounded-full border border-white/10 bg-black/25 px-4 py-2 text-center text-xs text-white/70">
              {game.winnerSeat === null
                ? `Lượt của ${currentName ?? `ghế ${game.currentSeat + 1}`}. ${game.message}`
                : `${room.players.find((p) => p.seat === game.winnerSeat)?.username ?? "Người chơi"} đã thắng.`}
            </div>
            <div className="flex items-start gap-6 sm:gap-9">
              <button
                type="button"
                onClick={() => void act({ type: "draw" })}
                disabled={busy || game.currentSeat !== room.me_seat || game.winnerSeat !== null}
                className="disabled:cursor-not-allowed disabled:opacity-50"
              >
                <UnoCardBack />
                <span className="mt-2 block text-xs text-white/55">
                  Rút bài · {game.drawCount}
                </span>
              </button>
              <div>
                <UnoCardView card={game.topCard} />
                <span className="mt-2 flex items-center justify-center gap-1.5 text-xs text-white/55">
                  <span
                    className={`h-2 w-2 rounded-full bg-gradient-to-br ${UNO_TONES[game.activeColor]}`}
                  />
                  Màu {COLOR_LABELS[game.activeColor]}
                </span>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-bold">
                Bài của bạn
                <span className="ml-2 text-xs font-normal text-white/50">
                  {game.hand.length} lá
                </span>
              </p>
              {game.hand.length === 1 && (
                <span className="text-xl font-black italic tracking-[-0.08em] text-[#f5cf4c]">
                  UNO!
                </span>
              )}
            </div>
            <div className="uno-hand flex min-h-[132px] items-end overflow-x-auto overflow-y-hidden px-1 pb-2 pt-3 sm:justify-center">
              {game.hand.map((card, index) => (
                <div
                  key={card.id}
                  className={index === 0 ? "" : "-ml-4 sm:-ml-3"}
                  style={{ zIndex: index }}
                >
                  <UnoCardView
                    card={card}
                    playable={playableIds.has(card.id) && !busy}
                    onClick={() => playCard(card)}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {error && (
        <p className="mt-3 rounded-[9px] border border-rust/50 bg-rust/10 px-4 py-3 text-sm text-[#e48a78]">
          {error}
        </p>
      )}

      {pendingWild && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/85 p-4 backdrop-blur-sm"
          onClick={() => setPendingWild(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Chọn màu"
            className="w-full max-w-sm rounded-[16px] border border-line bg-slate p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-center text-xl font-bold">Chọn màu tiếp theo</h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    void act({ type: "play", cardId: pendingWild.id, color });
                    setPendingWild(null);
                  }}
                  className={`min-h-16 rounded-[10px] bg-gradient-to-br ${UNO_TONES[color]} font-bold text-white transition hover:brightness-110 active:scale-[.98]`}
                >
                  {COLOR_LABELS[color]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
