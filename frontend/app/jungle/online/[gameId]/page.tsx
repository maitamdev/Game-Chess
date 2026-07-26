"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import JungleBoard from "@/components/jungle/JungleBoard";
import JunglePlayerCard from "@/components/jungle/JunglePlayerCard";
import MoveList from "@/components/game/MoveList";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import SoundToggle from "@/components/ui/SoundToggle";
import { api, type GameDetail } from "@/lib/api";
import { getGameSocket, type SocketStatus } from "@/lib/ws";
import { Jungle, type JgColor, type JgMove } from "@/lib/jungle/rules";
import { trackJgPieces } from "@/lib/jungle/tracker";
import {
  jgCapturedEmoji,
  jgResultTitle,
  JG_TERMINATION_LABELS,
  playJgMoveSound,
} from "@/lib/jungle/labels";
import { playSound } from "@/lib/sounds";
import { useAuthStore } from "@/stores/authStore";

interface ServerTimes {
  white: number; // Đỏ
  black: number; // Xanh
  at: number;
  ply: number;
}

interface OnlineResult {
  winner: JgColor | null;
  termination: string;
  raw: string;
  eloChange: number;
  newElo: number;
}

/** server san = "Tên uci" (ví dụ "Chuột a2a3") → uci là 4 ký tự cuối */
function uciFromSan(san: string): string {
  return san.slice(-4);
}

