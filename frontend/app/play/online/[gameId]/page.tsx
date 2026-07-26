"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Chess, type Color, type Move, type PieceSymbol, type Square } from "chess.js";
import ChessBoard from "@/components/board/ChessBoard";
import PlayerCard from "@/components/game/PlayerCard";
import MoveList from "@/components/game/MoveList";
import GameOverModal from "@/components/game/GameOverModal";
import Button from "@/components/ui/Button";
import SoundToggle from "@/components/ui/SoundToggle";
import { api, type GameDetail } from "@/lib/api";
import { getGameSocket, type SocketStatus } from "@/lib/ws";
import { playSound } from "@/lib/sounds";
import { trackPieces } from "@/lib/pieceTracker";
import { useAuthStore } from "@/stores/authStore";
import type { GameResult, Termination } from "@/lib/types";

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9, k: 0,
};

interface ServerTimes {
  white: number;
  black: number;
  /** performance.now() lúc nhận thông điệp — client nội suy từ mốc này */
  at: number;
  ply: number;
}

interface OnlineResult extends GameResult {
  eloChange: number;
  newElo: number;
  raw: string;
}

function soundFor(san: string, check: boolean, gameEnd: boolean) {
  if (gameEnd) return playSound("game-end");
  if (check) return playSound("check");
  if (san.startsWith("O-O")) return playSound("castle");
  if (san.includes("x")) return playSound("capture");
  playSound("move");
}

