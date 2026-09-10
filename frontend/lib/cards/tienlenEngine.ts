import {
  CARD_RANKS,
  CARD_SUITS,
  type CardRank,
  type CardSuit,
  type StandardCard,
} from "./deck";
import {
  canBeat,
  findFirstPlayer,
  isLegalPlay,
  sortTienLenCards,
  type TienLenPlay,
} from "./tienlen";

export interface TienLenState {
  gameType: "tienlen";
  hands: StandardCard[][];
  currentSeat: number;
  lastPlay: { seat: number; play: TienLenPlay } | null;
  passes: number;
  finishOrder: number[];
  winnerSeat: number | null;
  turn: number;
  message: string;
}

export type TienLenAction =
  | { type: "play_cards"; cardIds: string[] }
  | { type: "pass" };

export interface TienLenPublicView {
  hand: StandardCard[];
  handCounts: number[];
  currentSeat: number;
  lastPlay: { seat: number; play: TienLenPlay } | null;
  passes: number;
  finishOrder: number[];
  winnerSeat: number | null;
  turn: number;
  message: string;
}

export type TienLenErrorCode =
  | "GAME_FINISHED"
  | "NOT_YOUR_TURN"
  | "INVALID_CARD"
  | "INVALID_PLAY"
  | "CANNOT_PASS"
  | "ALREADY_FINISHED";

const SUITS: CardSuit[] = [...CARD_SUITS];
const RANKS: CardRank[] = [...CARD_RANKS];

function secureRandom(maxExclusive: number): number {
  if (maxExclusive <= 1) return 0;
  const maxUint = 0x1_0000_0000;
  const limit = maxUint - (maxUint % maxExclusive);
  const values = new Uint32Array(1);
  do {
    crypto.getRandomValues(values);
  } while (values[0] >= limit);
  return values[0] % maxExclusive;
}

function createSecureDeck(): StandardCard[] {
  const deck = SUITS.flatMap((suit) =>
    RANKS.map((rank) => ({
      id: `${suit}-${rank}`,
      suit,
      rank,
    })),
  );
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const target = secureRandom(index + 1);
    [deck[index], deck[target]] = [deck[target], deck[index]];
  }
  return deck;
}

function activeSeats(state: TienLenState): number[] {
  return state.hands
    .map((hand, seat) => ({ hand, seat }))
    .filter(({ hand, seat }) => hand.length > 0 && !state.finishOrder.includes(seat))
    .map(({ seat }) => seat);
}

function nextActiveSeat(state: TienLenState, from: number): number {
  const total = state.hands.length;
  for (let step = 1; step <= total; step += 1) {
    const seat = (from + step) % total;
    if (state.hands[seat].length > 0 && !state.finishOrder.includes(seat)) {
      return seat;
    }
  }
  return from;
}

function cardIdsInHand(hand: StandardCard[], cardIds: string[]): StandardCard[] {
  const wanted = new Set(cardIds);
  return hand.filter((card) => wanted.has(card.id));
}

function withTurn(state: TienLenState, message: string): TienLenState {
  return { ...state, turn: state.turn + 1, message };
}

/** Tạo ván Tiến Lên chuẩn 4 người. Random chỉ chạy ở server khi dùng online. */
export function createTienLenGame(playerCount = 4): TienLenState {
  if (playerCount !== 4) {
    throw new Error("TIENLEN_REQUIRES_FOUR_PLAYERS");
  }
  const deck = createSecureDeck();
  const hands = Array.from({ length: playerCount }, (_, seat) =>
    sortTienLenCards(deck.slice(seat * 13, seat * 13 + 13)),
  );
  const firstSeat = findFirstPlayer(hands);
  return {
    gameType: "tienlen",
    hands,
    currentSeat: firstSeat >= 0 ? firstSeat : 0,
    lastPlay: null,
    passes: 0,
    finishOrder: [],
    winnerSeat: null,
    turn: 1,
    message:
      firstSeat >= 0
        ? `Ghế ${firstSeat + 1} đang giữ 3 bích và được đi trước.`
        : "Ván đấu bắt đầu.",
  };
}

