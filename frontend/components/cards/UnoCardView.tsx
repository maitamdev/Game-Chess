import type { UnoCard } from "@/lib/cards/unoEngine";

const TONES = {
  red: "from-[#df5147] to-[#9f2528]",
  yellow: "from-[#f5cf4c] to-[#d6921d]",
  green: "from-[#39b975] to-[#187c50]",
  blue: "from-[#479fdb] to-[#235d9e]",
};

const LABELS = {
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

export const UNO_TONES = TONES;

export function UnoCardBack({ compact = false }: { compact?: boolean }) {
  return (
    <div
      aria-hidden
      className={`relative shrink-0 overflow-hidden rounded-[9px] border-2 border-[#ded9cf] bg-[#171d23] shadow-[0_10px_22px_rgba(2,8,12,.34)] ${
        compact ? "h-[68px] w-[48px]" : "h-[104px] w-[72px] sm:h-[124px] sm:w-[86px]"
      }`}
    >
      <span className="absolute inset-[10%] grid rotate-[-8deg] place-items-center rounded-[48%] bg-[#d94a40] text-sm font-black italic tracking-[-0.08em] text-white sm:text-xl">
        UNO
      </span>
    </div>
  );
}

export default function UnoCardView({
  card,
  playable = false,
  onClick,
}: {
  card: UnoCard;
  playable?: boolean;
  onClick?: () => void;
}) {
  const label = LABELS[card.value];
  const tone = card.color ? TONES[card.color] : "from-[#303944] to-[#12181d]";
  const wild = card.value === "wild" || card.value === "wild4";
  const classes = `relative h-[104px] w-[72px] shrink-0 overflow-hidden rounded-[9px] border-2 border-[#ded9cf] bg-gradient-to-br ${tone} text-white shadow-[0_10px_22px_rgba(2,8,12,.34)] sm:h-[124px] sm:w-[86px] ${
    playable
      ? "cursor-pointer ring-2 ring-brass/70 transition hover:-translate-y-3 hover:brightness-110"
      : ""
  }`;
  const face = (
    <>
      <span className="absolute left-[8%] top-[4%] text-xs font-black sm:text-sm">
        {label}
      </span>
      <span className="absolute inset-[10%] grid rotate-[-8deg] place-items-center rounded-[48%] bg-[#f4f0e8] text-2xl font-black italic text-[#172027] sm:text-3xl">
        {wild ? <span className="uno-wild-mark">{label}</span> : label}
      </span>
      <span className="absolute bottom-[4%] right-[8%] rotate-180 text-xs font-black sm:text-sm">
        {label}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={classes}
        onClick={onClick}
        disabled={!playable}
        aria-label={`${card.color ?? "wild"} ${label}`}
      >
        {face}
      </button>
    );
  }
  return <div className={classes}>{face}</div>;
}
