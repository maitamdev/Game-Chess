"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Chess, type Color, type Move, type PieceSymbol, type Square } from "chess.js";
import ChessBoard from "@/components/board/ChessBoard";
import PlayerCard from "@/components/game/PlayerCard";
import MoveList from "@/components/game/MoveList";
import GameOverModal from "@/components/game/GameOverModal";
import Button from "@/components/ui/Button";
import SoundToggle from "@/components/ui/SoundToggle";
import { useOnlineGame } from "@/lib/online/useOnlineGame";
import { playSound } from "@/lib/sounds";
import { trackPieces } from "@/lib/pieceTracker";
import { useAuthStore } from "@/stores/authStore";
import type { GameResult, Termination } from "@/lib/types";

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9, k: 0,
};

function soundFor(san: string, check: boolean, gameEnd: boolean) {
  if (gameEnd) return playSound("game-end");
  if (check) return playSound("check");
  if (san.startsWith("O-O")) return playSound("castle");
  if (san.includes("x")) return playSound("capture");
  playSound("move");
}

/** Áp một nước UCI (4-5 ký tự, có thể kèm phong cấp) — ném lỗi nếu bất hợp lệ */
function applyUci(chess: Chess, uci: string): Move {
  return chess.move({
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: uci.length > 4 ? (uci[4] as PieceSymbol) : undefined,
  });
}

