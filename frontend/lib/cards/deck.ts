export type CardSuit = "hearts" | "diamonds" | "clubs" | "spades";
export type CardRank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

export interface StandardCard {
  id: string;
  suit: CardSuit;
  rank: CardRank;
}

export const CARD_SUITS: CardSuit[] = ["hearts", "diamonds", "clubs", "spades"];
export const CARD_RANKS: CardRank[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

export function shuffleCards<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function createStandardDeck(): StandardCard[] {
  return shuffleCards(
    CARD_SUITS.flatMap((suit) =>
      CARD_RANKS.map((rank) => ({
        id: `${suit}-${rank}`,
        suit,
        rank,
      })),
    ),
  );
}

export function blackjackScore(cards: StandardCard[]): number {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.rank === "A") {
      total += 11;
      aces += 1;
    } else if (["J", "Q", "K"].includes(card.rank)) {
      total += 10;
    } else {
      total += Number(card.rank);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

export function baicaoScore(cards: StandardCard[]): number {
  if (cards.every((card) => ["J", "Q", "K"].includes(card.rank))) return 10;
  const total = cards.reduce((sum, card) => {
    if (card.rank === "A") return sum + 1;
    if (["J", "Q", "K"].includes(card.rank)) return sum;
    return sum + Number(card.rank);
  }, 0);
  return total % 10;
}

export type XiDachKind =
  | "xi-ban"
  | "xi-dach"
  | "ngu-linh"
  | "normal"
  | "quac";

export interface XiDachHand {
  kind: XiDachKind;
  score: number;
  label: string;
}

export function evaluateXiDach(cards: StandardCard[]): XiDachHand {
  const score = blackjackScore(cards);
  if (cards.length === 2 && cards.every((card) => card.rank === "A")) {
    return { kind: "xi-ban", score, label: "Xì Bàn" };
  }
  if (
    cards.length === 2 &&
    cards.some((card) => card.rank === "A") &&
    cards.some((card) => ["10", "J", "Q", "K"].includes(card.rank))
  ) {
    return { kind: "xi-dach", score: 21, label: "Xì Dách" };
  }
  if (cards.length === 5 && score <= 21) {
    return { kind: "ngu-linh", score, label: "Ngũ Linh" };
  }
  if (score > 21) {
    return { kind: "quac", score, label: "Choét" };
  }
  return { kind: "normal", score, label: `${score} điểm` };
}
