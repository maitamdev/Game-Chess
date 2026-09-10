"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowClockwise } from "@phosphor-icons/react/ArrowClockwise";
import { Copy } from "@phosphor-icons/react/Copy";
import { Crown } from "@phosphor-icons/react/Crown";
import { DiceFive } from "@phosphor-icons/react/DiceFive";
import { FlagCheckered } from "@phosphor-icons/react/FlagCheckered";
import { HorseIcon } from "@phosphor-icons/react/Horse";
import { SignOut } from "@phosphor-icons/react/SignOut";
import { User } from "@phosphor-icons/react/User";
import { UsersThree } from "@phosphor-icons/react/UsersThree";

import Button from "@/components/ui/Button";
import RoomChat from "@/components/online/RoomChat";
import { api, ApiError } from "@/lib/api";
import {
  HOME_END,
  HOME_LANES,
  HOME_ORDER,
  NGUA_COLORS,
  NGUA_NAMES,
  START_INDEX,
  TRACK_COORDS,
  type NguaColor,
  type NguaPiece,
} from "@/lib/ngua/rules";
import type { NguaPublicView } from "@/lib/ngua/engine";

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
  game?: NguaPublicView;
}

const PLAYER_COLORS = [
  "border-[#efb64f]/45 bg-[#efb64f]/10",
  "border-[#73a8bd]/45 bg-[#73a8bd]/10",
  "border-[#d37e89]/45 bg-[#d37e89]/10",
  "border-[#7ab28b]/45 bg-[#7ab28b]/10",
];

const COLOR_CLASSES: Record<NguaColor, string> = {
  red: "red",
  blue: "blue",
  yellow: "yellow",
  green: "green",
};

