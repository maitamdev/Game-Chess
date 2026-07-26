import Link from "next/link";

export type GuideGlyph = {
  /** Đường dẫn ảnh trong public/, ví dụ "/pieces/wN.svg" */
  img?: string;
  /** Ký tự hiển thị thay ảnh: chữ Hán, emoji, ✕/○ */
  char?: string;
  /** Chữ Hán cần font serif Trung */
  serif?: boolean;
};

export type GuidePiece = {
  glyph: GuideGlyph;
  name: string;
  count: string;
  rule: string;
};

export type GuideMode = {
  href: string;
  label: string;
  note: string;
};

export type GuideData = {
  backHref: string;
  backLabel: string;
  title: string;
  tagline: string;
  objective: string;
  setup: string[];
  piecesTitle: string;
  pieces: GuidePiece[];
  specialRules: string[];
  winConditions: string[];
  drawConditions: string[];
  clock: string[];
  uiTips: string[];
  notation: string;
  modes: GuideMode[];
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-12 mb-4 font-[family-name:var(--font-display)] text-lg font-medium">
      {children}
    </h2>
  );
}

function Glyph({ glyph }: { glyph: GuideGlyph }) {
  if (glyph.img) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={glyph.img} alt="" className="h-9 w-9" />;
  }
  return (
    <span
      aria-hidden
      className="text-2xl leading-none text-brass"
      style={
        glyph.serif
          ? { fontFamily: '"Noto Serif SC", "SimSun", serif' }
          : undefined
      }
    >
      {glyph.char}
    </span>
  );
}

function RuleList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-relaxed">
          <span aria-hidden className="mt-[7px] h-1 w-3 shrink-0 bg-brass/60" />
          <span className="text-parchment/90">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function GuideLayout({ data }: { data: GuideData }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href={data.backHref}
        className="rounded-[6px] text-sm text-muted transition-colors hover:text-brass"
      >
        ← {data.backLabel}
      </Link>

      <h1 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-semibold leading-tight">
        {data.title}
      </h1>
      <p className="mt-3 max-w-2xl text-base text-muted">{data.tagline}</p>

      <div className="mt-10 rounded-[10px] border border-line border-l-2 border-l-brass bg-slate p-5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Mục tiêu
        </span>
        <p className="mt-2 text-base leading-relaxed">{data.objective}</p>
      </div>

      <SectionHeading>Bàn cờ và bố trí</SectionHeading>
      <div className="space-y-3">
        {data.setup.map((p) => (
          <p key={p} className="text-sm leading-relaxed text-parchment/90">
            {p}
          </p>
        ))}
      </div>

      <SectionHeading>{data.piecesTitle}</SectionHeading>
      <div className="divide-y divide-line rounded-[10px] border border-line bg-slate">
        {data.pieces.map((piece) => (
          <div key={piece.name} className="flex gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center">
              <Glyph glyph={piece.glyph} />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-base font-medium">{piece.name}</h3>
                <span className="font-[family-name:var(--font-mono)] text-xs text-muted">
                  ×{piece.count}
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {piece.rule}
              </p>
            </div>
          </div>
        ))}
      </div>

      {data.specialRules.length > 0 && (
        <>
          <SectionHeading>Luật cần nhớ</SectionHeading>
          <RuleList items={data.specialRules} />
        </>
      )}

      <SectionHeading>Kết thúc ván</SectionHeading>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[10px] border border-line bg-slate p-5">
          <h3 className="flex items-center gap-2 text-base font-medium">
            <span aria-hidden className="h-2 w-2 rounded-full bg-sage" />
            Thắng ván
          </h3>
          <ul className="mt-3 space-y-2">
            {data.winConditions.map((item) => (
              <li key={item} className="text-sm leading-relaxed text-muted">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[10px] border border-line bg-slate p-5">
          <h3 className="flex items-center gap-2 text-base font-medium">
            <span aria-hidden className="h-2 w-2 rounded-full bg-muted" />
            Hoà
          </h3>
          <ul className="mt-3 space-y-2">
            {data.drawConditions.map((item) => (
              <li key={item} className="text-sm leading-relaxed text-muted">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <SectionHeading>Đồng hồ</SectionHeading>
      <div className="space-y-3">
        {data.clock.map((p) => (
          <p key={p} className="text-sm leading-relaxed text-parchment/90">
            {p}
          </p>
        ))}
      </div>

      <SectionHeading>Chơi trên Kỳ Đài</SectionHeading>
      <RuleList items={data.uiTips} />
      <p className="mt-4 text-sm leading-relaxed text-muted">
        <span className="font-medium text-parchment/90">Ký hiệu nước đi: </span>
        {data.notation}
      </p>

      <SectionHeading>Vào bàn</SectionHeading>
      <div className="grid gap-4 md:grid-cols-3">
        {data.modes.map((mode, i) => (
          <Link
            key={mode.href}
            href={mode.href}
            className={
              i === 0
                ? "flex flex-col rounded-[10px] bg-brass p-4 text-ink transition-[filter] hover:brightness-110"
                : "flex flex-col rounded-[10px] border border-line bg-slate p-4 transition-colors hover:border-brass"
            }
          >
            <span className="text-sm font-medium">{mode.label}</span>
            <span
              className={`mt-1 text-xs ${i === 0 ? "text-ink/70" : "text-muted"}`}
            >
              {mode.note}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