export function tienLenPublicView(
  state: TienLenState,
  seat: number,
): TienLenPublicView {
  return {
    hand: state.hands[seat] ?? [],
    handCounts: state.hands.map((hand) => hand.length),
    currentSeat: state.currentSeat,
    lastPlay: state.lastPlay,
    passes: state.passes,
    finishOrder: state.finishOrder,
    winnerSeat: state.winnerSeat,
    turn: state.turn,
    message: state.message,
  };
}

export function applyTienLenAction(
  state: TienLenState,
  seat: number,
  action: TienLenAction,
): TienLenState {
  if (state.winnerSeat !== null) throw new Error("GAME_FINISHED");
  if (state.currentSeat !== seat) throw new Error("NOT_YOUR_TURN");
  if (state.finishOrder.includes(seat)) throw new Error("ALREADY_FINISHED");

  if (action.type === "pass") {
    if (!state.lastPlay) throw new Error("CANNOT_PASS");
    const activeCount = activeSeats(state).length;
    const passes = state.passes + 1;
    if (passes >= Math.max(1, activeCount - 1)) {
      const starter = state.lastPlay.seat;
      return withTurn(
        {
          ...state,
          currentSeat: starter,
          lastPlay: null,
          passes: 0,
        },
        `Ghế ${starter + 1} được mở lượt mới.`,
      );
    }
    const nextSeat = nextActiveSeat(state, seat);
    return withTurn(
      { ...state, currentSeat: nextSeat, passes },
      `Ghế ${seat + 1} bỏ lượt.`,
    );
  }

  const uniqueIds = new Set(action.cardIds);
  if (uniqueIds.size === 0 || uniqueIds.size !== action.cardIds.length) {
    throw new Error("INVALID_CARD");
  }
  const hand = state.hands[seat];
  const cards = cardIdsInHand(hand, action.cardIds);
  if (cards.length !== action.cardIds.length) throw new Error("INVALID_CARD");
  const play = isLegalPlay(cards, state.lastPlay?.play ?? null);
  if (!play) throw new Error("INVALID_PLAY");

  const hands = state.hands.map((currentHand, index) =>
    index === seat
      ? currentHand.filter((card) => !uniqueIds.has(card.id))
      : [...currentHand],
  );
  const finishOrder = [...state.finishOrder];
  if (hands[seat].length === 0) finishOrder.push(seat);

  if (finishOrder.length === 1) {
    return withTurn(
      {
        ...state,
        hands,
        finishOrder,
        winnerSeat: seat,
        lastPlay: { seat, play },
        passes: 0,
      },
      `Ghế ${seat + 1} đã thắng Tiến Lên.`,
    );
  }

  const nextSeat = nextActiveSeat({ ...state, hands, finishOrder }, seat);
  return withTurn(
    {
      ...state,
      hands,
      currentSeat: nextSeat,
      lastPlay: { seat, play },
      passes: 0,
      finishOrder,
    },
    hands[seat].length === 0
      ? `Ghế ${seat + 1} đã về đích. Ghế ${nextSeat + 1} tiếp tục.`
      : `Ghế ${seat + 1} đã đánh bài.`,
  );
}

export function tienLenActionMessage(code: string): string {
  const messages: Record<string, string> = {
    GAME_FINISHED: "Ván bài đã kết thúc",
    NOT_YOUR_TURN: "Chưa tới lượt của bạn",
    INVALID_CARD: "Bộ bài không hợp lệ",
    INVALID_PLAY: "Bộ bài này không đúng luật hoặc chưa đủ lớn",
    CANNOT_PASS: "Không thể bỏ lượt khi chưa có bộ bài trên bàn",
    ALREADY_FINISHED: "Bạn đã về đích trong ván này",
  };
  return messages[code] ?? "Nước đi không hợp lệ";
}

