"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowClockwise } from "@phosphor-icons/react/ArrowClockwise";
import { DoorOpen } from "@phosphor-icons/react/DoorOpen";
import { GlobeSimple } from "@phosphor-icons/react/GlobeSimple";
import { LockSimple } from "@phosphor-icons/react/LockSimple";
import { Plus } from "@phosphor-icons/react/Plus";
import { UsersThree } from "@phosphor-icons/react/UsersThree";

import { api, ApiError } from "@/lib/api";
import {
  roomDestination,
  type RoomGameType,
} from "@/lib/rooms/navigation";

export type { RoomGameType } from "@/lib/rooms/navigation";

interface GuestPlayer {
  id: string;
  display_name: string;
}

interface RoomPlayer {
  id: string;
  username: string;
  seat: number;
  is_host: boolean;
}

interface Room {
  code: string;
  title: string;
  game_type: RoomGameType;
  status: "waiting" | "playing" | "finished";
  is_public: boolean;
  max_players: number;
  player_count: number;
  host_name: string;
  is_host: boolean;
  me_seat: number;
  players: RoomPlayer[];
  time_control: string | null;
  game_id: string | null;
  version: number;
  updated_at: number;
}

type PublicRoom = Omit<
  Room,
  "is_public" | "is_host" | "me_seat" | "players" | "game_id" | "version"
>;

const GAME_LABELS: Record<RoomGameType, string> = {
  chess: "Cờ vua",
  xiangqi: "Cờ tướng",
  caro: "Caro",
  jungle: "Cờ thú",
  oanquan: "Ô ăn quan",
  uno: "UNO",
};

const GAME_TYPES = Object.keys(GAME_LABELS) as RoomGameType[];
const TIME_CONTROLS = ["3+2", "5+0", "10+0", "15+10"];

