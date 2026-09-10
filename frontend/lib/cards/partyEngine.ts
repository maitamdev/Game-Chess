import {
  baicaoScore,
  blackjackScore,
  CARD_RANKS,
  CARD_SUITS,
  evaluateXiDach,
  type CardRank,
  type CardSuit,
  type StandardCard,
} from "./deck";

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

function secureDeck(): StandardCard[] {
  const deck = CARD_SUITS.flatMap((suit: CardSuit) =>
    CARD_RANKS.map((rank: CardRank) => ({
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

function take(deck: StandardCard[], count: number): StandardCard[] {
  return Array.from({ length: count }, () => deck.pop()).filter(
    (card): card is StandardCard => Boolean(card),
  );
}

export interface XiDachState {
  gameType: "xidach";
  playerHands: StandardCard[][];
  playerStood: boolean[];
  playerBusted: boolean[];
  dealerHand: StandardCard[];
  drawPile: StandardCard[];
  currentSeat: number;
  phase: "players" | "dealer" | "finished";
  winnerSeats: number[];
  results: Array<{ seat: number; kind: string; score: number; outcome: "win" | "loss" | "draw" }>;
  turn: number;
  message: string;
}

export type XiDachAction = { type: "hit" } | { type: "stand" };

export interface XiDachPublicView {
  gameType: "xidach";
  hand: StandardCard[];
  handCounts: number[];
  dealerVisible: StandardCard[];
  dealerCount: number;
  currentSeat: number;
  phase: XiDachState["phase"];
  winnerSeats: number[];
  results: XiDachState["results"];
  turn: number;
  message: string;
}

function finishXiDach(state: XiDachState): XiDachState {
  const dealerScore = blackjackScore(state.dealerHand);
  const dealerBusted = dealerScore > 21;
  const results = state.playerHands.map((hand, seat) => {
    const evaluation = evaluateXiDach(hand);
    const playerBusted = evaluation.kind === "quac";
    const outcome: "win" | "loss" | "draw" = playerBusted
      ? "loss"
      : dealerBusted
        ? "win"
        : evaluation.score > dealerScore
          ? "win"
          : evaluation.score < dealerScore
            ? "loss"
            : "draw";
    return {
      seat,
      kind: evaluation.label,
      score: evaluation.score,
      outcome,
    };
  });
  return {
    ...state,
    phase: "finished",
    currentSeat: -1,
    winnerSeats: results.filter((result) => result.outcome === "win").map((result) => result.seat),
    results,
    turn: state.turn + 1,
    message: `Nhà cái ${dealerBusted ? "quắc" : `được ${dealerScore} điểm`}.`,
  };
}

function nextXiDachSeat(state: XiDachState, from: number): number {
  for (let offset = 1; offset <= state.playerHands.length; offset += 1) {
    const seat = (from + offset) % state.playerHands.length;
    if (!state.playerStood[seat] && !state.playerBusted[seat]) return seat;
  }
  return -1;
}

function resolveDealer(state: XiDachState, hands: StandardCard[][], pile: StandardCard[]): XiDachState {
  const dealerHand = [...state.dealerHand];
  while (blackjackScore(dealerHand) < 17 && dealerHand.length < 8) {
    const card = pile.pop();
    if (!card) break;
    dealerHand.push(card);
  }
  return {
    ...state,
    playerHands: hands,
    dealerHand,
    drawPile: pile,
    phase: "dealer",
    currentSeat: -1,
  };
}

export function createXiDachGame(playerCount: number): XiDachState {
  if (playerCount < 2 || playerCount > 4) throw new Error("XIDACH_REQUIRES_2_TO_4_PLAYERS");
  const deck = secureDeck();
  const playerHands = Array.from({ length: playerCount }, () => take(deck, 2));
  const dealerHand = take(deck, 2);
  const playerStood = playerHands.map(() => false);
  const playerBusted = playerHands.map((hand) => blackjackScore(hand) > 21);
  const firstActive = playerBusted.findIndex((busted) => !busted);
  const state: XiDachState = {
    gameType: "xidach",
    playerHands,
    playerStood,
    playerBusted,
    dealerHand,
    drawPile: deck,
    currentSeat: firstActive >= 0 ? firstActive : -1,
    phase: firstActive >= 0 ? "players" : "dealer",
    winnerSeats: [],
    results: [],
    turn: 1,
    message: "Mỗi người chọn rút thêm hoặc dừng.",
  };
  if (firstActive < 0) return finishXiDach(resolveDealer(state, playerHands, deck));
  return state;
}

export function xiDachPublicView(state: XiDachState, seat: number): XiDachPublicView {
  return {
    gameType: "xidach",
    hand: state.playerHands[seat] ?? [],
    handCounts: state.playerHands.map((hand) => hand.length),
    dealerVisible: state.phase === "finished" ? state.dealerHand : state.dealerHand.slice(0, 1),
    dealerCount: state.dealerHand.length,
    currentSeat: state.currentSeat,
    phase: state.phase,
    winnerSeats: state.winnerSeats,
    results: state.results,
    turn: state.turn,
    message: state.message,
  };
}

export function applyXiDachAction(
  state: XiDachState,
  seat: number,
  action: XiDachAction,
): XiDachState {
  if (state.phase === "finished") throw new Error("GAME_FINISHED");
  if (state.phase !== "players" || state.currentSeat !== seat) throw new Error("NOT_YOUR_TURN");
  const hands = state.playerHands.map((hand) => [...hand]);
  const playerStood = [...state.playerStood];
  const playerBusted = [...state.playerBusted];
  const deck = [...(state.drawPile ?? [])];
  if (action.type === "hit") {
    const card = deck.pop();
    if (!card) throw new Error("DECK_EMPTY");
    hands[seat] = [...hands[seat], card];
    if (blackjackScore(hands[seat]) > 21) playerBusted[seat] = true;
  } else {
    playerStood[seat] = true;
  }
  const nextSeat = nextXiDachSeat({ ...state, playerStood, playerBusted }, seat);
  if (nextSeat >= 0) {
    return {
      ...state,
      playerHands: hands,
      playerStood,
      playerBusted,
      drawPile: deck,
      currentSeat: nextSeat,
      turn: state.turn + 1,
      message: `Ghế ${nextSeat + 1} đang quyết định.`,
    };
  }

  return finishXiDach(resolveDealer({ ...state, playerStood, playerBusted }, hands, deck));
}

export interface BaiCaoState {
  gameType: "baicao";
  hands: StandardCard[][];
  revealed: boolean[];
  currentSeat: number;
  phase: "revealing" | "finished";
  results: Array<{ seat: number; score: number; outcome: "win" | "loss" | "draw" }>;
  turn: number;
  message: string;
}

export type BaiCaoAction = { type: "reveal" };

export interface BaiCaoPublicView {
  gameType: "baicao";
  hand: StandardCard[];
  handCounts: number[];
  revealed: boolean[];
  currentSeat: number;
  phase: BaiCaoState["phase"];
  results: BaiCaoState["results"];
  turn: number;
  message: string;
}

export function createBaiCaoGame(playerCount: number): BaiCaoState {
  if (playerCount < 2 || playerCount > 4) throw new Error("BAICAO_REQUIRES_2_TO_4_PLAYERS");
  const deck = secureDeck();
  const hands = Array.from({ length: playerCount }, () => take(deck, 3));
  return {
    gameType: "baicao",
    hands,
    revealed: hands.map(() => false),
    currentSeat: 0,
    phase: "revealing",
    results: [],
    turn: 1,
    message: "Lần lượt lật ba lá để so điểm.",
  };
}

export function baiCaoPublicView(state: BaiCaoState, seat: number): BaiCaoPublicView {
  return {
    gameType: "baicao",
    hand: state.hands[seat] ?? [],
    handCounts: state.hands.map((hand) => hand.length),
    revealed: state.revealed,
    currentSeat: state.currentSeat,
    phase: state.phase,
    results: state.results,
    turn: state.turn,
    message: state.message,
  };
}

export function applyBaiCaoAction(
  state: BaiCaoState,
  seat: number,
  _action: BaiCaoAction,
): BaiCaoState {
  if (state.phase === "finished") throw new Error("GAME_FINISHED");
  if (state.currentSeat !== seat) throw new Error("NOT_YOUR_TURN");
  const revealed = [...state.revealed];
  revealed[seat] = true;
  const nextSeat = revealed.findIndex((value) => !value);
  if (nextSeat >= 0) {
    return {
      ...state,
      revealed,
      currentSeat: nextSeat,
      turn: state.turn + 1,
      message: `Ghế ${nextSeat + 1} chuẩn bị lật bài.`,
    };
  }
  const scores = state.hands.map((hand) => baicaoScore(hand));
  const best = Math.max(...scores);
  const winners = scores.filter((score) => score === best).length;
  const results = scores.map((score, index) => ({
    seat: index,
    score,
    outcome: score === best ? (winners === 1 ? "win" as const : "draw" as const) : "loss" as const,
  }));
  return {
    ...state,
    revealed,
    phase: "finished",
    currentSeat: -1,
    results,
    turn: state.turn + 1,
    message: `Kết quả: ${best} nút.`,
  };
}

export function partyActionMessage(code: string): string {
  const messages: Record<string, string> = {
    GAME_FINISHED: "Ván chơi đã kết thúc",
    NOT_YOUR_TURN: "Chưa tới lượt của bạn",
    DECK_EMPTY: "Bộ bài đã hết",
  };
  return messages[code] ?? "Hành động không hợp lệ";
}
