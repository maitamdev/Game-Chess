export type UnoColor = "red" | "yellow" | "green" | "blue";
export type UnoValue =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "skip"
  | "reverse"
  | "draw2"
  | "wild"
  | "wild4";

export interface UnoCard {
  id: number;
  color: UnoColor | null;
  value: UnoValue;
}

export interface UnoGameState {
  hands: UnoCard[][];
  drawPile: UnoCard[];
  discard: UnoCard[];
  currentSeat: number;
  direction: 1 | -1;
  activeColor: UnoColor;
  winnerSeat: number | null;
  turn: number;
  message: string;
}

export type UnoAction =
  | { type: "draw" }
  | { type: "play"; cardId: number; color?: UnoColor };

export interface UnoPublicView {
  hand: UnoCard[];
  handCounts: number[];
  topCard: UnoCard;
  drawCount: number;
  currentSeat: number;
  direction: 1 | -1;
  activeColor: UnoColor;
  winnerSeat: number | null;
  turn: number;
  message: string;
}

const COLORS: UnoColor[] = ["red", "yellow", "green", "blue"];

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function createDeck(): UnoCard[] {
  let id = 1;
  const cards: UnoCard[] = [];
  for (const color of COLORS) {
    cards.push({ id: id++, color, value: "0" });
    for (let value = 1; value <= 9; value += 1) {
      cards.push({ id: id++, color, value: String(value) as UnoValue });
      cards.push({ id: id++, color, value: String(value) as UnoValue });
    }
    for (const value of ["skip", "reverse", "draw2"] as const) {
      cards.push({ id: id++, color, value });
      cards.push({ id: id++, color, value });
    }
  }
  for (let index = 0; index < 4; index += 1) {
    cards.push({ id: id++, color: null, value: "wild" });
    cards.push({ id: id++, color: null, value: "wild4" });
  }
  return shuffle(cards);
}

function isWild(card: UnoCard): boolean {
  return card.value === "wild" || card.value === "wild4";
}

function nextSeat(
  seat: number,
  direction: 1 | -1,
  playerCount: number,
  steps = 1,
): number {
  return (
    (seat + direction * steps + playerCount * Math.max(2, steps)) %
    playerCount
  );
}

function drawCards(
  drawPile: UnoCard[],
  discard: UnoCard[],
  count: number,
): { cards: UnoCard[]; drawPile: UnoCard[]; discard: UnoCard[] } {
  let pile = [...drawPile];
  let played = [...discard];
  const cards: UnoCard[] = [];
  for (let index = 0; index < count; index += 1) {
    if (pile.length === 0 && played.length > 1) {
      const top = played[played.length - 1];
      pile = shuffle(played.slice(0, -1));
      played = [top];
    }
    const card = pile.pop();
    if (card) cards.push(card);
  }
  return { cards, drawPile: pile, discard: played };
}

export function createUnoGame(playerCount: number): UnoGameState {
  if (playerCount < 2 || playerCount > 4) {
    throw new Error("UNO requires 2-4 players");
  }
  const deck = createDeck();
  const hands: UnoCard[][] = Array.from({ length: playerCount }, () => []);
  for (let round = 0; round < 7; round += 1) {
    for (let seat = 0; seat < playerCount; seat += 1) {
      const card = deck.pop();
      if (card) hands[seat].push(card);
    }
  }
  const starterIndex = deck.findLastIndex(
    (card) => card.color !== null && /^\d$/.test(card.value),
  );
  const [starter] = deck.splice(starterIndex, 1);
  return {
    hands,
    drawPile: deck,
    discard: [starter],
    currentSeat: 0,
    direction: 1,
    activeColor: starter.color as UnoColor,
    winnerSeat: null,
    turn: 1,
    message: "Ván đấu bắt đầu.",
  };
}

export function canPlayUnoCard(
  card: UnoCard,
  topCard: UnoCard,
  activeColor: UnoColor,
): boolean {
  return isWild(card) || card.color === activeColor || card.value === topCard.value;
}

export function unoPublicView(state: UnoGameState, seat: number): UnoPublicView {
  return {
    hand: state.hands[seat] ?? [],
    handCounts: state.hands.map((hand) => hand.length),
    topCard: state.discard[state.discard.length - 1],
    drawCount: state.drawPile.length,
    currentSeat: state.currentSeat,
    direction: state.direction,
    activeColor: state.activeColor,
    winnerSeat: state.winnerSeat,
    turn: state.turn,
    message: state.message,
  };
}

export function applyUnoAction(
  state: UnoGameState,
  seat: number,
  action: UnoAction,
): UnoGameState {
  if (state.winnerSeat !== null) throw new Error("GAME_FINISHED");
  if (state.currentSeat !== seat) throw new Error("NOT_YOUR_TURN");
  const playerCount = state.hands.length;

  if (action.type === "draw") {
    const drawn = drawCards(state.drawPile, state.discard, 1);
    const hands = state.hands.map((hand, index) =>
      index === seat ? [...hand, ...drawn.cards] : [...hand],
    );
    return {
      ...state,
      hands,
      drawPile: drawn.drawPile,
      discard: drawn.discard,
      currentSeat: nextSeat(seat, state.direction, playerCount),
      turn: state.turn + 1,
      message: `Ghế ${seat + 1} rút một lá.`,
    };
  }

  const hand = state.hands[seat];
  const card = hand.find((item) => item.id === action.cardId);
  const topCard = state.discard[state.discard.length - 1];
  if (!card || !canPlayUnoCard(card, topCard, state.activeColor)) {
    throw new Error("INVALID_CARD");
  }
  if (isWild(card) && !action.color) throw new Error("COLOR_REQUIRED");

  const hands = state.hands.map((cards, index) =>
    index === seat ? cards.filter((item) => item.id !== card.id) : [...cards],
  );
  const activeColor = card.color ?? (action.color as UnoColor);
  const discard = [...state.discard, card];

  if (hands[seat].length === 0) {
    return {
      ...state,
      hands,
      discard,
      activeColor,
      winnerSeat: seat,
      turn: state.turn + 1,
      message: `Ghế ${seat + 1} đã thắng.`,
    };
  }

  let direction = state.direction;
  let steps = 1;
  let message =
    hands[seat].length === 1
      ? `Ghế ${seat + 1} hô UNO!`
      : `Ghế ${seat + 1} đã đánh bài.`;
  if (card.value === "reverse") {
    direction = direction === 1 ? -1 : 1;
    if (playerCount === 2) steps = 2;
    message = `Ghế ${seat + 1} đổi chiều.`;
  } else if (card.value === "skip") {
    steps = 2;
    message = "Một người chơi bị cấm lượt.";
  }

  let nextDrawPile = state.drawPile;
  let nextDiscard = discard;
  if (card.value === "draw2" || card.value === "wild4") {
    const target = nextSeat(seat, direction, playerCount);
    const count = card.value === "draw2" ? 2 : 4;
    const drawn = drawCards(nextDrawPile, nextDiscard, count);
    hands[target] = [...hands[target], ...drawn.cards];
    nextDrawPile = drawn.drawPile;
    nextDiscard = drawn.discard;
    steps = 2;
    message = `Ghế ${target + 1} rút ${count} lá và mất lượt.`;
  }

  return {
    ...state,
    hands,
    drawPile: nextDrawPile,
    discard: nextDiscard,
    currentSeat: nextSeat(seat, direction, playerCount, steps),
    direction,
    activeColor,
    turn: state.turn + 1,
    message,
  };
}
