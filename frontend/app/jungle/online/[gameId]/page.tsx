"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowSquareOut, Flag, Handshake } from "@phosphor-icons/react";
import JungleBoard from "@/components/jungle/JungleBoard";
import JungleGameFrame from "@/components/jungle/JungleGameFrame";
import JunglePiece from "@/components/jungle/JunglePiece";
import JunglePlayerCard from "@/components/jungle/JunglePlayerCard";
import MoveList from "@/components/game/MoveList";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import SoundToggle from "@/components/ui/SoundToggle";
import { useOnlineGame } from "@/lib/online/useOnlineGame";
import { Jungle, type JgColor, type JgMove } from "@/lib/jungle/rules";
import { trackJgPieces } from "@/lib/jungle/tracker";
import {
  jgCapturedRanks,
  jgResultTitle,
  JG_TERMINATION_LABELS,
  playJgMoveSound,
} from "@/lib/jungle/labels";

export default function JungleOnlineGamePage() {
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

  // server 'white' = Đỏ (r), 'black' = Xanh (b)
  const myColor: JgColor | null =
    onlineColor === "white" ? "r" : onlineColor === "black" ? "b" : null;

  const { verboseMoves, liveGame } = useMemo(() => {
    const game = new Jungle();
    const moves: JgMove[] = [];
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

  const handleMove = useCallback(
    (from: string, to: string) => {
      const game = new Jungle();
      for (const uci of confirmedUcis ?? []) game.move(uci);
      const mv = game.move({ from, to });
      if (!mv) return;
      sendMove(mv.uci);
      playJgMoveSound(mv.captured !== undefined, false);
    },
    [confirmedUcis, sendMove],
  );

  // âm thanh nước đối thủ
  const prevLenRef = useRef<number | null>(null);
  useEffect(() => {
    if (confirmedUcis === null) return;
    const len = confirmedUcis.length;
    const prev = prevLenRef.current;
    prevLenRef.current = len;
    if (prev === null || len !== prev + 1 || myColor === null) return;
    const moverIsMe = (len % 2 === 1 ? "r" : "b") === myColor;
    if (!moverIsMe) {
      const game = new Jungle();
      let captured = false;
      for (let i = 0; i < len; i++) {
        const mv = game.move(confirmedUcis[i]);
        if (i === len - 1) captured = mv?.captured !== undefined;
      }
      playJgMoveSound(captured, false);
    }
  }, [confirmedUcis, myColor]);

  const serverSideToMove: JgColor = serverTurn === "white" ? "r" : "b";
  const interactive =
    !result && myColor !== null && isLive && confirmedUcis !== null;

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
  const card = (color: JgColor) => {
    const player = color === "r" ? state?.white : state?.black;
    return (
      <JunglePlayerCard
        name={player?.username ?? "…"}
        color={color}
        clockMs={
          state ? (color === "r" ? displayTimes.white : displayTimes.black) : null
        }
        clockActive={
          !result && (state?.ply ?? 0) >= 1 && serverSideToMove === color
        }
        isTurn={!result && serverSideToMove === color}
        capturedRanks={jgCapturedRanks(
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
    <>
      <JungleGameFrame
        notices={
          (connectionLost || oppSecondsLeft !== null || drawOfferFromOpponent) && (
            <div className="mb-4 flex flex-col gap-2">
              {connectionLost && (
                <p className="rounded-[10px] border border-rust bg-rust/10 px-4 py-2 text-sm text-rust">
                  Mất kết nối - đang thử kết nối lại…
                </p>
              )}
              {oppSecondsLeft !== null && (
                <p className="rounded-[10px] border border-brass bg-brass/10 px-4 py-2 text-sm text-brass">
                  Đối thủ mất kết nối - xử thua sau {oppSecondsLeft} giây nếu không
                  quay lại.
                </p>
              )}
              {drawOfferFromOpponent && !result && (
                <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-line bg-slate px-4 py-2 text-sm">
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
          )
        }
        topPlayer={card(topColor)}
        board={
          <JungleBoard
            pieces={pieces}
            turn={turn}
            orientation={orientation}
            interactive={interactive}
            movableColor={myColor}
            legalMovesFrom={legalMovesFrom}
            onMove={handleMove}
            lastMove={lastMove}
          />
        }
        bottomPlayer={card(bottomColor)}
        actions={
          <div className="grid grid-cols-2 gap-2">
              {myColor && !result && (
                <>
                  <button
                    type="button"
                    className="jg-action-button"
                    data-danger="true"
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
                    <Flag aria-hidden size={19} weight="duotone" />
                    <span>{confirmResign ? "Chắc chắn?" : "Đầu hàng"}</span>
                  </button>
                  <button type="button" className="jg-action-button" onClick={offerDraw}>
                    <Handshake aria-hidden size={19} weight="duotone" />
                    <span>Cầu hoà</span>
                  </button>
                </>
              )}
              {result && (
                <button
                  type="button"
                  className="jg-action-button col-span-2"
                  onClick={() => router.push(`/game/${gameId}`)}
                >
                  <ArrowSquareOut aria-hidden size={19} weight="duotone" />
                  <span>Xem lại ván</span>
                </button>
              )}
            </div>
        }
        soundControl={<SoundToggle variant="jungle" />}
        moveList={
          <MoveList
            variant="jungle"
            moves={verboseMoves}
            viewIndex={shownIndex}
            onSelect={(i) => setViewIndex(i >= verboseMoves.length ? null : i)}
          />
        }
        statusColor={serverSideToMove}
        statusLabel={
          result
            ? "Ván đã kết thúc"
            : pending
              ? "Đang gửi nước đi"
              : turn === myColor
                ? "Lượt của bạn"
                : "Lượt đối thủ"
        }
      />

      <Modal open={!!result && !modalDismissed} onClose={() => setModalDismissed(true)}>
        {result && (
          <div className="text-center">
            <div aria-hidden className="mx-auto flex h-12 items-center justify-center">
              {result.raw === "white" || result.raw === "black" ? (
                <JunglePiece
                  rank={result.raw === "white" ? 7 : 6}
                  color={result.raw === "white" ? "r" : "b"}
                  showRank={false}
                  className="h-12 w-12"
                />
              ) : (
                <span className="font-[family-name:var(--font-mono)] text-xl text-brass">
                  ½-½
                </span>
              )}
            </div>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold">
              {jgResultTitle(
                result.raw === "white" ? "r" : result.raw === "black" ? "b" : null,
                result.termination,
              )}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {JG_TERMINATION_LABELS[result.termination] ?? result.termination}
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Button variant="primary" onClick={() => router.push("/jungle/online")}>
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
    </>
  );
}
