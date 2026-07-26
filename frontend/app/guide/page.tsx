import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Hướng dẫn chơi — Kỳ Đài",
  description:
    "Luật chơi và hướng dẫn thao tác cho cờ vua, cờ tướng, cờ caro và cờ thú trên Kỳ Đài.",
};

const guides = [
  {
    href: "/chess/guide",
    title: "Cờ Vua",
    glyph: "♞",
    serif: false,
    description:
      "Cách đi 6 loại quân, nhập thành, bắt tốt qua đường, phong cấp — và các kết cục thắng, hoà.",
  },
  {
    href: "/xiangqi/guide",
    title: "Cờ Tướng",
    glyph: "將",
    serif: true,
    description:
      "Bàn 9×10 với sông và cung tướng: cản mã, mắt tượng, lộ mặt tướng, chiếu dai và luật hết nước đi.",
  },
  {
    href: "/caro/guide",
    title: "Cờ Caro",
    glyph: "✕",
    serif: false,
    description:
      "Bàn 200×200 giao điểm, nối đủ 5 quân liên tiếp là thắng — cùng mẹo pan, zoom trên bàn cờ lớn.",
  },
  {
    href: "/jungle/guide",
    title: "Cờ Thú",
    glyph: "🦁",
    serif: false,
    description:
      "Cấp bậc 8 con thú, Chuột ăn Voi, nhảy sông, bẫy và hang — luật đầy đủ của rừng xanh.",
  },
];

export default function GuideIndexPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-12 max-w-2xl">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold leading-tight">
          Hướng dẫn chơi
        </h1>
        <p className="mt-3 text-base text-muted">
          Chưa rành luật? Mỗi game có một trang hướng dẫn đầy đủ: cách đi quân,
          luật đặc biệt, kết cục ván đấu và thao tác trên bàn cờ.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {guides.map((guide) => (
          <Link
            key={guide.href}
            href={guide.href}
            className="group flex flex-col rounded-[10px] border border-line bg-slate p-6 transition-colors hover:border-brass"
          >
            <span
              aria-hidden
              className="text-2xl leading-none text-brass transition-transform duration-200 group-hover:-translate-y-0.5"
              style={
                guide.serif
                  ? { fontFamily: '"Noto Serif SC", "SimSun", serif' }
                  : undefined
              }
            >
              {guide.glyph}
            </span>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-lg font-medium">
              {guide.title}
            </h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
              {guide.description}
            </p>
            <span className="mt-4 text-xs text-brass">Xem hướng dẫn →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
