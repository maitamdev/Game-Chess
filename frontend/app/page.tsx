import Image from "next/image";
import Link from "next/link";

const games = [
  {
    href: "/chess",
    title: "Cờ Vua",
    glyph: "♞",
    description:
      "Bàn cờ kinh điển, engine 5 mức, phòng đấu bằng mã và đồng hồ chuẩn thi đấu.",
    modes: [
      { href: "/play/online", label: "Đấu online" },
      { href: "/play/computer", label: "Đấu với máy" },
      { href: "/play/local", label: "Hai người một máy" },
    ],
  },
  {
    href: "/xiangqi",
    title: "Cờ Tướng",
    glyph: "將",
    description:
      "Đủ luật cản mã, mắt tượng và lộ mặt tướng. Có phòng riêng cùng engine 5 mức.",
    modes: [
      { href: "/xiangqi/online", label: "Đấu online" },
      { href: "/xiangqi/computer", label: "Đấu với máy" },
      { href: "/xiangqi/local", label: "Hai người một máy" },
    ],
  },
  {
    href: "/caro",
    title: "Cờ Caro",
    glyph: "×",
    description:
      "Bàn 200×200 rộng rãi, kéo và phóng to mượt mà. Nối đủ 5 quân để chiến thắng.",
    modes: [
      { href: "/caro/online", label: "Đấu online" },
      { href: "/caro/computer", label: "Đấu với máy" },
      { href: "/caro/local", label: "Hai người một máy" },
    ],
  },
  {
    href: "/jungle",
    title: "Cờ Thú",
    glyph: "虎",
    description:
      "Tám cấp bậc, sông, bẫy và hang. Đưa quân vào hang đối phương để thắng.",
    modes: [
      { href: "/jungle/online", label: "Đấu online" },
      { href: "/jungle/computer", label: "Đấu với máy" },
      { href: "/jungle/local", label: "Hai người một máy" },
    ],
  },
  {
    href: "/oanquan",
    title: "Ô Ăn Quan",
    glyph: "田",
    description:
      "Rải sỏi quanh 10 ô dân và 2 ô quan. Tính từng nước, gom thật nhiều điểm.",
    modes: [
      { href: "/oanquan/online", label: "Đấu online" },
      { href: "/oanquan/computer", label: "Đấu với máy" },
      { href: "/oanquan/local", label: "Hai người một máy" },
    ],
  },
];

const minigames = [
  {
    href: "/cards",
    title: "Bàn Bài",
    mark: "A",
    description: "UNO online, Xì Dách và Bài Cào.",
  },
  {
    href: "/minigames/uno",
    title: "UNO Arena",
    mark: "U",
    description: "Đấu tốc độ cùng 3 đối thủ máy.",
  },
  {
    href: "/minigames/2048",
    title: "2048",
    mark: "20",
    description: "Trượt ô, hợp số, chinh phục 2048.",
  },
  {
    href: "/minigames/domin",
    title: "Dò Mìn",
    mark: "M",
    description: "Quét sạch ô mìn, tránh bẫy nổ.",
  },
  {
    href: "/minigames/latthe",
    title: "Lật Thẻ",
    mark: "L",
    description: "Tìm cặp thẻ bằng trí nhớ.",
  },
];

