"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowClockwise } from "@phosphor-icons/react/ArrowClockwise";
import { HandPalm } from "@phosphor-icons/react/HandPalm";
import { Plus } from "@phosphor-icons/react/Plus";
import PlayingCard from "@/components/cards/PlayingCard";
import {
  createStandardDeck,
  evaluateXiDach,
  type StandardCard,
  type XiDachHand,
} from "@/lib/cards/deck";

type Status =
  | "dealing"
  | "playing"
  | "resolving"
  | "won"
  | "lost";

interface Round {
  id: number;
  deck: StandardCard[];
  player: StandardCard[];
  dealer: StandardCard[];
  status: Status;
  message: string;
}

function createRound(): Round {
  const deck = createStandardDeck();
  return {
    id: Date.now(),
    deck: deck.slice(4),
    player: [deck[1], deck[3]],
    dealer: [deck[0], deck[2]],
    status: "dealing",
    message: "Đang chia bài...",
  };
}

function handRank(hand: XiDachHand): number {
  return {
    "xi-ban": 5,
    "xi-dach": 4,
    "ngu-linh": 3,
    normal: 2,
    quac: 0,
  }[hand.kind];
}

function settleRound(current: Round): Round {
  const deck = [...current.deck];
  const dealer = [...current.dealer];
  const playerHand = evaluateXiDach(current.player);
  let dealerHand = evaluateXiDach(dealer);

  if (
    !["quac", "xi-ban", "xi-dach"].includes(playerHand.kind) &&
    !["xi-ban", "xi-dach"].includes(dealerHand.kind)
  ) {
    while (
      dealer.length < 5 &&
      dealerHand.kind === "normal" &&
      dealerHand.score < 16 &&
      deck.length > 0
    ) {
      dealer.push(deck.shift() as StandardCard);
      dealerHand = evaluateXiDach(dealer);
    }
  }

  if (playerHand.kind === "quac") {
    return {
      ...current,
      deck,
      dealer,
      status: "lost",
      message: `Bạn choét ${playerHand.score} điểm. Nhà cái thắng.`,
    };
  }
  if (dealerHand.kind === "quac") {
    return {
      ...current,
      deck,
      dealer,
      status: "won",
      message: `Nhà cái choét ${dealerHand.score} điểm. Bạn thắng!`,
    };
  }

  const playerRank = handRank(playerHand);
  const dealerRank = handRank(dealerHand);
  const playerWins =
    playerRank > dealerRank ||
    (playerRank === dealerRank &&
      playerHand.kind === "ngu-linh" &&
      playerHand.score < dealerHand.score) ||
    (playerRank === dealerRank &&
      playerHand.kind === "normal" &&
      playerHand.score > dealerHand.score);

  if (playerWins) {
    return {
      ...current,
      deck,
      dealer,
      status: "won",
      message: `${playerHand.label} thắng ${dealerHand.label}.`,
    };
  }
  return {
    ...current,
    deck,
    dealer,
    status: "lost",
    message:
      playerRank === dealerRank && playerHand.score === dealerHand.score
        ? `Đồng điểm ${playerHand.score}. Nhà cái thắng theo luật bàn.`
        : `${dealerHand.label} thắng ${playerHand.label}.`,
  };
}

function AnimatedCard({
  card,
  hidden,
  delay,
  reduceMotion,
}: {
  card: StandardCard;
  hidden?: boolean;
  delay: number;
  reduceMotion: boolean;
}) {
  return (
    <motion.div
      initial={
        reduceMotion
          ? false
          : { x: 280, y: -80, rotate: 18, scale: 0.72, opacity: 0 }
      }
      animate={{ x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 190,
        damping: 22,
        delay: reduceMotion ? 0 : delay,
      }}
      layout
      className="origin-center"
    >
      <motion.div
        animate={{ rotateY: hidden ? 180 : 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.42 }}
        className="[transform-style:preserve-3d]"
      >
        <PlayingCard card={card} hidden={hidden} table />
      </motion.div>
    </motion.div>
  );
}

