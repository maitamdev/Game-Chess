import type { CardRank, CardSuit, StandardCard } from "@/lib/cards/deck";

export type TienLenKind =
  | "single"
  | "pair"
  | "triple"
  | "straight"
  | "four"
  | "consecutive-pairs";

export interface TienLenPlay {
  cards: StandardCard[];
  kind: TienLenKind;
  strength: number;
}

export const TIEN_LEN_RANKS: CardRank[] = [
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
  "A",
  "2",
];

const SUIT_VALUE: Record<CardSuit, number> = {
  spades: 0,
  clubs: 1,
  diamonds: 2,
  hearts: 3,
};

export const RANK_VALUE: Record<CardRank, number> = Object.fromEntries(
  TIEN_LEN_RANKS.map((rank, index) => [rank, index]),
) as Record<CardRank, number>;

export function compareCards(a: StandardCard, b: StandardCard): number {
  return RANK_VALUE[a.rank] - RANK_VALUE[b.rank] || SUIT_VALUE[a.suit] - SUIT_VALUE[b.suit];
}

export function sortTienLenCards(cards: StandardCard[]): StandardCard[] {
  return [...cards].sort(compareCards);
}

function sameRank(cards: StandardCard[]): boolean {
  return cards.length > 0 && cards.every((card) => card.rank === cards[0].rank);
}

function isConsecutive(values: number[]): boolean {
  return values.every((value, index) => index === 0 || value === values[index - 1] + 1);
}

function isStraight(cards: StandardCard[]): boolean {
  if (cards.length < 3 || cards.some((card) => card.rank === "2")) return false;
  const values = sortTienLenCards(cards).map((card) => RANK_VALUE[card.rank]);
  return new Set(values).size === values.length && isConsecutive(values);
}

function isConsecutivePairs(cards: StandardCard[]): boolean {
  if (cards.length < 6 || cards.length % 2 !== 0) return false;
  const ordered = sortTienLenCards(cards);
  const ranks: number[] = [];
  for (let index = 0; index < ordered.length; index += 2) {
    if (ordered[index].rank === "2" || ordered[index + 1].rank !== ordered[index].rank) return false;
    ranks.push(RANK_VALUE[ordered[index].rank]);
  }
  return new Set(ranks).size === ranks.length && isConsecutive(ranks);
}

export function evaluateTienLenPlay(cards: StandardCard[]): TienLenPlay | null {
  const ordered = sortTienLenCards(cards);
  if (ordered.length === 1) {
    return { cards: ordered, kind: "single", strength: compareCards(ordered[0], ordered[0]) + RANK_VALUE[ordered[0].rank] * 4 + SUIT_VALUE[ordered[0].suit] };
  }
  if (ordered.length === 2 && sameRank(ordered)) {
    return { cards: ordered, kind: "pair", strength: RANK_VALUE[ordered[0].rank] };
  }
  if (ordered.length === 3 && sameRank(ordered)) {
    return { cards: ordered, kind: "triple", strength: RANK_VALUE[ordered[0].rank] };
  }
  if (ordered.length === 4 && sameRank(ordered)) {
    return { cards: ordered, kind: "four", strength: RANK_VALUE[ordered[0].rank] };
  }
  if (isStraight(ordered)) {
    return { cards: ordered, kind: "straight", strength: RANK_VALUE[ordered[ordered.length - 1].rank] };
  }
  if (isConsecutivePairs(ordered)) {
    return { cards: ordered, kind: "consecutive-pairs", strength: RANK_VALUE[ordered[ordered.length - 1].rank] };
  }
  return null;
}

export function isBomb(play: TienLenPlay): boolean {
  return play.kind === "four" || play.kind === "consecutive-pairs";
}

export function canBeat(candidate: TienLenPlay, target: TienLenPlay): boolean {
  if (candidate.kind === target.kind && candidate.cards.length === target.cards.length) {
    return candidate.strength > target.strength;
  }

  if (target.kind === "single" && target.cards[0].rank === "2") {
    return (
      (candidate.kind === "consecutive-pairs" && candidate.cards.length === 6) ||
      candidate.kind === "four" ||
      (candidate.kind === "consecutive-pairs" && candidate.cards.length >= 8)
    );
  }

  if (target.kind === "consecutive-pairs" && target.cards.length === 6) {
    return (
      (candidate.kind === "consecutive-pairs" && candidate.cards.length >= 8) ||
      candidate.kind === "four"
    );
  }

  if (target.kind === "four") {
    return candidate.kind === "consecutive-pairs" && candidate.cards.length >= 8;
  }

  if (target.kind === "pair" && target.cards.every((card) => card.rank === "2")) {
    return candidate.kind === "consecutive-pairs" && candidate.cards.length >= 8;
  }

  return false;
}