export default function OnlineGamePage() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);

  const {
    state,
    notFound,
    connectionLost,
    myColor: onlineColor,
    confirmedUcis,
    displayUcis,
    pending,
    displayTimes,
    serverTurn,
    drawOfferFromOpponent,
    oppSecondsLeft,
    result,
    sendMove,
    resign,
    offerDraw,
    respondDraw,
  } = useOnlineGame(gameId ?? null);

  const [premove, setPremove] = useState<{
    from: Square;
    to: Square;
    promotion?: PieceSymbol;
  } | null>(null);
  const [viewIndex, setViewIndex] = useState<number | null>(null); // null = live
  const [modalDismissed, setModalDismissed] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);

  const premoveRef = useRef(premove);
  premoveRef.current = premove;

  useEffect(() => {
    if (hydrated && !accessToken) router.replace(`/login?next=/play/online`);
  }, [hydrated, accessToken, router]);

  // server 'white' = Trắng (w), 'black' = Đen (b)
  const myColor: Color | null =
    onlineColor === "white" ? "w" : onlineColor === "black" ? "b" : null;

  // Dựng lại verbose moves + thế cờ hiện tại từ UCI
  const { verboseMoves, liveChess } = useMemo(() => {
    const chess = new Chess();
    const moves: Move[] = [];
    for (const uci of displayUcis) {
      try {
        moves.push(applyUci(chess, uci));
      } catch {
        break; // dữ liệu lệch — poll kế tiếp sẽ sửa
      }
    }
    return { verboseMoves: moves, liveChess: chess };
  }, [displayUcis]);

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

  // Kiểm tra hợp lệ trên nước đã server xác nhận rồi mới gửi lạc quan
  const submitMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      const chess = new Chess();
      let move: Move;
      try {
        for (const uci of confirmedUcis ?? []) applyUci(chess, uci);
        move = chess.move({ from, to, promotion });
      } catch {
        return;
      }
      sendMove(`${from}${to}${promotion ?? ""}`);
      soundFor(move.san, chess.inCheck(), false);
    },
    [confirmedUcis, sendMove],
  );

  // Âm thanh + premove khi đối thủ vừa đi.
  // prev === null nuốt lần đồng bộ đầu (không phát lại tiếng nước cũ);
  // len !== prev + 1 chặn nhảy nhiều nước do sync; myColor null = chưa rõ vai
  const prevLenRef = useRef<number | null>(null);
  useEffect(() => {
    if (confirmedUcis === null) return;
    const len = confirmedUcis.length;
    const prev = prevLenRef.current;
    prevLenRef.current = len;
    if (prev === null || len !== prev + 1 || myColor === null) return;
    const moverIsMe = (len % 2 === 1 ? "w" : "b") === myColor;
    if (moverIsMe) return;

    const chess = new Chess();
    let lastMv: Move | null = null;
    try {
      for (const uci of confirmedUcis) lastMv = applyUci(chess, uci);
    } catch {
      return; // dữ liệu lệch — bỏ qua âm thanh
    }
    if (lastMv) soundFor(lastMv.san, chess.inCheck(), false);

    // premove: tự động gửi ngay khi đối thủ đi xong; huỷ nếu thành không hợp lệ
    const pm = premoveRef.current;
    if (pm && !result) {
      setPremove(null);
      try {
        new Chess(chess.fen()).move({
          from: pm.from,
          to: pm.to,
          promotion: pm.promotion,
        });
        submitMove(pm.from, pm.to, pm.promotion);
      } catch {
        // premove không còn hợp lệ — huỷ trong im lặng
      }
    }
  }, [confirmedUcis, myColor, result, submitMove]);

  // Ván kết thúc → huỷ premove còn treo
  useEffect(() => {
    if (result) setPremove(null);
  }, [result]);

  // Bên đang tiêu thời gian theo server (không dùng turn suy từ displayUcis
  // vì nước pending lạc quan sẽ lật turn sớm và trừ nhầm giờ đối thủ)
  const serverSideToMove: Color = serverTurn === "white" ? "w" : "b";

  const interactive =
    !result && myColor !== null && isLive && confirmedUcis !== null;

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
    const player = color === "w" ? state?.white : state?.black;
    return (
      <PlayerCard
        name={player?.username ?? "…"}
        subtitle={player ? `Elo ${player.elo}` : undefined}
        color={color}
        clockMs={
          state ? (color === "w" ? displayTimes.white : displayTimes.black) : null
        }
        clockActive={
          !result && (state?.ply ?? 0) >= 1 && serverSideToMove === color
        }
        capturedTypes={color === "w" ? captured.byWhite : captured.byBlack}
        materialDiff={color === "w" ? captured.whiteDiff : captured.blackDiff}
      />
    );
  };

  const opponent =
    myColor === "w" ? state?.black : myColor === "b" ? state?.white : null;

  const modalResult: GameResult | null = result
    ? {
        winner:
          result.raw === "white"
            ? "white"
            : result.raw === "black"
              ? "black"
              : null,
        termination: result.termination as Termination,
      }
    : null;

  if (notFound) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 text-center text-sm text-muted">
        Không tìm thấy ván đấu.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Banner trạng thái */}
      {(connectionLost || oppSecondsLeft !== null || drawOfferFromOpponent) && (
        <div className="mb-4 flex flex-col gap-2">
          {connectionLost && (
            <p className="rounded-[6px] border border-rust bg-rust/10 px-4 py-2 text-sm text-rust">
              Mất kết nối — đang thử kết nối lại…
            </p>
          )}
          {oppSecondsLeft !== null && (
            <p className="rounded-[6px] border border-brass bg-brass/10 px-4 py-2 text-sm text-brass">
              Đối thủ mất kết nối — xử thua sau {oppSecondsLeft} giây nếu không
              quay lại.
            </p>
          )}
          {drawOfferFromOpponent && !result && (
            <div className="flex items-center gap-3 rounded-[6px] border border-line bg-slate px-4 py-2 text-sm">
              <span>
                <span className="text-brass">
                  {opponent?.username ?? "Đối thủ"}
                </span>{" "}
                đề nghị hoà.
              </span>
              <Button
                size="sm"
                variant="primary"
                onClick={() => respondDraw(true)}
              >
                Đồng ý
              </Button>
              <Button size="sm" onClick={() => respondDraw(false)}>
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
            onMove={submitMove}
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
              {myColor && !result && (
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
                      resign();
                      setConfirmResign(false);
                    }}
                  >
                    {confirmResign ? "Chắc chắn?" : "⚑ Đầu hàng"}
                  </Button>
                  <Button size="sm" onClick={offerDraw}>
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

      <GameOverModal
        result={modalResult}
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