export default function HomePage() {
  return (
    <div className="home-page min-h-[100dvh] overflow-hidden bg-ink text-parchment">
      <section className="relative isolate min-h-[620px] border-b border-[color:var(--home-line)] lg:min-h-[calc(100dvh-64px)]">
        <Image
          src="/images/ky-dai-hero.webp"
          alt="Bàn cờ gỗ trong kỳ quán Việt về đêm"
          fill
          priority
          sizes="100vw"
          className="hero-image object-cover object-[62%_center]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#07131b_0%,rgba(7,19,27,.97)_28%,rgba(7,19,27,.58)_55%,rgba(7,19,27,.08)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,#07131b_0%,transparent_30%)]" />

        <div className="relative mx-auto flex min-h-[620px] max-w-[1440px] items-center px-5 py-16 sm:px-8 lg:min-h-[calc(100dvh-64px)] lg:px-14">
          <div className="hero-copy max-w-[650px]">
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--lacquer)]">
              Năm bàn cờ. Một kỳ đài.
            </p>
            <h1 className="max-w-[620px] font-[family-name:var(--font-display)] text-[clamp(3.5rem,7vw,7.2rem)] font-semibold leading-[0.88] tracking-[-0.055em] text-[color:var(--ivory)]">
              Đấu Trường
              <span className="block text-[color:var(--sand)]">Kỳ Đài</span>
            </h1>
            <p className="mt-7 max-w-[520px] text-base leading-7 text-[color:var(--home-muted)] sm:text-lg">
              Từ cờ vua đến ô ăn quan. Chọn bàn, tìm đối thủ và bắt đầu ván đấu của bạn.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/rooms"
                className="home-primary inline-flex min-h-12 items-center justify-center gap-3 rounded-[4px] bg-[color:var(--lacquer)] px-7 py-3 font-semibold text-[color:var(--ivory)] transition duration-300 hover:bg-[color:var(--lacquer-light)] active:translate-y-px"
              >
                Vào phòng chơi
                <span aria-hidden>↗</span>
              </Link>
              <Link
                href="/guide"
                className="inline-flex min-h-12 items-center justify-center rounded-[4px] border border-[color:var(--home-line-strong)] bg-[rgba(7,19,27,.5)] px-7 py-3 font-semibold text-[color:var(--ivory)] transition duration-300 hover:border-[color:var(--sand)] hover:bg-[rgba(19,31,38,.86)] active:translate-y-px"
              >
                Xem luật chơi
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-14 lg:py-24">
        <div className="mb-9 max-w-2xl">
          <h2 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-[-0.03em] text-[color:var(--ivory)] sm:text-5xl">
            Chọn môn thi đấu
          </h2>
          <p className="mt-3 max-w-xl leading-7 text-[color:var(--home-muted)]">
            Mỗi bàn cờ có một nhịp riêng. Tạo phòng với bạn bè hoặc luyện với máy ngay.
          </p>
        </div>

        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_350px]">
          <div className="game-list border-t border-[color:var(--home-line-strong)]">
            {games.map((game, index) => (
              <article
                key={game.href}
                className="game-row group relative grid gap-5 border-b border-[color:var(--home-line)] py-7 transition-colors duration-300 hover:bg-[color:var(--home-surface)] md:grid-cols-[64px_minmax(210px,.75fr)_minmax(270px,1.15fr)] md:items-center md:px-5"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-[4px] border border-[color:var(--home-line-strong)] bg-[color:var(--home-raised)] font-[family-name:var(--font-display)] text-2xl text-[color:var(--sand)] transition-colors group-hover:border-[color:var(--lacquer)]">
                  {game.glyph}
                </div>

                <div>
                  <Link href={game.href} className="before:absolute before:inset-0">
                    <h3 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-[-0.025em] text-[color:var(--ivory)] transition-colors group-hover:text-[color:var(--sand)]">
                      {game.title}
                    </h3>
                  </Link>
                  <p className="mt-2 max-w-[42ch] text-sm leading-6 text-[color:var(--home-muted)]">
                    {game.description}
                  </p>
                </div>

                <div className="relative z-[1] flex flex-wrap gap-x-5 gap-y-2 md:justify-end">
                  {game.modes.map((mode, modeIndex) => (
                    <Link
                      key={mode.href}
                      href={mode.href}
                      className={`border-b py-1 text-sm font-medium transition-colors ${
                        modeIndex === 0
                          ? "border-[color:var(--lacquer)] text-[color:var(--sand)] hover:text-[color:var(--ivory)]"
                          : "border-transparent text-[color:var(--home-muted)] hover:border-[color:var(--home-line-strong)] hover:text-[color:var(--ivory)]"
                      }`}
                    >
                      {mode.label}
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <aside className="minigames-panel overflow-hidden rounded-[4px] border border-[color:var(--home-line-strong)] bg-[color:var(--home-raised)] p-5 lg:p-6 xl:sticky xl:top-24">
            <div className="flex items-end justify-between border-b border-[color:var(--home-line)] pb-5">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[color:var(--ivory)]">
                  Góc giải trí
                </h2>
                <p className="mt-1 text-sm text-[color:var(--home-muted)]">
                  Đổi nhịp giữa các ván cờ.
                </p>
              </div>
              <span className="font-[family-name:var(--font-display)] text-3xl text-[color:var(--lacquer)]" aria-hidden>
                棋
              </span>
            </div>

            <div className="mt-3">
              {minigames.map((game) => (
                <Link
                  key={game.href}
                  href={game.href}
                  className="group flex items-center gap-4 border-b border-[color:var(--home-line)] py-5 transition-transform duration-300 hover:translate-x-1"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[4px] border border-[color:var(--home-line-strong)] bg-[color:var(--home-surface)] font-[family-name:var(--font-mono)] text-sm font-semibold text-[color:var(--sand)]">
                    {game.mark}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-[color:var(--ivory)]">
                      {game.title}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-[color:var(--home-muted)]">
                      {game.description}
                    </span>
                  </span>
                  <span className="text-[color:var(--lacquer)] transition-transform group-hover:translate-x-1" aria-hidden>
                    →
                  </span>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </section>

    </div>
  );
}
