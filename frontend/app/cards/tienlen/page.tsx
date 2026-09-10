"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowClockwise } from "@phosphor-icons/react/ArrowClockwise";
import { ArrowLeft } from "@phosphor-icons/react/ArrowLeft";
import { BookOpenText } from "@phosphor-icons/react/BookOpenText";
import { CardsThree } from "@phosphor-icons/react/CardsThree";
import { CheckCircle } from "@phosphor-icons/react/CheckCircle";
import { Lightbulb } from "@phosphor-icons/react/Lightbulb";
import { Robot } from "@phosphor-icons/react/Robot";
import { WarningCircle } from "@phosphor-icons/react/WarningCircle";
import TienLenCard from "@/components/cards/TienLenCard";
import Button from "@/components/ui/Button";
import { createStandardDeck, type StandardCard } from "@/lib/cards/deck";
import {
  canBeat,
  enumeratePlays,
  findFirstPlayer,
  getPlayLabel,
  getWhiteWinReason,
  isLegalPlay,
  sortTienLenCards,
  type TienLenPlay,
} from "@/lib/cards/tienlen";

const PLAYER_NAMES = ["Bạn", "Minh", "Linh", "Quân"];
const PLAYER_TONES = ["player-you", "player-blue", "player-rose", "player-gold"];

interface TienLenState {
  hands: StandardCard[][];
  round: number;
  currentPlayer: number;
  lastPlay: { player: number; play: TienLenPlay } | null;
  passes: number;
  finishOrder: number[];
  finished: boolean;
  whiteWinner: { player: number; reason: string } | null;
  message: string;
}

function createGame(round: number): TienLenState {
  const deck = createStandardDeck();
  const hands = Array.from({ length: 4 }, (_, index) =>
    sortTienLenCards(deck.slice(index * 13, index * 13 + 13)),
  );
  const whiteIndex = hands.findIndex((hand) => getWhiteWinReason(hand, round === 1));
  const whiteReason = whiteIndex >= 0 ? getWhiteWinReason(hands[whiteIndex], round === 1) : null;
  const firstPlayer = findFirstPlayer(hands);

  return {
    hands,
    round,
    currentPlayer: firstPlayer >= 0 ? firstPlayer : 0,
    lastPlay: null,
    passes: 0,
    finishOrder: whiteIndex >= 0 ? [whiteIndex] : [],
    finished: whiteIndex >= 0,
    whiteWinner: whiteIndex >= 0 && whiteReason ? { player: whiteIndex, reason: whiteReason } : null,
    message:
      whiteIndex >= 0 && whiteReason
        ? `${PLAYER_NAMES[whiteIndex]} tới trắng với ${whiteReason}.`
        : `Ván ${round}. ${firstPlayer === 0 ? "Bạn đang giữ 3 bích, bạn đi trước." : `${PLAYER_NAMES[firstPlayer]} đang giữ 3 bích và đi trước.`}`,
  };
}

function nextActivePlayer(state: TienLenState, from: number): number {
  for (let step = 1; step <= 4; step += 1) {
    const player = (from + step) % 4;
    if (state.hands[player].length > 0 && !state.finishOrder.includes(player)) return player;
  }
  return from;
}

function removeCards(hand: StandardCard[], cards: StandardCard[]): StandardCard[] {
  const ids = new Set(cards.map((card) => card.id));
  return hand.filter((card) => !ids.has(card.id));
}

function applyPlay(state: TienLenState, player: number, play: TienLenPlay): TienLenState {
  const hands = state.hands.map((hand, index) => (index === player ? removeCards(hand, play.cards) : hand));
  const finishOrder = hands[player].length === 0 && !state.finishOrder.includes(player)
    ? [...state.finishOrder, player]
    : state.finishOrder;
  const finished = finishOrder.length >= 3;
  const nextState = { ...state, hands, finishOrder, finished, lastPlay: { player, play }, passes: 0 };
  return {
    ...nextState,
    currentPlayer: finished ? player : nextActivePlayer(nextState, player),
    message: hands[player].length === 0 ? `${PLAYER_NAMES[player]} đã tới.` : `${PLAYER_NAMES[nextActivePlayer(nextState, player)]} đang suy nghĩ...`,
  };
}

function applyPass(state: TienLenState, player: number): TienLenState {
  const activeCount = state.hands.filter((hand, index) => hand.length > 0 && !state.finishOrder.includes(index)).length;
  const passes = state.passes + 1;
  if (state.lastPlay && passes >= Math.max(1, activeCount - 1)) {
    const starter = state.lastPlay.player;
    const nextState = { ...state, lastPlay: null, passes: 0 };
    const nextPlayer = nextActivePlayer(nextState, starter);
    return { ...nextState, currentPlayer: nextPlayer, message: `${PLAYER_NAMES[nextPlayer]} được quyền mở lượt mới.` };
  }
  const nextPlayer = nextActivePlayer(state, player);
  return { ...state, passes, currentPlayer: nextPlayer, message: `${PLAYER_NAMES[player]} bỏ lượt.` };
}

