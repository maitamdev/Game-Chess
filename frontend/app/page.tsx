import Link from "next/link";
import MiniLeaderboard from "@/components/ui/MiniLeaderboard";

const games = [
  {
    href: "/chess",
    guide: "/chess/guide",
    title: "Cờ Vua",
    glyph: "♞",
    serif: false,
    description:
      "Bàn cờ gỗ hoàng dương và óc chó. Engine 5 mức, đấu xếp hạng Elo, premove và đồng hồ chuẩn thi đấu.",
    modes: [
      { href: "/play/online", label: "Đấu online" },
      { href: "/play/computer", label: "Đấu với máy" },
      { href: "/play/local", label: "Hai người một máy" },
    ],
  },
  {
    href: "/xiangqi",
    guide: "/xiangqi/guide",
    title: "Cờ Tướng",
    glyph: "將",
    serif: true,
    description:
      "Xe pháo mã qua sông — đủ luật cản mã, mắt tượng, lộ mặt tướng. Elo cờ tướng riêng, engine 5 mức.",
    modes: [
      { href: "/xiangqi/online", label: "Đấu online" },
      { href: "/xiangqi/computer", label: "Đấu với máy" },
      { href: "/xiangqi/local", label: "Hai người một máy" },
    ],
  },
  {
    href: "/caro",
    guide: "/caro/guide",
    title: "Cờ Caro",
    glyph: "✕",
    serif: false,
    description:
      "Bàn 200×200 mênh mông như caro giấy — nối đủ 5 quân là thắng. Kéo di chuyển, phóng to thu nhỏ, AI 5 mức.",
    modes: [
      { href: "/caro/online", label: "Đấu online" },
      { href: "/caro/computer", label: "Đấu với máy" },
      { href: "/caro/local", label: "Hai người một máy" },
    ],
  },
  {
    href: "/jungle",
    guide: "/jungle/guide",
    title: "Cờ Thú",
    glyph: "🦁",
    serif: false,
    description:
      "Voi sợ Chuột, Sư tử nhảy sông, bẫy quanh hang — đưa một con thú vào hang đối phương là thắng.",
    modes: [
      { href: "/jungle/online", label: "Đấu online" },
      { href: "/jungle/computer", label: "Đấu với máy" },
      { href: "/jungle/local", label: "Hai người một máy" },
    ],
  },
  {
    href: "/oanquan",
    guide: "/oanquan/guide",
    title: "Ô Ăn Quan",
    glyph: "🌾",
    serif: false,
    description:
      "Rải sỏi quanh 10 ô dân và 2 ô quan — ăn cách ô, vay nợ rải lại, hết quan tàn dân đếm điểm.",
    modes: [
      { href: "/oanquan/online", label: "Đấu online" },
      { href: "/oanquan/computer", label: "Đấu với máy" },
      { href: "/oanquan/local", label: "Hai người một máy" },
    ],
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-12 max-w-2xl">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold leading-tight">
          Phòng đấu đã lên đèn.
        </h1>
        <p className="mt-3 text-base text-muted">
          Chọn bàn cờ của bạn — cờ vua hay cờ tướng — và ngồi vào. Một đồng hồ
          đang chờ được bấm.
        </p>
        <Link
          href="/guide"
          className="mt-4 inline-block rounded-[6px] text-sm text-brass transition-[filter] hover:brightness-110"
        >
          Mới chơi? Xem hướng dẫn từng game →
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {games.map((game) => (
          <div
            key={game.href}
            className="group flex flex-col rounded-[10px] border border-line bg-slate p-6 transition-colors hover:border-brass"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="text-2xl leading-none text-brass"
                style={
                  game.serif
                    ? { fontFamily: '"Noto Serif SC", "SimSun", serif' }
                    : undefined
                }
              >
                {game.glyph}
              </span>
              <Link href={game.href} className="rounded-[6px]">
                <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold transition-colors group-hover:text-brass">
                  {game.title}
                </h2>
              </Link>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
              {game.description}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {game.modes.map((mode, i) => (
                <Link
                  key={mode.href}
                  href={mode.href}
                  className={
                    i === 0
                      ? "rounded-[6px] bg-brass px-4 py-2 text-sm font-medium text-ink transition-[filter] hover:brightness-110"
                      : "rounded-[6px] border border-line px-4 py-2 text-sm text-parchment transition-colors hover:border-brass hover:text-brass"
                  }
                >
                  {mode.label}
                </Link>
              ))}
              <Link
                href={game.guide}
                className="rounded-[6px] px-1 py-2 text-sm text-muted transition-colors hover:text-brass"
              >
                Luật chơi →
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MiniLeaderboard variant="chess" title="Xếp hạng cờ vua" />
        <MiniLeaderboard variant="xiangqi" title="Xếp hạng cờ tướng" />
        <MiniLeaderboard variant="caro" title="Xếp hạng caro" />
        <MiniLeaderboard variant="jungle" title="Xếp hạng cờ thú" />
        <MiniLeaderboard variant="oanquan" title="Xếp hạng ô ăn quan" />
      </div>
    </div>
  );
}
