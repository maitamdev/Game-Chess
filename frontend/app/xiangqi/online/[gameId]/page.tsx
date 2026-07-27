"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import XiangqiBoard from "@/components/xiangqi/XiangqiBoard";
import XqPlayerCard from "@/components/xiangqi/XqPlayerCard";
import MoveList from "@/components/game/MoveList";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import SoundToggle from "@/components/ui/SoundToggle";
import { useOnlineGame } from "@/lib/online/useOnlineGame";
import { Xiangqi, type XqColor, type XqMove } from "@/lib/xiangqi/rules";
import { trackXqPieces } from "@/lib/xiangqi/tracker";
import {
  playXqMoveSound,
  xqCapturedChars,
  xqResultTitle,
  XQ_TERMINATION_LABELS,
} from "@/lib/xiangqi/labels";
import { useAuthStore } from "@/stores/authStore";

export default function XiangqiOnlineGamePage() {
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

  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [modalDismissed, setModalDismissed] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);

  useEffect(() => {
    if (hydrated && !accessToken) router.replace("/login?next=/xiangqi/online");
  }, [hydrated, accessToken, router]);

  // server 'white' = Đỏ (r, đi trước), 'black' = Đen (b)
  const myColor: XqColor | null =
    onlineColor === "white" ? "r" : onlineColor === "black" ? "b" : null;

  const { verboseMoves, liveGame } = useMemo(() => {
    const game = new Xiangqi();
    const moves: XqMove[] = [];
    for (const uci of displayUcis) {
      const mv = game.move(uci);
      if (!mv) break;
      moves.push(mv);
    }
    return { verboseMoves: moves, liveGame: game };
  }, [displayUcis]);

  const isLive = viewIndex === null;
  const shownIndex = viewIndex ?? verboseMoves.length;
  const pieces = useMemo(
    () => trackXqPieces(verboseMoves, shownIndex),
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

  const checkSquare = useMemo(() => {
    const replay = new Xiangqi();
    for (let i = 0; i < shownIndex; i++) replay.pushMove(verboseMoves[i]);
    if (!replay.inCheck()) return null;
    for (const p of replay.pieces()) {
      if (p.type === "k" && p.color === replay.turn()) return p.square;
    }
    return null;
  }, [verboseMoves, shownIndex]);

  const handleMove = useCallback(
    (from: string, to: string) => {
      const game = new Xiangqi();
      for (const uci of confirmedUcis ?? []) game.move(uci);
      const mv = game.move({ from, to });
      if (!mv) return;
      sendMove(mv.uci);
      playXqMoveSound(!!mv.captured, game.inCheck(), false);
    },
    [confirmedUcis, sendMove],
  );

  // âm thanh nước đối thủ (nuốt lần sync đầu và các cú nhảy nhiều nước)
  const prevLenRef = useRef<number | null>(null);
  useEffect(() => {
    if (confirmedUcis === null) return;
    const len = confirmedUcis.length;
    const prev = prevLenRef.current;
    prevLenRef.current = len;
    if (prev === null || len !== prev + 1 || myColor === null) return;
    const moverIsMe = (len % 2 === 1 ? "r" : "b") === myColor;
    if (!moverIsMe) {
      const replay = new Xiangqi();
      let captured = false;
      for (let i = 0; i < len; i++) {
        const mv = replay.move(confirmedUcis[i]);
        if (i === len - 1) captured = !!mv?.captured;
      }
      playXqMoveSound(captured, replay.inCheck(), false);
    }
  }, [confirmedUcis, myColor]);

  const serverSideToMove: XqColor = serverTurn === "white" ? "r" : "b";
  const interactive =
    !result && myColor !== null && isLive && confirmedUcis !== null;

  const legalMovesFrom = useCallback(
    (sq: string): XqMove[] => {
      if (turn !== myColor || pending) return [];
      return liveGame.moves({ square: sq });
    },
    [liveGame, turn, myColor, pending],
  );

  const orientation = myColor === "b" ? "black" : "red";
  const topColor: XqColor = orientation === "red" ? "b" : "r";
  const bottomColor: XqColor = orientation === "red" ? "r" : "b";
  const boardWidth = { width: "min(66vh, 560px)", maxWidth: "calc(100vw - 32px)" };

  const card = (color: XqColor) => {
    const player = color === "r" ? state?.white : state?.black;
    return (
      <XqPlayerCard
        name={player?.username ?? "…"}
        subtitle={player ? `Elo ${player.elo}` : undefined}
        color={color}
        clockMs={
          state ? (color === "r" ? displayTimes.white : displayTimes.black) : null
        }
        clockActive={
          !result && (state?.ply ?? 0) >= 1 && serverSideToMove === color
        }
        capturedChars={xqCapturedChars(
          verboseMoves,
          shownIndex,
          color === "r" ? "b" : "r",
        )}
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

      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
        <div className="flex flex-col gap-3">
          <div style={boardWidth}>{card(topColor)}</div>
          <XiangqiBoard
            pieces={pieces}
            turn={turn}
            orientation={orientation}
            interactive={interactive}
            movableColor={myColor}
            legalMovesFrom={legalMovesFrom}
            onMove={handleMove}
            lastMove={lastMove}
            checkSquare={checkSquare}
          />
          <div style={boardWidth}>{card(bottomColor)}</div>
        </div>

        <aside className="flex w-full max-w-sm flex-col gap-3 lg:h-[min(73vh,620px)] lg:w-72 lg:self-center">
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
              {result.raw === "white" ? "1–0" : result.raw === "black" ? "0–1" : "½–½"}
            </span>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold">
              {xqResultTitle(
                result.raw === "white" ? "r" : result.raw === "black" ? "b" : null,
                result.termination,
              )}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {XQ_TERMINATION_LABELS[result.termination] ?? result.termination}
            </p>
            {myColor && result.raw !== "aborted" && (
              <p className="mt-3 text-sm">
                Elo cờ tướng:{" "}
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
              <Button variant="primary" onClick={() => router.push("/xiangqi/online")}>
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