export default function JungleOnlineGamePage() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);

  const { data: detail } = useQuery({
    queryKey: ["game", gameId],
    queryFn: () => api<GameDetail>(`/api/games/${gameId}`),
    enabled: !!gameId,
  });

  const [sans, setSans] = useState<string[] | null>(null);
  const [pending, setPending] = useState<{ san: string; ply: number } | null>(null);
  const [times, setTimes] = useState<ServerTimes | null>(null);
  const [result, setResult] = useState<OnlineResult | null>(null);
  const [drawOffer, setDrawOffer] = useState<string | null>(null);
  const [oppDeadline, setOppDeadline] = useState<number | null>(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>("closed");
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [modalDismissed, setModalDismissed] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);
  const [, setClockTick] = useState(0);

  const sansRef = useRef<string[]>([]);

  useEffect(() => {
    if (hydrated && !accessToken) router.replace("/login?next=/jungle/online");
  }, [hydrated, accessToken, router]);

  const myColor: JgColor | null = useMemo(() => {
    if (!detail || !user) return null;
    if (detail.white.id === user.id) return "r";
    if (detail.black.id === user.id) return "b";
    return null;
  }, [detail, user]);

  const displaySans = useMemo(() => {
    const base = sans ?? [];
    return pending && pending.ply === base.length + 1 ? [...base, pending.san] : base;
  }, [sans, pending]);

  const { verboseMoves, liveGame } = useMemo(() => {
    const game = new Jungle();
    const moves: JgMove[] = [];
    for (const san of displaySans) {
      const mv = game.move(uciFromSan(san));
      if (!mv) break;
      moves.push(mv);
    }
    return { verboseMoves: moves, liveGame: game };
  }, [displaySans]);

  const isLive = viewIndex === null;
  const shownIndex = viewIndex ?? verboseMoves.length;
  const pieces = useMemo(
    () => trackJgPieces(verboseMoves, shownIndex),
    [verboseMoves, shownIndex],
  );
  const lastMove =
    shownIndex > 0
      ? {
          from: verboseMoves[shownIndex - 1].from,
          to: verboseMoves[shownIndex - 1].to,
        }
      : null;
  const turn = liveGame.turn();

  sansRef.current = sans ?? [];

  const sendMove = useCallback(
    (from: string, to: string) => {
      const base = sansRef.current;
      const game = new Jungle();
      for (const san of base) game.move(uciFromSan(san));
      const mv = game.move({ from, to });
      if (!mv) return;
      const ply = base.length + 1;
      setPending({ san: mv.san, ply });
      getGameSocket().send({ type: "move", game_id: gameId, uci: mv.uci, ply });
      playJgMoveSound(mv.captured !== undefined, false);
    },
    [gameId],
  );

  useEffect(() => {
    const socket = getGameSocket();
    socket.connect();

    const offStatus = socket.onStatus((status) => {
      setSocketStatus(status);
      if (status === "open") {
        setViewOnly(false);
        socket.send({ type: "sync", game_id: gameId });
      }
    });

    const offMsg = socket.onMessage((raw) => {
      const msg = raw as Record<string, unknown> & { type: string };
      if (msg.game_id !== undefined && msg.game_id !== gameId) return;

      switch (msg.type) {
        case "game_state": {
          const st = msg as unknown as {
            moves: string[];
            white_time_ms: number;
            black_time_ms: number;
            ply: number;
          };
          setSans(st.moves);
          setPending(null);
          setTimes({
            white: st.white_time_ms,
            black: st.black_time_ms,
            at: performance.now(),
            ply: st.ply,
          });
          break;
        }
        case "move_made": {
          const mv = msg as unknown as {
            san: string;
            ply: number;
            white_time_ms: number;
            black_time_ms: number;
          };
          if (mv.ply > sansRef.current.length + 1) {
            socket.send({ type: "sync", game_id: gameId });
          } else {
            setSans((prev) => {
              const base = prev ?? [];
              return mv.ply === base.length + 1 ? [...base, mv.san] : base;
            });
          }
          setPending((p) => (p && p.ply <= mv.ply ? null : p));
          setTimes({
            white: mv.white_time_ms,
            black: mv.black_time_ms,
            at: performance.now(),
            ply: mv.ply,
          });
          break;
        }
        case "illegal_move":
          setPending(null);
          if (msg.reason === "view_only") setViewOnly(true);
          socket.send({ type: "sync", game_id: gameId });
          break;
        case "game_over": {
          const over = msg as unknown as {
            result: string;
            termination: string;
            elo_change: number;
            new_elo: number;
          };
          setResult({
            winner:
              over.result === "white" ? "r" : over.result === "black" ? "b" : null,
            termination: over.termination,
            raw: over.result,
            eloChange: over.elo_change,
            newElo: over.new_elo,
          });
          setDrawOffer(null);
          setOppDeadline(null);
          playSound("game-end");
          const u = useAuthStore.getState().user;
          if (u && over.new_elo > 0 && over.result !== "aborted" && !msg.replay) {
            useAuthStore.setState({ user: { ...u, jg_elo: over.new_elo } });
          }
          break;
        }
        case "draw_offered":
          setDrawOffer(String(msg.from ?? "Đối thủ"));
          break;
        case "opponent_disconnected":
          setOppDeadline(Date.now() + Number(msg.reconnect_deadline_ms ?? 60000));
          break;
        case "opponent_reconnected":
          setOppDeadline(null);
          break;
        case "view_only":
          setViewOnly(true);
          break;
      }
    });

    socket.send({ type: "sync", game_id: gameId });
    return () => {
      offMsg();
      offStatus();
    };
  }, [gameId]);

  // âm thanh nước đối thủ
  const prevLenRef = useRef<number | null>(null);
  useEffect(() => {
    if (!sans) return;
    const len = sans.length;
    const prev = prevLenRef.current;
    prevLenRef.current = len;
    if (prev === null || len !== prev + 1 || myColor === null) return;
    const moverIsMe = (len % 2 === 1 ? "r" : "b") === myColor;
    if (!moverIsMe) {
      const game = new Jungle();
      let captured = false;
      for (let i = 0; i < len; i++) {
        const mv = game.move(uciFromSan(sans[i]));
        if (i === len - 1) captured = mv?.captured !== undefined;
      }
      playJgMoveSound(captured, false);
    }
  }, [sans, myColor]);

  useEffect(() => {
    if (result) return;
    const t = setInterval(() => setClockTick((n) => n + 1), 100);
    return () => clearInterval(t);
  }, [result]);

  const serverSideToMove: JgColor | null = times
    ? times.ply % 2 === 0
      ? "r"
      : "b"
    : null;

  const displayTimes = useMemo(() => {
    if (!times) return { r: 0, b: 0 };
    let { white: r, black: b } = times;
    if (times.ply >= 1 && !result) {
      const elapsed = performance.now() - times.at;
      if (serverSideToMove === "r") r -= elapsed;
      else b -= elapsed;
    }
    return { r: Math.max(0, r), b: Math.max(0, b) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [times, serverSideToMove, result, Math.floor(performance.now() / 100)]);

  const interactive =
    !result && !viewOnly && myColor !== null && isLive && sans !== null;

  const legalMovesFrom = useCallback(
    (sq: string): JgMove[] => {
      if (turn !== myColor || pending) return [];
      return liveGame.moves({ square: sq });
    },
    [liveGame, turn, myColor, pending],
  );

  const orientation = myColor === "b" ? "blue" : "red";
  const topColor: JgColor = orientation === "red" ? "b" : "r";
  const bottomColor: JgColor = orientation === "red" ? "r" : "b";
  const cardWidth = {
    width: "calc(min(72vh, 600px) * 7 / 9)",
    maxWidth: "calc(100vw - 32px)",
  };

  const card = (color: JgColor) => {
    const player = color === "r" ? detail?.white : detail?.black;
    return (
      <JunglePlayerCard
        name={player?.username ?? "…"}
        subtitle={player ? `Elo ${player.elo}` : undefined}
        color={color}
        clockMs={times ? (color === "r" ? displayTimes.r : displayTimes.b) : null}
        clockActive={!result && (times?.ply ?? 0) >= 1 && serverSideToMove === color}
        capturedEmoji={jgCapturedEmoji(
          verboseMoves,
          shownIndex,
          color === "r" ? "b" : "r",
        )}
      />
    );
  };

  const oppSecondsLeft =
    oppDeadline !== null
      ? Math.max(0, Math.ceil((oppDeadline - Date.now()) / 1000))
      : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {(socketStatus === "reconnecting" ||
        viewOnly ||
        oppSecondsLeft !== null ||
        drawOffer) && (
        <div className="mb-4 flex flex-col gap-2">
          {socketStatus === "reconnecting" && (
            <p className="rounded-[6px] border border-rust bg-rust/10 px-4 py-2 text-sm text-rust">
              Mất kết nối — đang thử kết nối lại…
            </p>
          )}
          {viewOnly && (
            <div className="flex items-center gap-3 rounded-[6px] border border-line bg-slate px-4 py-2 text-sm text-muted">
              <span className="flex-1">
                Ván này đang được điều khiển ở một tab khác — tab này chỉ xem.
              </span>
              <Button
                size="sm"
                onClick={() => {
                  setViewOnly(false);
                  getGameSocket().send({ type: "sync", game_id: gameId });
                }}
              >
                Chơi ở tab này
              </Button>
            </div>
          )}
          {oppSecondsLeft !== null && (
            <p className="rounded-[6px] border border-brass bg-brass/10 px-4 py-2 text-sm text-brass">
              Đối thủ mất kết nối — xử thua sau {oppSecondsLeft} giây nếu không
              quay lại.
            </p>
          )}
          {drawOffer && !result && (
            <div className="flex items-center gap-3 rounded-[6px] border border-line bg-slate px-4 py-2 text-sm">
              <span>
                <span className="text-brass">{drawOffer}</span> đề nghị hoà.
              </span>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  getGameSocket().send({
                    type: "respond_draw",
                    game_id: gameId,
                    accept: true,
                  });
                  setDrawOffer(null);
                }}
              >
                Đồng ý
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  getGameSocket().send({
                    type: "respond_draw",
                    game_id: gameId,
                    accept: false,
                  });
                  setDrawOffer(null);
                }}
              >
                Từ chối
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
        <div className="flex flex-col gap-3">
          <div style={cardWidth}>{card(topColor)}</div>
          <JungleBoard
            pieces={pieces}
            turn={turn}
            orientation={orientation}
            interactive={interactive}
            movableColor={myColor}
            legalMovesFrom={legalMovesFrom}
            onMove={sendMove}
            lastMove={lastMove}
          />
          <div style={cardWidth}>{card(bottomColor)}</div>
        </div>

        <aside className="flex w-full max-w-sm flex-col gap-3 lg:h-[min(78vh,660px)] lg:w-72 lg:self-center">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {myColor && !result && !viewOnly && (
                <>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      if (!confirmResign) {
                        setConfirmResign(true);
                        setTimeout(() => setConfirmResign(false), 3000);
                        return;
                      }
                      getGameSocket().send({ type: "resign", game_id: gameId });
                      setConfirmResign(false);
                    }}
                  >
                    {confirmResign ? "Chắc chắn?" : "⚑ Đầu hàng"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      getGameSocket().send({ type: "offer_draw", game_id: gameId })
                    }
                  >
                    ½ Cầu hoà
                  </Button>
                </>
              )}
              {result && (
                <Button size="sm" onClick={() => router.push(`/game/${gameId}`)}>
                  Xem lại ván
                </Button>
              )}
            </div>
            <SoundToggle />
          </div>
          <MoveList
            moves={verboseMoves}
            viewIndex={shownIndex}
            onSelect={(i) => setViewIndex(i >= verboseMoves.length ? null : i)}
          />
        </aside>
      </div>

      <Modal open={!!result && !modalDismissed} onClose={() => setModalDismissed(true)}>
        {result && (
          <div className="text-center">
            <span aria-hidden className="text-2xl leading-none">
              {result.winner === null ? "½–½" : result.winner === "r" ? "🦁" : "🐯"}
            </span>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold">
              {jgResultTitle(result.winner, result.termination)}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {JG_TERMINATION_LABELS[result.termination] ?? result.termination}
            </p>
            {myColor && result.raw !== "aborted" && (
              <p className="mt-3 text-sm">
                Elo cờ thú:{" "}
                <span
                  className={`font-[family-name:var(--font-mono)] ${
                    result.eloChange >= 0 ? "text-sage" : "text-rust"
                  }`}
                >
                  {result.eloChange >= 0 ? "+" : ""}
                  {result.eloChange}
                </span>{" "}
                →{" "}
                <span className="font-[family-name:var(--font-mono)]">
                  {result.newElo}
                </span>
              </p>
            )}
            <div className="mt-6 flex justify-center gap-2">
              <Button variant="primary" onClick={() => router.push("/jungle/online")}>
                Tìm trận mới
              </Button>
              {result.raw !== "aborted" && (
                <Button onClick={() => router.push(`/game/${gameId}`)}>
                  Xem lại ván
                </Button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setModalDismissed(true)}
              className="mt-4 text-xs text-muted transition-colors hover:text-parchment"
            >
              Đóng và xem lại bàn cờ
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
