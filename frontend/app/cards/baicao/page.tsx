"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowClockwise } from "@phosphor-icons/react/ArrowClockwise";
import { Eye } from "@phosphor-icons/react/Eye";
import PlayingCard from "@/components/cards/PlayingCard";
import Button from "@/components/ui/Button";
import {
  baicaoScore,
  createStandardDeck,
  type StandardCard,
} from "@/lib/cards/deck";

const NAMES = ["Bạn", "Mai", "Bảo", "An"];

interface Round {
  hands: StandardCard[][];
  revealed: boolean;
}

function createRound(): Round {
  const deck = createStandardDeck();
  return {
    hands: Array.from({ length: 4 }, (_, player) =>
      Array.from({ length: 3 }, (_, card) => deck[player * 3 + card]),
    ),
    revealed: false,
  };
}

export default function BaicaoPage() {
  const [round, setRound] = useState<Round | null>(null);
  const newRound = useCallback(() => setRound(createRound()), []);
  useEffect(() => newRound(), [newRound]);

  if (!round) return <div className="min-h-[calc(100dvh-64px)]" />;
  const scores = round.hands.map(baicaoScore);
  const maxScore = Math.max(...scores);
  const winners = scores
    .map((score, index) => (score === maxScore ? NAMES[index] : null))
    .filter(Boolean);

  return (
    <div className="app-shell py-6 sm:py-10">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-[-0.04em]">Bài Cào</h1>
          <p className="mt-2 text-sm text-muted">Ba lá mỗi người, so nút trong một nhịp.</p>
        </div>
        <Button size="sm" onClick={newRound}>
          <ArrowClockwise size={16} aria-hidden />
          Chia lại
        </Button>
      </div>

      <section className="card-table rounded-[18px] border border-line p-4 sm:p-7">
        <div className="grid gap-4 md:grid-cols-2">
          {round.hands.map((hand, player) => {
            const show = round.revealed || player === 0;
            const won = round.revealed && scores[player] === maxScore;
            return (
              <article
                key={NAMES[player]}
                className={`rounded-[14px] border p-4 transition ${
                  won
                    ? "border-brass/65 bg-brass/10"
                    : "border-white/10 bg-black/15"
                }`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-bold">{NAMES[player]}</h2>
                  <span
                    className={`font-[family-name:var(--font-mono)] text-sm ${
                      show ? "text-brass" : "text-muted"
                    }`}
                  >
                    {show ? `${scores[player]} nút` : "Chưa mở"}
                  </span>
                </div>
                <div className="flex justify-center -space-x-5">
                  {hand.map((card) => (
                    <PlayingCard key={card.id} card={card} hidden={!show} compact />
                  ))}
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col items-center">
          {round.revealed ? (
            <>
              <p className="text-center font-bold text-brass">
                {winners.length === 1 ? `${winners[0]} thắng ván` : `Hòa giữa ${winners.join(", ")}`}
              </p>
              <Button variant="primary" className="mt-4" onClick={newRound}>
                Chơi ván mới
              </Button>
            </>
          ) : (
            <>
              <p className="text-center text-sm text-muted">
                Bài của bạn có {scores[0]} nút. Mở bài để so với ba đối thủ.
              </p>
              <Button
                variant="primary"
                className="mt-4"
                onClick={() => setRound((current) => current && { ...current, revealed: true })}
              >
                <Eye size={18} aria-hidden />
                Mở bài
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
