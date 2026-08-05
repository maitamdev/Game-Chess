"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type UnoColor = "red" | "yellow" | "green" | "blue";
type UnoValue =
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

interface UnoCard {
  id: number;
  color: UnoColor | null;
  value: UnoValue;
}

interface GameState {
  hands: UnoCard[][];
  drawPile: UnoCard[];
  discard: UnoCard[];
  currentPlayer: number;
  direction: 1 | -1;
  activeColor: UnoColor;
  status: "playing" | "finished";
  winner: number | null;
  message: string;
  turn: number;
}

const COLORS: UnoColor[] = ["red", "yellow", "green", "blue"];
const PLAYER_NAMES = ["Bạn", "Mai", "Bảo", "An"];
const COLOR_LABELS: Record<UnoColor, string> = {
  red: "Đỏ",
  yellow: "Vàng",
  green: "Lục",
  blue: "Lam",
};
const VALUE_LABELS: Record<UnoValue, string> = {
  "0": "0",
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "8": "8",
  "9": "9",
  skip: "⊘",
  reverse: "↻",
  draw2: "+2",
  wild: "W",
  wild4: "+4",
};

const CARD_TONES: Record<UnoColor, string> = {
  red: "from-[#e64b3c] to-[#a51f24]",
  yellow: "from-[#ffd84a] to-[#e69f16]",
  green: "from-[#3ec978] to-[#16834e]",
  blue: "from-[#42a9f5] to-[#1760b6]",
};

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function buildDeck(): UnoCard[] {
  let id = 1;
  const cards: UnoCard[] = [];
  for (const color of COLORS) {
    cards.push({ id: id++, color, value: "0" });
    for (let number = 1; number <= 9; number += 1) {
      cards.push({ id: id++, color, value: String(number) as UnoValue });
      cards.push({ id: id++, color, value: String(number) as UnoValue });
    }
    for (const value of ["skip", "reverse", "draw2"] as const) {
      cards.push({ id: id++, color, value });
      cards.push({ id: id++, color, value });
    }
  }
  for (let i = 0; i < 4; i += 1) {
    cards.push({ id: id++, color: null, value: "wild" });
    cards.push({ id: id++, color: null, value: "wild4" });
  }
  return shuffle(cards);
}

function isWild(card: UnoCard): boolean {
  return card.value === "wild" || card.value === "wild4";
}

function isPlayable(card: UnoCard, top: UnoCard, activeColor: UnoColor): boolean {
  return isWild(card) || card.color === activeColor || card.value === top.value;
}

function nextPlayer(
  player: number,
  direction: 1 | -1,
  steps = 1,
): number {
  return (player + direction * steps + 12) % 4;
}

