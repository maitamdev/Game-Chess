"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CaroBoard from "@/components/caro/CaroBoard";
import CaroPlayerCard from "@/components/caro/CaroPlayerCard";
import MoveList from "@/components/game/MoveList";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import SoundToggle from "@/components/ui/SoundToggle";
import { useOnlineGame } from "@/lib/online/useOnlineGame";
import { Caro, type CaroColor, type CaroMove } from "@/lib/caro/rules";
import {
  caroResultTitle,
  CARO_TERMINATION_LABELS,
  playCaroMoveSound,
} from "@/lib/caro/labels";

export default function CaroOnlineGamePage() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;
  const router = useRouter();

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

  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [modalDismissed, setModalDismissed] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);

  // server 'white' = X (đi trước), 'black' = O
  const myColor: CaroColor | null =
    onlineColor === "white" ? "x" : onlineColor === "black" ? "o" : null;

  const { verboseMoves, liveGame } = useMemo(() => {
    const game = new Caro();
    const moves: CaroMove[] = [];
    for (const uci of displayUcis) {
      const mv = game.move(uci);
      if (!mv) break;
      moves.push(mv);
    }
    return { verboseMoves: moves, liveGame: game };
  }, [displayUcis]);

  const isLive = viewIndex === null;
  const shownIndex = viewIndex ?? verboseMoves.length;
  const stones = useMemo(
    () => verboseMoves.slice(0, shownIndex),
    [verboseMoves, shownIndex],
  );
  const lastMove =
    shownIndex > 0
      ? { x: verboseMoves[shownIndex - 1].x, y: verboseMoves[shownIndex - 1].y }
      : null;
  const turn = liveGame.turn();
  const winLine = isLive ? (liveGame.gameEnd()?.line ?? null) : null;

  const handleMove = useCallback(
    (uci: string) => {
      if (pending) return;
      const game = new Caro();
      for (const u of confirmedUcis ?? []) game.move(u);
      if (game.turn() !== myColor) return;
      const mv = game.move(uci);
      if (!mv) return;
      sendMove(mv.uci);
      playCaroMoveSound(false);
    },
    [confirmedUcis, myColor, pending, sendMove],
  );

  // âm thanh nước đối thủ
  const prevLenRef = useRef<number | null>(null);
  useEffect(() => {
    if (confirmedUcis === null) return;
    const len = confirmedUcis.length;
    const prev = prevLenRef.current;
    prevLenRef.current = len;
    if (prev === null || len !== prev + 1 || myColor === null) return;
    const moverIsMe = (len % 2 === 1 ? "x" : "o") === myColor;
    if (!moverIsMe) playCaroMoveSound(false);
  }, [confirmedUcis, myColor]);

  const serverSideToMove: CaroColor = serverTurn === "white" ? "x" : "o";
  const interactive =
    !result && myColor !== null && isLive && confirmedUcis !== null;

  const card = (color: CaroColor) => {
    const player = color === "x" ? state?.white : state?.black;
    return (
      <CaroPlayerCard
        name={player?.username ?? "…"}
        color={color}
        clockMs={
          state ? (color === "x" ? displayTimes.white : displayTimes.black) : null
        }
        clockActive={
          !result && (state?.ply ?? 0) >= 1 && serverSideToMove === color
        }
      />
    );
  };

  if (notFound) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 text-center text-sm text-muted">
        Không tìm thấy ván đấu.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {(connectionLost || oppSecondsLeft !== null || drawOfferFromOpponent) && (
        <div className="mb-4 flex flex-col gap-2">
          {connectionLost && (
            <p className="rounded-[6px] border border-rust bg-rust/10 px-4 py-2 text-sm text-rust">
              Mất kết nối - đang thử kết nối lại…
            </p>
          )}
          {oppSecondsLeft !== null && (
            <p className="rounded-[6px] border border-brass bg-brass/10 px-4 py-2 text-sm text-brass">
              Đối thủ mất kết nối - xử thua sau {oppSecondsLeft} giây nếu không
              quay lại.
            </p>
          )}
          {drawOfferFromOpponent && !result && (
            <div className="flex items-center gap-3 rounded-[6px] border border-line bg-slate px-4 py-2 text-sm">
              <span>Đối thủ đề nghị hoà.</span>
              <Button size="sm" variant="primary" onClick={() => respondDraw(true)}>
                Đồng ý
              </Button>
              <Button size="sm" onClick={() => respondDraw(false)}>
                Từ chối
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            {card("x")}
            {card("o")}
          </div>
          <CaroBoard
            stones={stones}
            turn={turn}
            interactive={interactive}
            movableColor={myColor}
            onMove={handleMove}
            lastMove={lastMove}
            winLine={winLine}
            hint={null}
          />
        </div>

        <aside className="flex w-full flex-col gap-3 lg:w-72">
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

      <Modal open={!!result && !modalDismissed} onClose={() => setModalDismissed(true)}>
        {result && (
          <div className="text-center">
            <span aria-hidden className="text-2xl leading-none">
              {result.raw === "white" ? "✕" : result.raw === "black" ? "○" : "½-½"}
            </span>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold">
              {caroResultTitle(
                result.raw === "white" ? "x" : result.raw === "black" ? "o" : null,
                result.termination,
              )}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {CARO_TERMINATION_LABELS[result.termination] ?? result.termination}
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Button variant="primary" onClick={() => router.push("/caro/online")}>
                Về sảnh
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
