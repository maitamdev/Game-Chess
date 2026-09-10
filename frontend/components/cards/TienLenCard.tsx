import type { StandardCard } from "@/lib/cards/deck";

const SUITS = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
} as const;

export default function TienLenCard({
  card,
  selected = false,
  small = false,
  onClick,
}: {
  card: StandardCard;
  selected?: boolean;
  small?: boolean;
  onClick?: () => void;
}) {
  const red = card.suit === "hearts" || card.suit === "diamonds";
  const content = (
    <div
      className={`tl-card ${small ? "tl-card-small" : ""} ${red ? "tl-card-red" : ""} ${selected ? "tl-card-selected" : ""}`}
    >
      <div className="tl-card-corner">
        <strong>{card.rank}</strong>
        <span>{SUITS[card.suit]}</span>
      </div>
      <span className="tl-card-suit">{SUITS[card.suit]}</span>
      <div className="tl-card-corner tl-card-corner-bottom">
        <strong>{card.rank}</strong>
        <span>{SUITS[card.suit]}</span>
      </div>
    </div>
  );

  return onClick ? (
    <button type="button" className="tl-card-button" onClick={onClick} aria-pressed={selected} aria-label={`${card.rank} ${SUITS[card.suit]}`}>
      {content}
    </button>
  ) : (
    <div aria-label={`${card.rank} ${SUITS[card.suit]}`}>{content}</div>
  );
}