function drawCards(
  drawPile: UnoCard[],
  discard: UnoCard[],
  count: number,
): { cards: UnoCard[]; drawPile: UnoCard[]; discard: UnoCard[] } {
  let pile = [...drawPile];
  let played = [...discard];
  const cards: UnoCard[] = [];

  for (let i = 0; i < count; i += 1) {
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

function createGame(): GameState {
  const deck = buildDeck();
  const hands: UnoCard[][] = [[], [], [], []];
  for (let round = 0; round < 7; round += 1) {
    for (let player = 0; player < 4; player += 1) {
      const card = deck.pop();
      if (card) hands[player].push(card);
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
    currentPlayer: 0,
    direction: 1,
    activeColor: starter.color as UnoColor,
    status: "playing",
    winner: null,
    message: "Lượt của bạn. Chọn một lá hợp lệ.",
    turn: 1,
  };
}

function chooseBotColor(hand: UnoCard[]): UnoColor {
  const counts = COLORS.map((color) => ({
    color,
    count: hand.filter((card) => card.color === color).length,
  }));
  counts.sort((a, b) => b.count - a.count);
  return counts[0].color;
}

function playCard(
  state: GameState,
  player: number,
  cardId: number,
  chosenColor?: UnoColor,
): GameState {
  if (state.status !== "playing" || state.currentPlayer !== player) return state;
  const hand = state.hands[player];
  const card = hand.find((item) => item.id === cardId);
  const top = state.discard[state.discard.length - 1];
  if (!card || !isPlayable(card, top, state.activeColor)) return state;
  if (isWild(card) && chosenColor === undefined) return state;

  const hands = state.hands.map((items, index) =>
    index === player ? items.filter((item) => item.id !== cardId) : [...items],
  );
  const remaining = hands[player].length;
  if (remaining === 0) {
    return {
      ...state,
      hands,
      discard: [...state.discard, card],
      activeColor: card.color ?? (chosenColor as UnoColor),
      status: "finished",
      winner: player,
      message: `${PLAYER_NAMES[player]} đã thắng ván UNO!`,
      turn: state.turn + 1,
    };
  }

  let direction = state.direction;
  let steps = 1;
  let message =
    remaining === 1
      ? `${PLAYER_NAMES[player]} hô UNO!`
      : `${PLAYER_NAMES[player]} đánh ${VALUE_LABELS[card.value]}.`;

  if (card.value === "reverse") {
    direction = state.direction === 1 ? -1 : 1;
    message = `${PLAYER_NAMES[player]} đổi chiều chơi.`;
  } else if (card.value === "skip") {
    steps = 2;
    const skipped = nextPlayer(player, direction);
    message = `${PLAYER_NAMES[skipped]} bị cấm lượt.`;
  }

  let drawPile = state.drawPile;
  let discard = [...state.discard, card];
  if (card.value === "draw2" || card.value === "wild4") {
    const target = nextPlayer(player, direction);
    const count = card.value === "draw2" ? 2 : 4;
    const drawn = drawCards(drawPile, discard, count);
    hands[target] = [...hands[target], ...drawn.cards];
    drawPile = drawn.drawPile;
    discard = drawn.discard;
    steps = 2;
    message = `${PLAYER_NAMES[target]} rút ${count} lá và mất lượt.`;
  }

  const currentPlayer = nextPlayer(player, direction, steps);
  return {
    ...state,
    hands,
    drawPile,
    discard,
    currentPlayer,
    direction,
    activeColor: card.color ?? (chosenColor as UnoColor),
    message,
    turn: state.turn + 1,
  };
}

function drawForPlayer(state: GameState, player: number): GameState {
  if (state.status !== "playing" || state.currentPlayer !== player) return state;
  const drawn = drawCards(state.drawPile, state.discard, 1);
  const hands = state.hands.map((hand, index) =>
    index === player ? [...hand, ...drawn.cards] : [...hand],
  );
  const next = nextPlayer(player, state.direction);
  return {
    ...state,
    hands,
    drawPile: drawn.drawPile,
    discard: drawn.discard,
    currentPlayer: next,
    message: `${PLAYER_NAMES[player]} rút một lá. Lượt của ${PLAYER_NAMES[next]}.`,
    turn: state.turn + 1,
  };
}

function CardFace({
  card,
  playable = false,
  onClick,
  compact = false,
}: {
  card: UnoCard;
  playable?: boolean;
  onClick?: () => void;
  compact?: boolean;
}) {
  const wild = isWild(card);
  const tone = card.color ? CARD_TONES[card.color] : "from-[#292d3a] to-[#10131b]";
  const label = VALUE_LABELS[card.value];
  const content = (
    <>
      <span className="absolute left-[9%] top-[4%] text-[10px] font-black leading-none sm:text-sm">
        {label}
      </span>
      <span className="absolute inset-[9%] flex rotate-[-8deg] items-center justify-center rounded-[48%] bg-white/90 text-[clamp(1rem,3vw,2.2rem)] font-black italic text-[#171922] shadow-inner">
        {wild ? (
          <span className="uno-wild-mark" aria-hidden>
            {label}
          </span>
        ) : (
          label
        )}
      </span>
      <span className="absolute bottom-[4%] right-[9%] rotate-180 text-[10px] font-black leading-none sm:text-sm">
        {label}
      </span>
    </>
  );

  const classes = `uno-card relative shrink-0 overflow-hidden rounded-[9px] border-2 border-white/80 bg-gradient-to-br ${tone} text-white shadow-[0_8px_18px_rgba(0,0,0,.32)] ${
    compact ? "h-[78px] w-[54px]" : "h-[96px] w-[66px] sm:h-[120px] sm:w-[82px]"
  } ${playable ? "uno-card-playable" : ""}`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!playable}
        aria-label={`${card.color ? COLOR_LABELS[card.color] : "Đổi màu"} ${label}`}
        className={`${classes} touch-manipulation disabled:cursor-not-allowed disabled:saturate-[.65]`}
      >
        {content}
      </button>
    );
  }
  return <div className={classes}>{content}</div>;
}

function CardBack({ compact = false }: { compact?: boolean }) {
  return (
    <div
      aria-hidden
      className={`uno-card-back relative shrink-0 overflow-hidden rounded-[9px] border-2 border-white/80 bg-[#171923] shadow-[0_8px_18px_rgba(0,0,0,.32)] ${
        compact ? "h-[66px] w-[46px]" : "h-[96px] w-[66px] sm:h-[120px] sm:w-[82px]"
      }`}
    >
      <span className="absolute inset-[10%] flex rotate-[-10deg] items-center justify-center rounded-[48%] bg-[#e83932] text-sm font-black italic tracking-[-0.08em] text-white sm:text-xl">
        UNO
      </span>
    </div>
  );
}