export default function NguaRoomPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params.code.toUpperCase();
  const [sessionReady, setSessionReady] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
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
        if (!stopped) router.replace("/ngua/rooms");
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
    action: { type: "roll" } | { type: "move_piece"; pieceId: string },
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
    await api("/api/card-rooms/leave", { body: { code } }).catch(() => undefined);
    router.push("/ngua");
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
          <p className="mt-5 text-sm text-muted">
            {error ?? "Đang kết nối tới bàn Cá Ngựa..."}
          </p>
          {error && (
            <Button className="mt-5" onClick={() => router.push("/ngua")}>
              Về bàn Cá Ngựa
            </Button>
          )}
        </div>
      </div>
    );
  }

  const game = room.game;

  return (
    <div className="ngua-page min-h-[100dvh] pb-12">
      <header className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 pb-5 pt-7 sm:px-8 lg:px-14">
        <div>
          <Link href="/ngua" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Cá Ngựa online · 4 người
          </Link>
          <button
            type="button"
            onClick={copyCode}
            className="mt-1 inline-flex items-center gap-2 font-[family-name:var(--font-mono)] text-xl font-bold tracking-[0.1em] text-[#efb64f]"
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
          <WaitingRoom room={room} busy={busy} onStart={() => void start()} />
        ) : game ? (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {room.players.map((player) => {
                const color = NGUA_COLORS[player.seat];
                const homeCount = game.pieces.filter(
                  (piece) => piece.color === color && piece.progress === HOME_END,
                ).length;
                return (
                  <div
                    key={player.id}
                    className={`ngua-player ${color} ${game.currentSeat === player.seat ? "ngua-player-active" : ""}`}
                  >
                    <span className="ngua-player-icon">
                      <Image
                        src="/images/ngua/horse-piece.png"
                        alt=""
                        width={64}
                        height={64}
                        className={`ngua-player-art ${color}`}
                      />
                    </span>
                    <span className="min-w-0">
                      <strong className="block truncate">
                        {player.username}{player.seat === room.me_seat ? " (Bạn)" : ""}
                      </strong>
                      <small>{homeCount}/4 về chuồng</small>
                    </span>
                  </div>
                );
              })}
            </div>

            <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="ngua-table rounded-[18px] border border-[#efb64f]/25 p-3 shadow-[0_28px_80px_rgba(0,0,0,.35)] sm:p-5">
                <NguaBoard
                  game={game}
                  validMoves={game.legalPieceIds}
                  onPieceClick={(pieceId) => void act({ type: "move_piece", pieceId })}
                />
              </div>
              <aside className="ngua-side-panel">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-[10px] border border-[#efb64f]/35 bg-[#efb64f]/10 text-[#efb64f]">
                    <DiceFive size={22} weight="duotone" aria-hidden />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#efb64f]">Lượt online</p>
                    <h2 className="text-xl font-extrabold text-[#fff8ed]">
                      {game.winner
                        ? `${NGUA_NAMES[game.winner]} thắng`
                        : game.currentSeat === room.me_seat
                          ? "Lượt của bạn"
                          : `Lượt ${NGUA_NAMES[game.currentColor]}`}
                    </h2>
                  </div>
                </div>
                <p className="mt-5 rounded-[10px] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-[#c7c0b3]">
                  {game.message}
                </p>
                <div className="mt-5 flex items-center justify-between gap-3 rounded-[10px] border border-[#efb64f]/25 bg-[#efb64f]/[.06] p-4">
                  <span className="text-sm font-semibold text-[#f2d38c]">Xúc xắc</span>
                  <strong className="grid h-12 w-12 place-items-center rounded-[10px] border border-[#efb64f]/45 bg-[#efb64f]/10 text-2xl text-[#efb64f]">
                    {game.dice ?? "—"}
                  </strong>
                </div>
                <Button
                  variant="primary"
                  className="mt-4 w-full"
                  onClick={() => void act({ type: "roll" })}
                  disabled={busy || game.winner !== null || game.currentSeat !== room.me_seat || game.rolled}
                >
                  <DiceFive size={19} aria-hidden />
                  {game.rolled ? "Chọn quân trên bàn" : "Đổ xúc xắc"}
                </Button>
                {game.lastMove && (
                  <p className="mt-4 text-xs leading-5 text-[#8f8d87]">
                    Lượt trước: {NGUA_NAMES[game.lastMove.color]} đi {game.lastMove.dice}
                    {game.lastMove.kicked.length ? " và đá quân đối thủ" : ""}.
                  </p>
                )}
              </aside>
            </section>
          </>
        ) : null}

        <div className="mt-5">
          <RoomChat code={code} />
        </div>

        {room.status === "finished" && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 rounded-[14px] border border-[#efb64f]/25 bg-[#efb64f]/[.06] p-4">
            <p className="text-sm text-[#c7c0b3]">Ván đã kết thúc.</p>
            {room.is_host ? (
              <Button variant="primary" onClick={() => void rematch()} disabled={busy}>Chơi ván mới</Button>
            ) : (
              <p className="text-sm text-[#c7c0b3]">Chờ chủ phòng bắt đầu ván mới.</p>
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

function WaitingRoom({
  room,
  busy,
  onStart,
}: {
  room: Room;
  busy: boolean;
  onStart: () => void;
}) {
  return (
    <section className="rounded-[16px] border border-white/10 bg-[#151d24] p-5 sm:p-8">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-[12px] border border-[#efb64f]/35 bg-[#efb64f]/10 text-[#efb64f]">
          <UsersThree size={27} weight="duotone" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-[#fff8ed]">Đang chờ đủ người chơi</h1>
          <p className="mt-1 text-sm text-[#aaa9a3]">{room.players.length}/4 ghế đã có người · cần đủ 4 người để bắt đầu</p>
        </div>
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, seat) => {
          const player = room.players.find((item) => item.seat === seat);
          return (
            <div key={seat} className={`flex min-h-20 items-center gap-3 rounded-[11px] border px-4 ${player ? PLAYER_COLORS[seat] : "border-dashed border-white/10 bg-black/20"}`}>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-black/25 text-[#aaa9a3]"><User size={20} weight="duotone" aria-hidden /></span>
              <div>
                <p className={player ? "font-semibold text-[#fff8ed]" : "text-sm text-[#aaa9a3]"}>{player?.username ?? `Ghế ${seat + 1}`}</p>
                {player?.is_host && <span className="mt-1 inline-flex items-center gap-1 text-xs text-[#efb64f]"><Crown size={13} weight="fill" aria-hidden /> Chủ phòng</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-7 border-t border-white/10 pt-6">
        {room.is_host ? (
          <Button variant="primary" onClick={onStart} disabled={busy || room.players.length !== 4}>
            {busy ? "Đang bắt đầu..." : "Bắt đầu ván"}
          </Button>
        ) : (
          <p className="inline-flex items-center gap-2 text-sm text-[#aaa9a3]"><ArrowClockwise className="animate-spin" size={16} aria-hidden /> Chờ chủ phòng bắt đầu khi đủ 4 người</p>
        )}
      </div>
    </section>
  );
}

function NguaBoard({
  game,
  validMoves,
  onPieceClick,
}: {
  game: NguaPublicView;
  validMoves: string[];
  onPieceClick: (pieceId: string) => void;
}) {
  const yardIds = new Set(game.pieces.filter((piece) => piece.progress === -1).map((piece) => piece.id));
  return (
    <div className="ngua-board-wrap">
      <div className="ngua-board-grid">
        {NGUA_COLORS.map((color) => (
          <div key={color} className={`ngua-home-zone ${color}`}>
            <div className="ngua-home-inner">
              <div className="ngua-home-horse"><HorseIcon size={35} weight="duotone" aria-hidden /></div>
              <div className="ngua-yard-grid">
                {game.pieces.filter((piece) => piece.color === color && yardIds.has(piece.id)).map((piece) => <HorsePiece key={piece.id} piece={piece} valid={false} onClick={onPieceClick} />)}
              </div>
            </div>
          </div>
        ))}
        {TRACK_COORDS.map(([row, col], index) => (
          <div key={`track-${index}`} className={`ngua-track-cell ${Object.values(START_INDEX).includes(index) ? "ngua-track-start" : ""}`} style={{ gridRow: row + 1, gridColumn: col + 1 }}><span>{index + 1}</span></div>
        ))}
        {NGUA_COLORS.flatMap((color) => HOME_LANES[color].map(([row, col], index) => (
          <div key={`${color}-home-${index}`} className={`ngua-home-lane ${color}`} style={{ gridRow: row + 1, gridColumn: col + 1 }}><span>{HOME_ORDER[index]}</span></div>
        )))}
        <div className="ngua-center-finish"><FlagCheckered size={24} aria-hidden /><span>VỀ CHUỒNG</span></div>
        {game.pieces.filter((piece) => piece.progress >= 0).map((piece) => {
          const coord = piece.progress <= 51 ? TRACK_COORDS[(START_INDEX[piece.color] + piece.progress) % TRACK_COORDS.length] : HOME_LANES[piece.color][piece.progress - 52];
          if (!coord) return null;
          return <div key={piece.id} className="ngua-active-piece" style={{ gridRow: coord[0] + 1, gridColumn: coord[1] + 1 }}><HorsePiece piece={piece} valid={validMoves.includes(piece.id)} onClick={onPieceClick} homeRank={piece.progress >= 52 ? HOME_ORDER[piece.progress - 52] : undefined} /></div>;
        })}
      </div>
    </div>
  );
}

function HorsePiece({ piece, valid, onClick, homeRank }: { piece: NguaPiece; valid: boolean; onClick: (pieceId: string) => void; homeRank?: number }) {
  return (
    <button type="button" className={`ngua-horse-piece ${piece.color} ${valid ? "ngua-horse-valid" : ""}`} onClick={() => valid && onClick(piece.id)} aria-label={`${NGUA_NAMES[piece.color]} quân ${piece.slot + 1}${homeRank ? `, ô ${homeRank}` : ""}`}>
      <Image src="/images/ngua/horse-piece.png" alt="" width={160} height={160} className={`ngua-horse-art ${piece.color}`} draggable={false} />
      {homeRank && <span>{homeRank}</span>}
    </button>
  );
}
