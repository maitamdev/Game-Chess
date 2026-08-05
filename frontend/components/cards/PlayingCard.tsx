import type { StandardCard } from "@/lib/cards/deck";

const SUITS = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

export default function PlayingCard({
  card,
  hidden = false,
  compact = false,
  table = false,
}: {
  card?: StandardCard;
  hidden?: boolean;
  compact?: boolean;
  table?: boolean;
}) {
  const size = compact
    ? "h-[92px] w-[64px]"
    : table
      ? "h-[84px] w-[58px] sm:h-[132px] sm:w-[92px] lg:h-[154px] lg:w-[108px]"
      : "h-[126px] w-[88px] sm:h-[154px] sm:w-[108px]";

  if (hidden || !card) {
    return (
      <div
        aria-label="Lá bài úp"
        className={`playing-card-back relative shrink-0 overflow-hidden rounded-[10px] border-2 border-[#d8d4ca] bg-[#17242b] shadow-[0_12px_24px_rgba(2,8,12,.3)] ${size}`}
      >
        <div className="absolute inset-[7px] rounded-[6px] border border-brass/55" />
        <div className="absolute inset-[13px] rounded-[4px] bg-[repeating-linear-gradient(45deg,rgba(214,174,85,.18)_0_2px,transparent_2px_7px)]" />
        <span className="absolute inset-0 grid place-items-center text-xs font-black tracking-[0.18em] text-brass">
          KỲ ĐÀI
        </span>
      </div>
    );
  }

  const red = card.suit === "hearts" || card.suit === "diamonds";
  const suit = SUITS[card.suit];
  return (
    <div
      aria-label={`${card.rank} ${suit}`}
      className={`relative shrink-0 overflow-hidden rounded-[10px] border border-[#d8d4ca] bg-[#f1eee7] ${
        red ? "text-[#b63832]" : "text-[#172027]"
      } shadow-[0_12px_24px_rgba(2,8,12,.3)] ${size}`}
    >
      <div className="absolute left-[9%] top-[7%] text-center font-[family-name:var(--font-mono)] text-sm font-black leading-[.9] sm:text-base">
        <span className="block">{card.rank}</span>
        <span className="mt-1 block text-xs sm:text-sm">{suit}</span>
      </div>
      <span className="absolute inset-0 grid place-items-center text-4xl sm:text-5xl">{suit}</span>
      <div className="absolute bottom-[7%] right-[9%] rotate-180 text-center font-[family-name:var(--font-mono)] text-sm font-black leading-[.9] sm:text-base">
        <span className="block">{card.rank}</span>
        <span className="mt-1 block text-xs sm:text-sm">{suit}</span>
      </div>
    </div>
  );
}