export default function OnlineGamePage() {
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
  const [premove, setPremove] = useState<{
    from: Square;
    to: Square;
    promotion?: PieceSymbol;
  } | null>(null);
  const [viewIndex, setViewIndex] = useState<number | null>(null); // null = live
  const [modalDismissed, setModalDismissed] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);
  const [, setClockTick] = useState(0);

  const premoveRef = useRef(premove);
  premoveRef.current = premove;
  const sansRef = useRef<string[]>([]);

  useEffect(() => {
    if (hydrated && !accessToken) router.replace(`/login?next=/play/online`);
  }, [hydrated, accessToken, router]);

  const myColor: Color | null = useMemo(() => {
    if (!detail || !user) return null;
    if (detail.white.id === user.id) return "w";
    if (detail.black.id === user.id) return "b";
    return null;
  }, [detail, user]);

  // SAN hiển thị = SAN server + nước lạc quan đang chờ xác nhận
  const displaySans = useMemo(() => {
    const base = sans ?? [];
    return pending && pending.ply === base.length + 1
      ? [...base, pending.san]
      : base;
  }, [sans, pending]);

  // Dựng lại verbose moves + thế cờ hiện tại từ SAN
  const { verboseMoves, liveChess } = useMemo(() => {
    const chess = new Chess();
    const moves: Move[] = [];
    for (const san of displaySans) {
      try {
        moves.push(chess.move(san));
      } catch {
        break; // dữ liệu lệch — sync sẽ sửa
      }
    }
    return { verboseMoves: moves, liveChess: chess };
  }, [displaySans]);

  const isLive = viewIndex === null;
  const shownIndex = viewIndex ?? verboseMoves.length;
  const pieces = useMemo(
    () => trackPieces(verboseMoves, shownIndex),
    [verboseMoves, shownIndex],
  );
  const lastMove = useMemo(
    () =>
      shownIndex > 0
        ? {
            from: verboseMoves[shownIndex - 1].from,
            to: verboseMoves[shownIndex - 1].to,
          }
        : null,
    [verboseMoves, shownIndex],
  );
  const turn = liveChess.turn();

  const checkSquare = useMemo(() => {
    const chess = new Chess();
    for (let i = 0; i < shownIndex; i++) chess.move(verboseMoves[i]);
    if (!chess.inCheck()) return null;
    for (const row of chess.board()) {
      for (const p of row) {
        if (p && p.type === "k" && p.color === chess.turn()) return p.square;
      }
    }
    return null;
  }, [verboseMoves, shownIndex]);

  const captured = useMemo(() => {
    const byWhite: PieceSymbol[] = [];
    const byBlack: PieceSymbol[] = [];
    for (const m of verboseMoves) {
      if (m.captured) (m.color === "w" ? byWhite : byBlack).push(m.captured);
    }
    const diff =
      byWhite.reduce((s, t) => s + PIECE_VALUES[t], 0) -
      byBlack.reduce((s, t) => s + PIECE_VALUES[t], 0);
    return { byWhite, byBlack, whiteDiff: diff, blackDiff: -diff };
  }, [verboseMoves]);

  sansRef.current = sans ?? [];

  const sendMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      const base = sansRef.current;
      const chess = new Chess();
      for (const san of base) chess.move(san);
      let move: Move;
      try {
        move = chess.move({ from, to, promotion });
      } catch {
        return;
      }
      const ply = base.length + 1;
      setPending({ san: move.san, ply });
      getGameSocket().send({ type: "move", game_id: gameId, uci: `${from}${to}${promotion ?? ""}`, ply });
      soundFor(move.san, chess.inCheck(), false);
    },
    [gameId],
  );

  // Nhận thông điệp từ server
  useEffect(() => {
    const socket = getGameSocket();
    socket.connect();

    const offStatus = socket.onStatus((status) => {
      setSocketStatus(status);
      if (status === "open") {
        // sync luôn thăng kết nối này thành tab chơi — reset cờ chỉ-xem;
        // nếu tab khác chiếm chỗ, server sẽ gửi lại view_only
        setViewOnly(false);
        socket.send({ type: "sync", game_id: gameId });
      }
    });

    const offMsg = socket.onMessage((raw) => {
      const msg = raw as Record<string, unknown> & { type: string };
      if (msg.game_id !== undefined && msg.game_id !== gameId) return;

      switch (msg.type) {
        case "game_state": {
          const state = msg as unknown as {
            moves: string[];
            white_time_ms: number;
            black_time_ms: number;
            ply: number;
          };
          setSans(state.moves);
          setPending(null);
          setTimes({
            white: state.white_time_ms,
            black: state.black_time_ms,
            at: performance.now(),
            ply: state.ply,
          });
          break;
        }
        case "move_made": {
          const mv = msg as unknown as {
            san: string;
            ply: number;
            white_time_ms: number;
            black_time_ms: number;
            check: boolean;
          };
          // quyết định đồng bộ NGOÀI hàm updater (updater phải thuần —
          // StrictMode gọi nó hai lần)
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
        case "illegal_move": {
          setPending(null);
          setPremove(null);
          if (msg.reason === "view_only") setViewOnly(true);
          socket.send({ type: "sync", game_id: gameId });
          break;
        }
        case "game_over": {
          const over = msg as unknown as {
            result: string;
            termination: string;
            elo_change: number;
            new_elo: number;
          };
          setResult({
            winner:
              over.result === "white"
                ? "white"
                : over.result === "black"
                  ? "black"
                  : null,
            termination: over.termination as Termination,
            raw: over.result,
            eloChange: over.elo_change,
            newElo: over.new_elo,
          });
          setPremove(null);
          setDrawOffer(null);
          setOppDeadline(null);
          playSound("game-end");
          // cập nhật Elo trong header — bỏ qua game_over phát lại từ CSDL
          // khi mở lại ván cũ (msg.replay), tránh ghi đè Elo hiện tại
          const u = useAuthStore.getState().user;
          if (u && over.new_elo > 0 && over.result !== "aborted" && !msg.replay) {
            useAuthStore.setState({ user: { ...u, elo: over.new_elo } });
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

  // Âm thanh + premove khi đối thủ vừa đi.
  // prev === null nuốt lần đồng bộ đầu (không phát lại tiếng nước cũ);
  // len !== prev + 1 chặn nhảy nhiều nước do sync; myColor null = chưa rõ vai
  const prevLenRef = useRef<number | null>(null);
  useEffect(() => {
    if (!sans) return;
    const len = sans.length;
    const prev = prevLenRef.current;
    prevLenRef.current = len;
    if (prev === null || len !== prev + 1 || myColor === null) return;
    const lastSan = sans[len - 1];
    const moverIsMe =
      myColor !== null && (len % 2 === 1 ? "w" : "b") === myColor;
    if (!moverIsMe) {
      soundFor(lastSan, lastSan.includes("+") || lastSan.includes("#"), false);
      // premove: tự động gửi ngay khi đối thủ đi xong; huỷ nếu thành không hợp lệ
      const pm = premoveRef.current;
      if (pm && !result) {
        setPremove(null);
        const chess = new Chess();
        try {
          for (const san of sans) chess.move(san);
          chess.move({ from: pm.from, to: pm.to, promotion: pm.promotion });
          sendMove(pm.from, pm.to, pm.promotion);
        } catch {
          // premove không còn hợp lệ — huỷ trong im lặng
        }
      }
    }
  }, [sans, myColor, result, sendMove]);

  // Đồng hồ nội suy — chạy mượt giữa các thông điệp server
  useEffect(() => {
    if (result) return;
    const t = setInterval(() => setClockTick((n) => n + 1), 100);
    return () => clearInterval(t);
  }, [result]);

  // Bên đang tiêu thời gian tính từ ply do SERVER xác nhận — không dùng
  // turn suy từ displaySans vì nước pending lạc quan sẽ lật turn sớm
  // và trừ nhầm giờ của đối thủ trong lúc chờ server phản hồi
  const serverSideToMove: Color | null = times
    ? times.ply % 2 === 0
      ? "w"
      : "b"
    : null;

  const displayTimes = useMemo(() => {
    if (!times) return { white: 0, black: 0 };
    let { white, black } = times;
    if (times.ply >= 1 && !result) {
      const elapsed = performance.now() - times.at;
      if (serverSideToMove === "w") white -= elapsed;
      else black -= elapsed;
    }
    return { white: Math.max(0, white), black: Math.max(0, black) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [times, serverSideToMove, result, Math.floor(performance.now() / 100)]);

  const interactive =
    !result && !viewOnly && myColor !== null && isLive && sans !== null;

  const legalMovesFrom = useCallback(
    (sq: Square): Move[] => {
      if (turn !== myColor || pending) return [];
      return liveChess.moves({ square: sq, verbose: true });
    },
    [liveChess, turn, myColor, pending],
  );

  const premoveMovesFrom = useCallback(
    (sq: Square): Move[] => {
      // đảo lượt trong FEN để sinh nước "giả định" cho premove
      const parts = liveChess.fen().split(" ");
      parts[1] = parts[1] === "w" ? "b" : "w";
      parts[3] = "-";
      try {
        return new Chess(parts.join(" ")).moves({ square: sq, verbose: true });
      } catch {
        return [];
      }
    },
    [liveChess],
  );

  const orientation = myColor === "b" ? "black" : "white";
  const topColor: Color = orientation === "white" ? "b" : "w";
  const bottomColor: Color = orientation === "white" ? "w" : "b";
  const boardWidth = { width: "min(80vh, 640px)", maxWidth: "calc(100vw - 32px)" };

  const card = (color: Color) => {
    const player = color === "w" ? detail?.white : detail?.black;
    return (
      <PlayerCard
        name={player?.username ?? "…"}
        subtitle={player ? `Elo ${player.elo}` : undefined}
        color={color}
        clockMs={times ? (color === "w" ? displayTimes.white : displayTimes.black) : null}
        clockActive={!result && (times?.ply ?? 0) >= 1 && serverSideToMove === color}
        capturedTypes={color === "w" ? captured.byWhite : captured.byBlack}
        materialDiff={color === "w" ? captured.whiteDiff : captured.blackDiff}
      />
    );
  };

  const oppSecondsLeft =
    oppDeadline !== null
      ? Math.max(0, Math.ceil((oppDeadline - Date.now()) / 1000))
      : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Banner trạng thái */}
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
          <div style={boardWidth}>{card(topColor)}</div>
          <ChessBoard
            pieces={pieces}
            turn={turn}
            orientation={orientation}
            interactive={interactive}
            movableColor={myColor}
            legalMovesFrom={legalMovesFrom}
            onMove={sendMove}
            lastMove={lastMove}
            checkSquare={checkSquare}
            premoveColor={interactive ? myColor : null}
            premove={premove ? { from: premove.from, to: premove.to } : null}
            onPremove={(from, to, promotion) => setPremove({ from, to, promotion })}
            onPremoveCancel={() => setPremove(null)}
            premoveMovesFrom={premoveMovesFrom}
          />
          <div style={boardWidth}>{card(bottomColor)}</div>
        </div>

        <aside className="flex w-full max-w-sm flex-col gap-3 lg:h-[min(80vh,640px)] lg:w-72 lg:self-center">
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
            onSelect={(i) =>
              setViewIndex(i >= verboseMoves.length ? null : i)
            }
          />
        </aside>
      </div>

      <GameOverModal
        result={result ? { winner: result.winner, termination: result.termination } : null}
        open={!!result && !modalDismissed}
        onClose={() => setModalDismissed(true)}
        actions={[
          {
            label: "Tìm trận mới",
            primary: true,
            onClick: () => router.push("/play/online"),
          },
          ...(result?.raw !== "aborted"
            ? [{ label: "Xem lại ván", onClick: () => router.push(`/game/${gameId}`) }]
            : []),
        ]}
      />
      {result && myColor && result.raw !== "aborted" && !modalDismissed && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 rounded-[6px] border border-line bg-slate px-4 py-2 text-sm">
          Elo:{" "}
          <span
            className={`font-[family-name:var(--font-mono)] ${
              result.eloChange >= 0 ? "text-sage" : "text-rust"
            }`}
          >
            {result.eloChange >= 0 ? "+" : ""}
            {result.eloChange}
          </span>{" "}
          → <span className="font-[family-name:var(--font-mono)]">{result.newElo}</span>
        </div>
      )}
    </div>
  );
}