function formatRemaining(count: number): string {
  return `${count} lá`;
}

export default function TienLenPage() {
  const [game, setGame] = useState<TienLenState>(() => createGame(1));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hint, setHint] = useState<string | null>(null);

  const humanHand = game.hands[0];
  const selectedCards = humanHand.filter((card) => selectedIds.includes(card.id));
  const selectedPlay = useMemo(
    () => isLegalPlay(selectedCards, game.lastPlay?.play ?? null),
    [selectedCards, game.lastPlay],
  );
  const availableBotPlay = useMemo(() => {
    if (game.finished || game.currentPlayer === 0) return null;
    const candidates = enumeratePlays(game.hands[game.currentPlayer]).filter((play) => !game.lastPlay || canBeat(play, game.lastPlay.play));
    return candidates.sort((a, b) => a.cards.length - b.cards.length || a.strength - b.strength)[0] ?? null;
  }, [game]);

  const newRound = useCallback(() => {
    setSelectedIds([]);
    setHint(null);
    setGame((current) => createGame(current.round + 1));
  }, []);

  useEffect(() => {
    if (game.finished || game.currentPlayer === 0) return;
    const timer = window.setTimeout(() => {
      setGame((current) => {
        if (current.finished || current.currentPlayer === 0) return current;
        if (!availableBotPlay) return applyPass(current, current.currentPlayer);
        return applyPlay(current, current.currentPlayer, availableBotPlay);
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [game, availableBotPlay]);

  const toggleCard = (id: string) => {
    if (game.finished || game.currentPlayer !== 0) return;
    setHint(null);
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const playSelected = () => {
    if (!selectedPlay || game.finished || game.currentPlayer !== 0) return;
    setGame((current) => applyPlay(current, 0, selectedPlay));
    setSelectedIds([]);
    setHint(null);
  };

  const passTurn = () => {
    if (game.finished || game.currentPlayer !== 0 || !game.lastPlay) return;
    setGame((current) => applyPass(current, 0));
    setSelectedIds([]);
    setHint(null);
  };

  const useHint = () => {
    const candidates = enumeratePlays(humanHand).filter((play) => !game.lastPlay || canBeat(play, game.lastPlay.play));
    const suggestion = candidates.sort((a, b) => a.cards.length - b.cards.length || a.strength - b.strength)[0];
    if (!suggestion) {
      setHint("Không có bộ nào đủ lớn. Bạn nên bỏ lượt.");
      return;
    }
    setSelectedIds(suggestion.cards.map((card) => card.id));
    setHint(`Gợi ý: ${getPlayLabel(suggestion)}.`);
  };

  return (
    <div className="tl-page min-h-[100dvh] pb-16">
      <section className="tl-hero relative overflow-hidden border-b border-white/10">
        <Image src="/images/tienlen/tienlen-hero.png" alt="Bàn bài Tiến Lên Miền Nam trên nền nỉ xanh đêm" fill priority sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#071117_0%,rgba(7,17,23,.94)_30%,rgba(7,17,23,.36)_75%,rgba(7,17,23,.16)_100%)]" />
        <div className="relative mx-auto flex min-h-[300px] max-w-[1440px] items-end px-5 pb-8 pt-20 sm:px-8 lg:min-h-[340px] lg:px-14">
          <div>
            <Link href="/cards" className="mb-5 inline-flex items-center gap-2 text-sm text-[#d6ae55] transition hover:text-white">
              <ArrowLeft size={16} aria-hidden />
              Bàn bài Kỳ Đài
            </Link>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e18c76]">Bàn miền Nam</p>
            <h1 className="mt-2 max-w-xl font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-[-0.055em] text-[#fff5e8] sm:text-6xl">Tiến Lên Miền Nam</h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-[#c3cdcd]">Đánh hết bài trước. Giữ nhịp, chặt đúng lúc, đừng để thối heo.</p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1440px] px-4 pt-6 sm:px-8 lg:px-14 lg:pt-9">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm text-[#a8b6b8]">
            <span className="grid h-9 w-9 place-items-center rounded-[10px] border border-[#d6ae55]/35 bg-[#d6ae55]/10 text-[#d6ae55]"><CardsThree size={19} weight="duotone" aria-hidden /></span>
            <span>Ván {game.round}</span>
            <span className="text-[#687b80]">/</span>
            <span>4 người, 52 lá</span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              href="/cards/tienlen/rooms"
              className="inline-flex min-h-9 items-center rounded-[8px] border border-[#d6ae55]/45 px-3 text-sm font-semibold text-[#e7c774] transition hover:bg-[#d6ae55]/10"
            >
              Tạo phòng online
            </Link>
            <Button size="sm" variant="ghost" onClick={newRound}><ArrowClockwise size={17} aria-hidden /> Ván mới</Button>
          </div>
        </div>

        <section className="tl-table relative overflow-hidden rounded-[18px] border border-[#d6ae55]/35 p-4 shadow-[0_30px_90px_rgba(0,0,0,.35)] sm:p-7 lg:p-9">
          <div className="pointer-events-none absolute inset-3 rounded-[14px] border border-white/[.06]" />
          <div className="relative grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)_220px] lg:grid-rows-[auto_minmax(300px,1fr)_auto]">
            <PlayerSeat player={1} count={game.hands[1].length} active={game.currentPlayer === 1} finished={game.finishOrder.includes(1)} />
            <div className="order-first col-span-full flex items-center justify-between rounded-[12px] border border-white/[.09] bg-[#061a1a]/60 px-4 py-3 lg:order-none">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d6ae55]">Trạng thái bàn</p>
                <p className="mt-1 text-sm text-[#d8e1df]">{game.message}</p>
              </div>
              <span className={`tl-turn-badge ${game.currentPlayer === 0 && !game.finished ? "tl-turn-you" : ""}`}>
                {game.finished ? "Kết thúc" : game.currentPlayer === 0 ? "Lượt của bạn" : `Lượt ${PLAYER_NAMES[game.currentPlayer]}`}
              </span>
            </div>

            <PlayerSeat player={2} count={game.hands[2].length} active={game.currentPlayer === 2} finished={game.finishOrder.includes(2)} />
            <div className="tl-center-zone flex min-h-[300px] flex-col items-center justify-center rounded-[16px] border border-white/[.08] bg-[#06201e]/45 px-4 py-7">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9eb6ae]">Bộ đang trên bàn</p>
              {game.lastPlay ? (
                <>
                  <div className="mt-5 flex justify-center -space-x-5 sm:-space-x-4">
                    {game.lastPlay.play.cards.map((card) => <TienLenCard key={card.id} card={card} small />)}
                  </div>
                  <p className="mt-5 text-center text-sm font-semibold text-[#f4f0e8]">{PLAYER_NAMES[game.lastPlay.player]} đã đánh {getPlayLabel(game.lastPlay.play)}</p>
                </>
              ) : (
                <div className="mt-6 text-center">
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-dashed border-[#d6ae55]/50 text-[#d6ae55]"><CardsThree size={30} weight="duotone" aria-hidden /></span>
                  <p className="mt-4 text-sm text-[#a8b6b8]">Chưa có bộ bài nào.<br />Người được quyền sẽ mở lượt.</p>
                </div>
              )}
              {game.whiteWinner && <div className="mt-5 inline-flex items-center gap-2 rounded-[8px] border border-[#e18c76]/55 bg-[#e18c76]/10 px-3 py-2 text-sm font-bold text-[#ffd0c1]"><CheckCircle size={17} aria-hidden /> Tới trắng</div>}
            </div>

            <PlayerSeat player={3} count={game.hands[3].length} active={game.currentPlayer === 3} finished={game.finishOrder.includes(3)} />
            <div className="lg:col-span-2 lg:col-start-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d6ae55]">Bài của bạn</p>
                  <p className="mt-1 text-sm text-[#a8b6b8]">{formatRemaining(humanHand.length)} còn lại {selectedCards.length ? `, đã chọn ${selectedCards.length} lá` : ""}</p>
                </div>
                <span className="text-xs text-[#9eb6ae]">{game.currentPlayer === 0 && !game.finished ? "Chọn bài để đánh" : "Chờ đến lượt"}</span>
              </div>
              <div className="tl-hand mt-4 flex min-h-[144px] items-end justify-center overflow-x-auto px-2 pb-2 pt-5 sm:min-h-[168px]">
                {humanHand.map((card) => <TienLenCard key={card.id} card={card} selected={selectedIds.includes(card.id)} onClick={() => toggleCard(card.id)} />)}
              </div>
              <div className="mt-3 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                <Button variant="primary" onClick={playSelected} disabled={!selectedPlay || game.currentPlayer !== 0 || game.finished}>Đánh bài</Button>
                <Button variant="ghost" onClick={passTurn} disabled={!game.lastPlay || game.currentPlayer !== 0 || game.finished}>Bỏ lượt</Button>
                <button type="button" onClick={useHint} disabled={game.currentPlayer !== 0 || game.finished} className="tl-hint-button"><Lightbulb size={17} aria-hidden /> Gợi ý</button>
              </div>
              {hint && <p className="mt-3 text-center text-sm font-medium text-[#e7c774]">{hint}</p>}
              {selectedIds.length > 0 && !selectedPlay && <p className="mt-3 flex items-center justify-center gap-2 text-center text-sm text-[#efaa99]"><WarningCircle size={17} aria-hidden /> Bộ đã chọn chưa hợp lệ hoặc chưa đủ lớn.</p>}
            </div>
          </div>
        </section>

        {game.finished && <ResultPanel game={game} onNewRound={newRound} />}

        <section id="luat-tien-len" className="mt-10 grid gap-4 border-t border-white/10 pt-8 md:grid-cols-[1.1fr_.9fr]">
          <div>
            <div className="flex items-center gap-3"><BookOpenText size={22} className="text-[#d6ae55]" aria-hidden /><h2 className="text-2xl font-extrabold tracking-[-0.035em]">Luật bàn đang áp dụng</h2></div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#a8b6b8]">Bản chơi này dùng bộ luật Tiến Lên Miền Nam phổ biến. Các luật bom khác nhau giữa từng bàn được chốt rõ ở đây để không tranh cãi.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <RuleCard title="Thứ tự" text="3 < 4 < ... < A < 2. Chất: bích < chuồn < rô < cơ." />
            <RuleCard title="Bộ hợp lệ" text="Rác, đôi, sám cô, sảnh từ 3 lá, tứ quý và từ 3 đôi thông." />
            <RuleCard title="Chặt heo" text="3 đôi thông chặt 2 đơn. Tứ quý chặt 2 đơn hoặc 3 đôi thông. 4 đôi thông chặt cả đôi 2 và tứ quý." />
            <RuleCard title="Tới trắng" text="Tứ quý 3 hoặc 3 đôi thông có 3 bích ở ván đầu. Các ván sau thêm tứ quý 2, 5 hoặc 6 đôi thông, sảnh rồng, 12 lá đồng màu." />
          </div>
        </section>

        <p className="mt-8 text-xs leading-5 text-[#718488]">Ván chơi dùng tiền ảo nội bộ, không có cược tiền thật. Bộ luật tham khảo từ các hướng dẫn Tiến Lên Miền Nam phổ biến và đã được chuẩn hóa thành luật bàn hiển thị ở trên.</p>
      </main>
    </div>
  );
}

function PlayerSeat({ player, count, active, finished }: { player: number; count: number; active: boolean; finished: boolean }) {
  return (
    <div className={`tl-seat ${active ? "tl-seat-active" : ""} ${finished ? "tl-seat-finished" : ""} ${PLAYER_TONES[player]}`}>
      <div className="flex items-center gap-3">
        <span className="tl-avatar">{player === 0 ? "B" : PLAYER_NAMES[player].slice(0, 1)}</span>
        <div className="min-w-0"><p className="truncate font-bold text-[#f4f0e8]">{PLAYER_NAMES[player]}</p><p className="mt-0.5 text-xs text-[#98aaa9]">{finished ? "Đã tới" : `${count} lá trên tay`}</p></div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-[#9eb6ae]"><Robot size={15} aria-hidden /> {active ? "Đang đi" : finished ? "Xong lượt" : "Đối thủ máy"}</div>
    </div>
  );
}

function ResultPanel({ game, onNewRound }: { game: TienLenState; onNewRound: () => void }) {
  const winner = game.whiteWinner ? game.whiteWinner.player : game.finishOrder[0];
  return <section className="tl-result mt-5 flex flex-col items-start justify-between gap-4 rounded-[14px] border border-[#d6ae55]/45 bg-[#d6ae55]/10 p-5 sm:flex-row sm:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e7c774]">Ván đã khép lại</p><h2 className="mt-1 text-2xl font-extrabold">{PLAYER_NAMES[winner]} thắng{game.whiteWinner ? " tới trắng" : ""}</h2><p className="mt-1 text-sm text-[#bdc8c5]">{game.whiteWinner ? game.whiteWinner.reason : `Thứ tự về: ${game.finishOrder.map((player) => PLAYER_NAMES[player]).join(" → ")}`}</p></div><Button variant="primary" onClick={onNewRound}><ArrowClockwise size={17} aria-hidden /> Ván tiếp theo</Button></section>;
}

function RuleCard({ title, text }: { title: string; text: string }) {
  return <article className="rounded-[10px] border border-white/10 bg-white/[.035] p-4"><h3 className="font-bold text-[#f4f0e8]">{title}</h3><p className="mt-1 text-xs leading-5 text-[#a8b6b8]">{text}</p></article>;
}