export default function RoomLobby({
  initialGame = "chess",
  lockedGame = false,
  heading = "Sảnh phòng chơi",
}: {
  initialGame?: RoomGameType;
  lockedGame?: boolean;
  heading?: string;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [gameType, setGameType] = useState<RoomGameType>(initialGame);
  const [timeControl, setTimeControl] = useState("10+0");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [rooms, setRooms] = useState<PublicRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [busy, setBusy] = useState<"create" | "join" | string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomListError, setRoomListError] = useState(false);

  useEffect(() => {
    const savedName = window.localStorage.getItem("kd-display-name") ?? "";
    setDisplayName(savedName);
    void api<{ player: GuestPlayer }>("/api/session")
      .then(({ player }) => {
        setDisplayName(player.display_name);
        window.localStorage.setItem("kd-display-name", player.display_name);
        setSessionReady(true);
      })
      .catch(() => setSessionReady(true));
  }, []);

  const loadRooms = useCallback(async () => {
    try {
      const query = lockedGame ? `?game=${encodeURIComponent(gameType)}` : "";
      const data = await api<{ rooms: PublicRoom[] }>(
        `/api/rooms/public${query}`,
      );
      setRooms(data.rooms);
      setRoomListError(false);
    } catch {
      setRooms([]);
      setRoomListError(true);
    } finally {
      setLoadingRooms(false);
    }
  }, [gameType, lockedGame]);

  useEffect(() => {
    void loadRooms();
    const timer = setInterval(loadRooms, 5000);
    return () => clearInterval(timer);
  }, [loadRooms]);

  const ensureSession = async () => {
    const name = displayName.trim();
    if (name.length < 2) {
      throw new ApiError(
        "INVALID_DISPLAY_NAME",
        "Nhập tên hiển thị từ 2 ký tự",
        422,
      );
    }
    const data = await api<{ player: GuestPlayer }>("/api/session", {
      body: { display_name: name },
    });
    window.localStorage.setItem("kd-display-name", data.player.display_name);
  };

  const enterRoom = useCallback(
    (room: Room) => {
      const destination = roomDestination(room);
      if (destination) {
        router.push(destination);
        return;
      }
      setActiveRoom(room);
    },
    [router],
  );

  useEffect(() => {
    if (!activeRoom || activeRoom.game_type === "uno") return;
    const timer = setInterval(async () => {
      try {
        const room = await api<Room>(
          `/api/rooms/status?code=${encodeURIComponent(activeRoom.code)}`,
        );
        enterRoom(room);
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 404) {
          setActiveRoom(null);
          setError("Phòng đã đóng hoặc hết hạn.");
        }
      }
    }, 1200);
    return () => clearInterval(timer);
  }, [activeRoom, enterRoom]);

  const createRoom = async () => {
    setBusy("create");
    setError(null);
    try {
      await ensureSession();
      const room = await api<Room>("/api/rooms/create", {
        body: {
          game_type: gameType,
          time_control: gameType === "uno" ? undefined : timeControl,
          max_players: gameType === "uno" ? maxPlayers : 2,
          title,
          is_public: isPublic,
        },
      });
      enterRoom(room);
      void loadRooms();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Không tạo được phòng",
      );
    } finally {
      setBusy(null);
    }
  };

  const joinRoom = async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (code.length !== 6) {
      setError("Mã phòng gồm 6 ký tự.");
      return;
    }
    setBusy(code);
    setError(null);
    try {
      await ensureSession();
      const room = await api<Room>("/api/rooms/join", { body: { code } });
      enterRoom(room);
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Không vào được phòng",
      );
    } finally {
      setBusy(null);
    }
  };

  const closeRoom = async () => {
    if (!activeRoom) return;
    const code = activeRoom.code;
    setActiveRoom(null);
    await api("/api/rooms/leave", { body: { code } }).catch(() => undefined);
    void loadRooms();
  };

  const copyCode = async () => {
    if (!activeRoom) return;
    await navigator.clipboard.writeText(activeRoom.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const visibleRooms = useMemo(
    () =>
      lockedGame
        ? rooms
        : rooms.filter((room) => room.game_type === gameType),
    [gameType, lockedGame, rooms],
  );

  if (activeRoom) {
    return (
      <div className="room-lobby-page min-h-[calc(100dvh-64px)] px-4 py-10 sm:px-7">
        <section className="mx-auto max-w-2xl rounded-[14px] border border-brass/45 bg-slate p-6 text-center shadow-[0_28px_70px_rgba(2,8,12,.34)] sm:p-9">
          <p className="text-sm font-semibold text-brass">
            {GAME_LABELS[activeRoom.game_type]}
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-parchment">
            {activeRoom.title}
          </h1>
          <p className="mt-2 text-sm text-muted">Đang chờ người chơi còn lại</p>
          <button
            type="button"
            onClick={copyCode}
            className="mt-7 w-full rounded-[10px] border border-brass/45 bg-ink px-4 py-6 font-[family-name:var(--font-mono)] text-4xl font-bold tracking-widest text-brass transition hover:border-brass"
          >
            {activeRoom.code}
          </button>
          <p className="mt-3 text-sm text-muted">
            {copied ? "Đã sao chép mã." : "Bấm vào mã để sao chép."}
          </p>
          <div className="mt-7 grid gap-2 sm:grid-cols-2">
            {Array.from({ length: activeRoom.max_players }, (_, seat) => {
              const player = activeRoom.players.find(
                (item) => item.seat === seat,
              );
              return (
                <div
                  key={seat}
                  className="flex min-h-12 items-center gap-3 rounded-[8px] border border-line bg-ink/55 px-4 text-left"
                >
                  <UsersThree size={18} className="text-brass" aria-hidden />
                  <span className={player ? "text-parchment" : "text-muted"}>
                    {player?.username ?? "Ghế trống"}
                  </span>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={closeRoom}
            className="mt-7 min-h-11 w-full rounded-[8px] border border-line text-sm font-semibold text-muted transition hover:border-rust/60 hover:text-parchment"
          >
            Đóng phòng
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="room-lobby-page min-h-[calc(100dvh-64px)] px-4 py-9 sm:px-7 lg:py-12">
      <div className="mx-auto max-w-[1280px]">
        <header className="max-w-2xl">
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold text-parchment sm:text-5xl">
            {heading}
          </h1>
          <p className="mt-4 max-w-xl leading-7 text-muted">
            Chọn tên hiển thị, tạo phòng hoặc vào một bàn đang mở.
          </p>
        </header>

        <section className="mt-8 grid gap-4 border-y border-line py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <label
              htmlFor="guest-display-name"
              className="block text-sm font-semibold text-parchment"
            >
              Tên hiển thị
            </label>
            <input
              id="guest-display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value.slice(0, 24))}
              placeholder="Ví dụ: Minh Anh"
              autoComplete="nickname"
              className="mt-2 min-h-12 w-full max-w-md rounded-[8px] border border-line bg-ink px-4 text-parchment outline-none transition placeholder:text-muted/55 focus:border-brass"
            />
          </div>
          <div className="flex min-w-0 gap-2">
            <input
              aria-label="Mã phòng"
              value={joinCode}
              onChange={(event) =>
                setJoinCode(
                  event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z2-9]/g, "")
                    .slice(0, 6),
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") void joinRoom(joinCode);
              }}
              placeholder="MÃ PHÒNG"
              className="min-h-12 min-w-0 flex-1 rounded-[8px] border border-line bg-ink px-4 text-center font-[family-name:var(--font-mono)] uppercase tracking-widest text-parchment outline-none transition placeholder:text-muted/45 focus:border-brass md:w-44"
            />
            <button
              type="button"
              onClick={() => void joinRoom(joinCode)}
              disabled={!sessionReady || busy !== null || joinCode.length !== 6}
              className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-[8px] bg-brass px-5 font-bold text-ink transition hover:bg-[#e2bd69] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
            >
              <DoorOpen size={19} aria-hidden />
              Vào phòng
            </button>
          </div>
        </section>

        {!lockedGame && (
          <div className="mt-7 flex gap-2 overflow-x-auto pb-2">
            {GAME_TYPES.map((game) => (
              <button
                key={game}
                type="button"
                onClick={() => setGameType(game)}
                className={`min-h-10 shrink-0 rounded-[8px] border px-4 text-sm font-semibold transition ${
                  gameType === game
                    ? "border-brass bg-brass/12 text-brass"
                    : "border-line text-muted hover:border-brass/45 hover:text-parchment"
                }`}
              >
                {GAME_LABELS[game]}
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(300px,.78fr)_minmax(0,1.35fr)]">
          <section className="rounded-[12px] border border-line bg-slate p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-[8px] border border-brass/35 bg-brass/10 text-brass">
                <Plus size={20} aria-hidden />
              </span>
              <div>
                <h2 className="font-semibold text-parchment">Tạo phòng mới</h2>
                <p className="text-xs text-muted">{GAME_LABELS[gameType]}</p>
              </div>
            </div>

            <label
              htmlFor="room-title"
              className="mt-6 block text-sm font-semibold text-parchment"
            >
              Tên phòng
            </label>
            <input
              id="room-title"
              value={title}
              onChange={(event) => setTitle(event.target.value.slice(0, 48))}
              placeholder={`Phòng của ${displayName.trim() || "bạn"}`}
              className="mt-2 min-h-11 w-full rounded-[8px] border border-line bg-ink px-4 text-sm text-parchment outline-none transition placeholder:text-muted/45 focus:border-brass"
            />

            {gameType === "uno" ? (
              <div className="mt-5">
                <span className="text-sm font-semibold text-parchment">
                  Số người
                </span>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {[2, 3, 4].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setMaxPlayers(count)}
                      className={`min-h-11 rounded-[8px] border text-sm font-semibold transition ${
                        maxPlayers === count
                          ? "border-brass bg-brass/12 text-brass"
                          : "border-line text-muted hover:border-brass/45"
                      }`}
                    >
                      {count} người
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <span className="text-sm font-semibold text-parchment">
                  Thời gian
                </span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {TIME_CONTROLS.map((control) => (
                    <button
                      key={control}
                      type="button"
                      onClick={() => setTimeControl(control)}
                      className={`min-h-11 rounded-[8px] border font-[family-name:var(--font-mono)] text-sm transition ${
                        timeControl === control
                          ? "border-brass bg-brass/12 text-brass"
                          : "border-line text-muted hover:border-brass/45"
                      }`}
                    >
                      {control}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsPublic((value) => !value)}
              className="mt-5 flex w-full items-center justify-between rounded-[8px] border border-line bg-ink/55 px-4 py-3 text-left"
            >
              <span>
                <span className="block text-sm font-semibold text-parchment">
                  {isPublic ? "Phòng công khai" : "Phòng riêng"}
                </span>
                <span className="mt-1 block text-xs text-muted">
                  {isPublic
                    ? "Hiện trong danh sách phòng"
                    : "Chỉ vào được bằng mã"}
                </span>
              </span>
              {isPublic ? (
                <GlobeSimple size={21} className="text-brass" aria-hidden />
              ) : (
                <LockSimple size={21} className="text-muted" aria-hidden />
              )}
            </button>

            <button
              type="button"
              onClick={() => void createRoom()}
              disabled={!sessionReady || busy !== null}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-brass px-5 font-bold text-ink transition hover:bg-[#e2bd69] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={19} aria-hidden />
              {busy === "create" ? "Đang tạo..." : "Tạo phòng"}
            </button>
          </section>

          <section className="min-w-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-parchment">
                  Phòng đang mở
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Chọn một phòng để vào ngay.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadRooms()}
                aria-label="Tải lại danh sách phòng"
                className="grid h-10 w-10 place-items-center rounded-[8px] border border-line text-muted transition hover:border-brass/50 hover:text-parchment"
              >
                <ArrowClockwise size={18} aria-hidden />
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              {loadingRooms ? (
                Array.from({ length: 3 }, (_, index) => (
                  <div
                    key={index}
                    className="h-[92px] animate-pulse rounded-[10px] border border-line bg-slate"
                  />
                ))
              ) : roomListError ? (
                <div className="rounded-[10px] border border-rust/45 bg-rust/10 px-6 py-10 text-center">
                  <p className="font-semibold text-parchment">
                    Chưa tải được danh sách phòng
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Kiểm tra kết nối rồi thử tải lại.
                  </p>
                  <button
                    type="button"
                    onClick={() => void loadRooms()}
                    className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-[8px] border border-line px-4 text-sm font-semibold text-parchment transition hover:border-brass/55"
                  >
                    <ArrowClockwise size={17} aria-hidden />
                    Thử lại
                  </button>
                </div>
              ) : visibleRooms.length === 0 ? (
                <div className="rounded-[10px] border border-dashed border-line px-6 py-12 text-center">
                  <UsersThree
                    size={30}
                    className="mx-auto text-muted"
                    aria-hidden
                  />
                  <p className="mt-4 font-semibold text-parchment">
                    Chưa có phòng đang chờ
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Tạo phòng đầu tiên và gửi mã cho bạn bè.
                  </p>
                </div>
              ) : (
                visibleRooms.map((room) => (
                  <article
                    key={room.code}
                    className="grid gap-4 rounded-[10px] border border-line bg-slate px-5 py-4 transition hover:border-brass/40 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h3 className="truncate font-semibold text-parchment">
                          {room.title}
                        </h3>
                        <span className="text-xs font-semibold text-brass">
                          {GAME_LABELS[room.game_type]}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted">
                        Chủ phòng: {room.host_name}
                        <span className="mx-2 text-line">|</span>
                        {room.player_count}/{room.max_players} người
                        {room.time_control ? (
                          <>
                            <span className="mx-2 text-line">|</span>
                            {room.time_control}
                          </>
                        ) : null}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void joinRoom(room.code)}
                      disabled={busy !== null}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[8px] border border-brass/55 px-4 text-sm font-bold text-brass transition hover:bg-brass hover:text-ink disabled:opacity-40"
                    >
                      <DoorOpen size={17} aria-hidden />
                      {busy === room.code ? "Đang vào..." : "Vào phòng"}
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        {error && (
          <p className="mt-5 rounded-[8px] border border-rust/55 bg-rust/10 px-4 py-3 text-sm text-[#e99a88]">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
