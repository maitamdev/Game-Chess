"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import OanquanBoard from "@/components/oanquan/OanquanBoard";
import OanquanPlayerCard from "@/components/oanquan/OanquanPlayerCard";
import MoveList from "@/components/game/MoveList";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import SoundToggle from "@/components/ui/SoundToggle";
import { useOnlineGame } from "@/lib/online/useOnlineGame";
import { OAnQuan, type OqColor, type OqMove } from "@/lib/oanquan/rules";
import { oqBoardAt } from "@/lib/oanquan/tracker";
import {
  oqResultTitle,
  oqSideName,
  OQ_TERMINATION_LABELS,
  playOqMoveSound,
} from "@/lib/oanquan/labels";
import { useAuthStore } from "@/stores/authStore";

export default function OanquanOnlineGamePage() {
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
    if (hydrated && !accessToken) router.replace("/login?next=/oanquan/online");
  }, [hydrated, accessToken, router]);

  // server "white" = bên A (Đỏ, đi trước), "black" = bên B (Xanh)
  const myColor: OqColor | null =
    onlineColor === "white" ? "a" : onlineColor === "black" ? "b" : null;

  // replay uci (đã xác nhận + nước lạc quan) thành danh sách OqMove hiển thị
  const displayMoves = useMemo(() => {
    const game = new OAnQuan();
    const moves: OqMove[] = [];
    for (const uci of displayUcis) {
      const mv = game.move(uci);
      if (!mv) break;
      moves.push(mv);
    }
    return moves;
  }, [displayUcis]);

  const isLive = viewIndex === null;
  const shownIndex = viewIndex ?? displayMoves.length;
  // ô ăn quan mỗi nước đổi nhiều ô → replay bằng oqBoardAt thay vì slice
  const board = useMemo(
    () => oqBoardAt(displayMoves, shownIndex),
    [displayMoves, shownIndex],
  );
  const lastMove = shownIndex > 0 ? displayMoves[shownIndex - 1] : null;

  const handleMove = useCallback(
    (uci: string) => {
      if (pending) return;
      // thử trên bản dựng từ nước đã xác nhận — server vẫn là trọng tài
      const game = new OAnQuan();
      for (const u of confirmedUcis ?? []) {
        if (!game.move(u)) return;
      }
      const mv = game.move(uci);
      if (!mv) return;
      sendMove(mv.uci);
      playOqMoveSound(mv.gained > 0, false);
    },
    [confirmedUcis, pending, sendMove],
  );

  // âm thanh nước đối thủ (nước mình đã kêu lúc gửi lạc quan)
  const prevLenRef = useRef<number | null>(null);
  useEffect(() => {
    if (confirmedUcis === null) return;
    const len = confirmedUcis.length;
    const prev = prevLenRef.current;
    prevLenRef.current = len;
    if (prev === null || len !== prev + 1 || myColor === null) return;
    const game = new OAnQuan();
    let last: OqMove | null = null;
    for (const uci of confirmedUcis) {
      last = game.move(uci);
      if (!last) break;
    }
    if (last && last.color !== myColor) playOqMoveSound(last.gained > 0, false);
  }, [confirmedUcis, myColor]);

  const serverSideToMove: OqColor = serverTurn === "white" ? "a" : "b";
  const interactive =
    !result && myColor !== null && isLive && confirmedUcis !== null;

  const card = (color: OqColor) => {
    const player = color === "a" ? state?.white : state?.black;
    return (
      <OanquanPlayerCard
        name={player?.username ?? "…"}
        subtitle={player ? `Elo ${player.elo}` : undefined}
        color={color}
        clockMs={
          state ? (color === "a" ? displayTimes.white : displayTimes.black) : null
        }
        clockActive={
          !result && (state?.ply ?? 0) >= 1 && serverSideToMove === color
        }
        store={color === "a" ? board.storeA : board.storeB}
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

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {/* bàn vẽ cố định A (Đỏ) dưới, B (Xanh) trên */}
          {card("b")}
          <OanquanBoard
            dan={board.dan}
            quanLeft={board.quanLeft}
            quanRight={board.quanRight}
            turn={board.turn}
            interactive={interactive}
            movableColor={myColor}
            onMove={handleMove}
            lastMove={lastMove}
            hint={null}
          />
          {card("a")}
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
            moves={displayMoves}
            viewIndex={shownIndex}
            onSelect={(i) => setViewIndex(i >= displayMoves.length ? null : i)}
          />
        </aside>
      </div>

      <Modal open={!!result && !modalDismissed} onClose={() => setModalDismissed(true)}>
        {result && (
          <div className="text-center">
            <span aria-hidden className="text-2xl leading-none">
              {result.raw === "white" || result.raw === "black" ? "🌾" : "½–½"}
            </span>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold">
              {oqResultTitle(
                result.raw === "white" ? "a" : result.raw === "black" ? "b" : null,
                result.termination,
              )}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {OQ_TERMINATION_LABELS[result.termination] ?? result.termination}
            </p>
            {result.scoreA !== null && result.scoreB !== null && (
              <p className="mt-2 font-[family-name:var(--font-mono)] text-sm text-parchment/90">
                {oqSideName("a")} {result.scoreA} — {result.scoreB}{" "}
                {oqSideName("b")}
              </p>
            )}
            {myColor && result.raw !== "aborted" && (
              <p className="mt-3 text-sm">
                Elo ô ăn quan:{" "}
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
              <Button variant="primary" onClick={() => router.push("/oanquan/online")}>
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