function BotSeat({
  player,
  count,
  active,
}: {
  player: number;
  count: number;
  active: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2 rounded-[12px] border px-3 py-2 transition-colors ${
        active
          ? "border-[#e8bd45] bg-[#e8bd45]/10"
          : "border-white/10 bg-black/20"
      }`}
    >
      <div
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${
          active ? "bg-[#e8bd45] text-[#151923]" : "bg-white/10 text-white/75"
        }`}
      >
        {PLAYER_NAMES[player][0]}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-white">{PLAYER_NAMES[player]}</div>
        <div className="text-xs text-white/55">{count} lá</div>
      </div>
      <div className="ml-auto hidden -space-x-8 sm:flex">
        {Array.from({ length: Math.min(count, 3) }, (_, index) => (
          <CardBack key={index} compact />
        ))}
      </div>
    </div>
  );
}

export default function UnoPage() {
  const [game, setGame] = useState<GameState | null>(null);
  const [pendingWild, setPendingWild] = useState<UnoCard | null>(null);
  const botTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const newGame = useCallback(() => {
    if (botTimer.current) clearTimeout(botTimer.current);
    setPendingWild(null);
    setGame(createGame());
  }, []);

  useEffect(() => {
    newGame();
    return () => {
      if (botTimer.current) clearTimeout(botTimer.current);
    };
  }, [newGame]);

  useEffect(() => {
    if (!game || game.status !== "playing" || game.currentPlayer === 0) return;
    const scheduledPlayer = game.currentPlayer;
    const scheduledTurn = game.turn;
    botTimer.current = setTimeout(() => {
      setGame((current) => {
        if (
          !current ||
          current.status !== "playing" ||
          current.currentPlayer !== scheduledPlayer ||
          current.turn !== scheduledTurn
        ) {
          return current;
        }
        const top = current.discard[current.discard.length - 1];
        const hand = current.hands[scheduledPlayer];
        const playable = hand.filter((card) =>
          isPlayable(card, top, current.activeColor),
        );
        if (playable.length === 0) return drawForPlayer(current, scheduledPlayer);

        const choice =
          playable.find((card) => card.value === "draw2" || card.value === "wild4") ??
          playable.find((card) => card.value === "skip" || card.value === "reverse") ??
          playable[0];
        const remaining = hand.filter((card) => card.id !== choice.id);
        const color = isWild(choice) ? chooseBotColor(remaining) : undefined;
        return playCard(current, scheduledPlayer, choice.id, color);
      });
    }, 650);
    return () => {
      if (botTimer.current) clearTimeout(botTimer.current);
    };
  }, [game]);

  const humanHand = game?.hands[0] ?? [];
  const top = game?.discard[game.discard.length - 1];
  const playableIds = useMemo(() => {
    if (!game || !top || game.currentPlayer !== 0 || game.status !== "playing") {
      return new Set<number>();
    }
    return new Set(
      humanHand
        .filter((card) => isPlayable(card, top, game.activeColor))
        .map((card) => card.id),
    );
  }, [game, humanHand, top]);

  const handleCard = (card: UnoCard) => {
    if (!game || !playableIds.has(card.id)) return;
    if (isWild(card)) {
      setPendingWild(card);
      return;
    }
    setGame((current) => (current ? playCard(current, 0, card.id) : current));
  };

  const chooseColor = (color: UnoColor) => {
    if (!pendingWild) return;
    setGame((current) =>
      current ? playCard(current, 0, pendingWild.id, color) : current,
    );
    setPendingWild(null);
  };

  if (!game || !top) {
    return <div className="min-h-[calc(100dvh-64px)] bg-[#07131b]" />;
  }

  const humanTurn = game.currentPlayer === 0 && game.status === "playing";

  return (
    <div className="uno-page min-h-[calc(100dvh-64px)] overflow-hidden bg-[#07131b] text-white">
      <div className="mx-auto flex min-h-[calc(100dvh-64px)] max-w-[1180px] flex-col px-3 py-4 sm:px-6 lg:py-6">
        <header className="mb-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e8bd45]">
              Kỳ Đài Minigame
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.04em] sm:text-4xl">
              UNO Arena
            </h1>
          </div>
          <button
            type="button"
            onClick={newGame}
            className="min-h-11 rounded-[8px] border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white transition hover:border-[#e8bd45]/70 hover:bg-white/10 active:translate-y-px"
          >
            Ván mới
          </button>
        </header>

        <section className="uno-table relative flex min-h-[570px] flex-1 flex-col overflow-hidden rounded-[20px] border border-white/10 p-3 shadow-[0_28px_80px_rgba(0,0,0,.35)] sm:p-5">
          <div className="relative z-10 grid grid-cols-3 gap-2">
            {[1, 2, 3].map((player) => (
              <BotSeat
                key={player}
                player={player}
                count={game.hands[player].length}
                active={game.currentPlayer === player}
              />
            ))}
          </div>

          <div className="relative z-10 flex flex-1 flex-col items-center justify-center py-5">
            <div className="mb-5 flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-[#07131b]/75 px-4 py-2 text-center text-xs text-white/75 backdrop-blur-sm sm:text-sm">
              <span
                className={`h-2.5 w-2.5 rounded-full bg-gradient-to-br ${CARD_TONES[game.activeColor]}`}
              />
              {game.message}
            </div>

            <div className="flex items-center justify-center gap-5 sm:gap-8">
              <button
                type="button"
                onClick={() =>
                  humanTurn &&
                  setGame((current) => (current ? drawForPlayer(current, 0) : current))
                }
                disabled={!humanTurn}
                aria-label="Rút một lá"
                className="group relative disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CardBack />
                <span className="mt-2 block text-xs font-semibold text-white/65 group-enabled:group-hover:text-white">
                  Rút bài · {game.drawPile.length}
                </span>
              </button>

              <div className="relative">
                <CardFace card={top} />
                <span className="mt-2 block text-center text-xs font-semibold text-white/65">
                  Lá vừa đánh
                </span>
              </div>
            </div>
          </div>

          <div className="relative z-10">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold ${
                    humanTurn ? "bg-[#e8bd45] text-[#151923]" : "bg-white/10"
                  }`}
                >
                  B
                </span>
                <div>
                  <div className="text-sm font-semibold">Bài của bạn</div>
                  <div className="text-xs text-white/50">{humanHand.length} lá</div>
                </div>
              </div>
              {humanHand.length === 1 && (
                <motion.span
                  initial={{ scale: 0.7, rotate: -8 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="text-xl font-black italic tracking-[-0.08em] text-[#ffd84a]"
                >
                  UNO!
                </motion.span>
              )}
            </div>

            <div className="uno-hand flex min-h-[126px] items-end overflow-x-auto overflow-y-hidden px-1 pb-2 pt-3 sm:justify-center">
              {humanHand.map((card, index) => (
                <motion.div
                  key={card.id}
                  layout
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className={index === 0 ? "" : "-ml-4 sm:-ml-3"}
                  style={{ zIndex: index }}
                >
                  <CardFace
                    card={card}
                    playable={playableIds.has(card.id)}
                    onClick={() => handleCard(card)}
                  />
                </motion.div>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {game.status === "finished" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 grid place-items-center bg-[#07131b]/88 p-5 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ y: 18, scale: 0.95 }}
                  animate={{ y: 0, scale: 1 }}
                  className="w-full max-w-sm rounded-[16px] border border-[#e8bd45]/35 bg-[#101f28] p-7 text-center shadow-2xl"
                >
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#e8bd45] text-2xl font-black italic tracking-[-0.08em] text-[#151923]">
                    UNO
                  </div>
                  <h2 className="mt-5 text-2xl font-extrabold">
                    {game.winner === 0 ? "Bạn chiến thắng!" : `${PLAYER_NAMES[game.winner ?? 1]} thắng`}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-white/60">
                    {game.winner === 0
                      ? "Một ván đấu gọn gàng. Sẵn sàng giữ ngôi đầu?"
                      : "Máy đã về hết bài trước. Thử đổi chiến thuật ở ván kế tiếp."}
                  </p>
                  <button
                    type="button"
                    onClick={newGame}
                    className="mt-6 min-h-11 w-full rounded-[8px] bg-[#e8bd45] px-5 font-bold text-[#151923] transition hover:bg-[#ffd866] active:translate-y-px"
                  >
                    Chơi ván mới
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <p className="mt-3 text-center text-xs leading-5 text-white/45">
          Đánh cùng màu hoặc cùng ký hiệu. Lá Đổi màu dùng được ở mọi lượt.
        </p>
      </div>

      <AnimatePresence>
        {pendingWild && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-[#07131b]/85 p-4 backdrop-blur-sm"
            onClick={() => setPendingWild(null)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Chọn màu"
              initial={{ scale: 0.94, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="w-full max-w-sm rounded-[16px] border border-white/15 bg-[#10212a] p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 className="text-center text-xl font-bold">Chọn màu tiếp theo</h2>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => chooseColor(color)}
                    className={`min-h-16 rounded-[10px] bg-gradient-to-br ${CARD_TONES[color]} font-bold text-white shadow-lg transition hover:brightness-110 active:scale-[.98]`}
                  >
                    {COLOR_LABELS[color]}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