export function isLegalPlay(cards: StandardCard[], target: TienLenPlay | null): TienLenPlay | null {
  const play = evaluateTienLenPlay(cards);
  if (!play) return null;
  return !target || canBeat(play, target) ? play : null;
}

export function enumeratePlays(hand: StandardCard[]): TienLenPlay[] {
  const sorted = sortTienLenCards(hand);
  const plays: TienLenPlay[] = [];
  const add = (cards: StandardCard[]) => {
    const play = evaluateTienLenPlay(cards);
    if (play) plays.push(play);
  };

  sorted.forEach((card) => add([card]));
  const byRank = new Map<CardRank, StandardCard[]>();
  sorted.forEach((card) => byRank.set(card.rank, [...(byRank.get(card.rank) ?? []), card]));
  byRank.forEach((cards) => {
    if (cards.length >= 2) add(cards.slice(0, 2));
    if (cards.length >= 3) add(cards.slice(0, 3));
    if (cards.length === 4) add(cards);
  });

  const uniqueRanks: Set<CardRank> = new Set([...byRank.keys()].filter((rank) => rank !== "2"));
  for (let start = 0; start < TIEN_LEN_RANKS.length - 1; start += 1) {
    for (let length = 3; start + length <= 12; length += 1) {
      const ranks = TIEN_LEN_RANKS.slice(start, start + length);
      if (!ranks.every((rank) => uniqueRanks.has(rank))) break;
      add(ranks.flatMap((rank) => [byRank.get(rank)![0]]));
    }
  }

  for (let start = 0; start < TIEN_LEN_RANKS.length - 2; start += 1) {
    for (let length = 3; start + length <= 12; length += 1) {
      const ranks = TIEN_LEN_RANKS.slice(start, start + length);
      if (!ranks.every((rank) => (byRank.get(rank)?.length ?? 0) >= 2)) break;
      add(ranks.flatMap((rank) => byRank.get(rank)!.slice(0, 2)));
    }
  }

  return plays;
}

export function findFirstPlayer(hands: StandardCard[][]): number {
  return hands.findIndex((hand) => hand.some((card) => card.rank === "3" && card.suit === "spades"));
}

function hasRanks(hand: StandardCard[], ranks: CardRank[]): boolean {
  return ranks.every((rank) => hand.some((card) => card.rank === rank));
}

function hasPairs(hand: StandardCard[], count: number, consecutive: boolean): boolean {
  const pairs = TIEN_LEN_RANKS.filter((rank) => hand.filter((card) => card.rank === rank).length >= 2);
  if (!consecutive) return pairs.length >= count;
  for (let index = 0; index <= pairs.length - count; index += 1) {
    const run = pairs.slice(index, index + count).map((rank) => RANK_VALUE[rank]);
    if (isConsecutive(run)) return true;
  }
  return false;
}

export function getWhiteWinReason(hand: StandardCard[], firstRound: boolean): string | null {
  const ranks = hand.map((card) => card.rank);
  const allSameColor = hand.every((card) => ["hearts", "diamonds"].includes(card.suit)) || hand.every((card) => ["clubs", "spades"].includes(card.suit));
  if (firstRound && ranks.filter((rank) => rank === "3").length === 4) return "Tứ quý 3";
  if (firstRound && hand.some((card) => card.rank === "3" && card.suit === "spades") && hasPairs(hand, 3, true)) return "3 đôi thông có 3 bích";
  if (!firstRound && ranks.filter((rank) => rank === "2").length === 4) return "Tứ quý 2";
  if (!firstRound && hasPairs(hand, 5, true)) return "5 đôi thông";
  if (!firstRound && hasPairs(hand, 6, true)) return "6 đôi thông";
  if (!firstRound && hasPairs(hand, 6, false)) return "6 đôi bất kỳ";
  if (!firstRound && hasRanks(hand, TIEN_LEN_RANKS.slice(0, 12))) return "Sảnh rồng";
  if (!firstRound && allSameColor && hand.length >= 12) return "12 lá đồng màu";
  return null;
}

export function getPlayLabel(play: TienLenPlay | null): string {
  if (!play) return "Chưa có bộ bài";
  const labels: Record<TienLenKind, string> = {
    single: "Rác",
    pair: "Đôi",
    triple: "Sám cô",
    straight: "Sảnh",
    four: "Tứ quý",
    "consecutive-pairs": "Đôi thông",
  };
  return `${labels[play.kind]} ${play.cards.length > 1 ? `${play.cards.length} lá` : ""}`.trim();
}