export default function XiDachPage() {
  const reduceMotion = useReducedMotion() ?? false;
  const [round, setRound] = useState<Round | null>(null);

  const newRound = useCallback(() => setRound(createRound()), []);
  useEffect(() => newRound(), [newRound]);

  useEffect(() => {
    if (!round || round.status !== "dealing") return;
    const timer = setTimeout(() => {
      setRound((current) => {
        if (!current || current.id !== round.id || current.status !== "dealing") {
          return current;
        }
        const playerHand = evaluateXiDach(current.player);
        if (playerHand.kind === "xi-ban" || playerHand.kind === "xi-dach") {
          return settleRound({ ...current, status: "resolving" });
        }
        return {
          ...current,
          status: "playing",
          message: "Rút thêm hoặc dằn ở số điểm hiện tại.",
        };
      });
    }, reduceMotion ? 0 : 1050);
    return () => clearTimeout(timer);
  }, [round, reduceMotion]);

  const hit = () => {
    setRound((current) => {
      if (!current || current.status !== "playing" || current.player.length >= 5) {
        return current;
      }
      const [card, ...deck] = current.deck;
      const player = [...current.player, card];
      const hand = evaluateXiDach(player);
      if (hand.kind === "quac") {
        return settleRound({
          ...current,
          deck,
          player,
          status: "resolving",
        });
      }
      if (hand.kind === "ngu-linh" || hand.score === 21) {
        return settleRound({
          ...current,
          deck,
          player,
          status: "resolving",
        });
      }
      return {
        ...current,
        deck,
        player,
        message: `Bạn đang có ${hand.score} điểm.`,
      };
    });
  };

  const stand = () => {
    setRound((current) =>
      current?.status === "playing"
        ? settleRound({ ...current, status: "resolving" })
        : current,
    );
  };

  const playerHand = useMemo(
    () => (round ? evaluateXiDach(round.player) : null),
    [round],
  );
  const dealerHand = useMemo(
    () => (round ? evaluateXiDach(round.dealer) : null),
    [round],
  );

  if (!round || !playerHand || !dealerHand) {
    return <div className="min-h-[calc(100dvh-64px)]" />;
  }

  const revealDealer = !["dealing", "playing"].includes(round.status);
  const finished = round.status === "won" || round.status === "lost";

  return (
    <main className="xi-dach-page min-h-[calc(100dvh-64px)] overflow-hidden py-4 sm:py-7">
      <div className="mx-auto w-full max-w-[1380px] px-2 sm:px-6 lg:px-10">
        <div className="xi-dach-table-wrap">
          <section className="xi-dach-table" aria-label="Bàn Xì Dách">
            <div className="xi-dach-felt">
              <div className="xi-dach-deal-path xi-dach-deal-path-dealer" aria-hidden />
              <div className="xi-dach-deal-path xi-dach-deal-path-player" aria-hidden />

              <div className="xi-dach-deck-tray hidden sm:block" aria-hidden>
                <span>Bộ bài</span>
                <div className="xi-dach-deck">
                  <div className="absolute -left-1.5 top-1 rotate-[-3deg]">
                    <PlayingCard hidden compact />
                  </div>
                  <div className="relative rotate-[3deg]">
                    <PlayingCard hidden compact />
                  </div>
                </div>
              </div>

              <div className="xi-dach-seat xi-dach-seat-dealer">
                <div className="xi-dach-seat-label">
                  <span>Nhà cái</span>
                  <span className="xi-dach-score">
                    {revealDealer
                      ? dealerHand.label
                      : `${evaluateXiDach(round.dealer.slice(0, 1)).score} + ?`}
                  </span>
                </div>
                <div className="xi-dach-card-zone">
                  <div className="xi-dach-hand [perspective:900px]">
                    {round.dealer.map((card, index) => (
                      <AnimatedCard
                        key={`${round.id}-${card.id}`}
                        card={card}
                        hidden={!revealDealer && index === 1}
                        delay={
                          round.status === "dealing"
                            ? index * 0.24
                            : revealDealer && index >= 2
                              ? (index - 1) * 0.18
                              : 0
                        }
                        reduceMotion={reduceMotion}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="xi-dach-status">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={round.message}
                    initial={reduceMotion ? false : { opacity: 0, y: 7 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className={`xi-dach-status-plaque ${
                      round.status === "won"
                        ? "xi-dach-status-won"
                        : round.status === "lost"
                          ? "xi-dach-status-lost"
                          : ""
                    }`}
                  >
                    {round.message}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="xi-dach-seat xi-dach-seat-player">
                <div className="xi-dach-seat-label">
                  <span>Bài của bạn</span>
                  <motion.span
                    key={playerHand.label}
                    initial={reduceMotion ? false : { scale: 0.85 }}
                    animate={{ scale: 1 }}
                    className="xi-dach-score"
                  >
                    {playerHand.label}
                  </motion.span>
                </div>
                <div className="xi-dach-card-zone">
                  <div className="xi-dach-hand [perspective:900px]">
                    {round.player.map((card, index) => (
                      <AnimatedCard
                        key={`${round.id}-${card.id}`}
                        card={card}
                        delay={round.status === "dealing" ? 0.12 + index * 0.24 : 0}
                        reduceMotion={reduceMotion}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="xi-dach-cupholder xi-dach-cupholder-left" aria-hidden />
          <div className="xi-dach-cupholder xi-dach-cupholder-right" aria-hidden />

          <div className="xi-dach-actions">
            <button
              type="button"
              onClick={hit}
              disabled={round.status !== "playing" || round.player.length >= 5}
              className="xi-dach-action xi-dach-action-hit"
            >
              <Plus size={18} aria-hidden />
              <span>Rút bài</span>
            </button>
            <button
              type="button"
              onClick={stand}
              disabled={round.status !== "playing"}
              className="xi-dach-action xi-dach-action-stand"
            >
              <HandPalm size={18} aria-hidden />
              <span>Dằn</span>
            </button>
            <button
              type="button"
              onClick={newRound}
              className="xi-dach-action xi-dach-action-new"
            >
              <ArrowClockwise size={18} aria-hidden />
              <span>{finished ? "Chơi tiếp" : "Ván mới"}</span>
            </button>
          </div>
        </div>

        <p
          id="luat-xi-dach"
          className="mx-auto mt-5 max-w-2xl scroll-mt-24 text-center text-xs leading-5 text-[#9ca5a2]"
        >
          Nhà cái rút khi dưới 16. Xì Bàn thắng Xì Dách, Xì Dách thắng Ngũ Linh, đồng điểm nhà cái thắng.
        </p>
      </div>
    </main>
  );
}
