import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import { CardsThree } from "@phosphor-icons/react/dist/ssr/CardsThree";
import { CastleTurret } from "@phosphor-icons/react/dist/ssr/CastleTurret";
import { GridFour } from "@phosphor-icons/react/dist/ssr/GridFour";
import { Lightning } from "@phosphor-icons/react/dist/ssr/Lightning";
import { Trophy } from "@phosphor-icons/react/dist/ssr/Trophy";
import { UsersThree } from "@phosphor-icons/react/dist/ssr/UsersThree";
import { FlagBanner } from "@phosphor-icons/react/dist/ssr/FlagBanner";
import GameCatalog from "@/components/home/GameCatalog";
import HomeReveal from "@/components/home/HomeReveal";
import { GAME_DEFINITIONS } from "@/lib/games/registry";

export const metadata: Metadata = {
  title: "Kỳ Đài | Chọn bàn. Tìm đối. Chơi thật.",
  description:
    "Kỳ Đài là game hub Việt Nam cho cờ, game bài, game dân gian và những ván chơi nhanh.",
};

const stories = [
  {
    href: "/chess",
    title: "Bàn cờ chiến thuật",
    description: "Cờ vua, cờ tướng, cờ thú và những ván đấu cần một nước đi chuẩn.",
    image: "/images/branding/boards-feature.webp",
    imageAlt: "Nhiều bàn cờ thủ công trên bàn gỗ tối",
    icon: CastleTurret,
    tone: "wide",
  },
  {
    href: "/cards",
    title: "Game bài cùng bạn",
    description: "UNO, Tiến Lên, Xì Dách và Bài Cào trong cùng một sảnh.",
    image: "/images/branding/cards-feature.webp",
    imageAlt: "Bộ bài truyền thống trên mặt nỉ xanh",
    icon: CardsThree,
    tone: "standard",
  },
  {
    href: "/minigames",
    title: "Chơi nhanh một ván",
    description: "2048, Dò Mìn, Lật Thẻ và những game ngắn để đổi nhịp.",
    image: "/images/branding/quick-games-feature.webp",
    imageAlt: "Bàn game nhanh với xúc xắc và các ô màu",
    icon: GridFour,
    tone: "standard",
  },
] as const;

export default function HomePage() {
  return (
    <div className="ky-home min-h-[100dvh] overflow-hidden bg-ink text-parchment">
      <section className="relative isolate min-h-[calc(100dvh-64px)] overflow-hidden border-b border-line">
        <Image
          src="/images/branding/ky-dai-hero-v2.webp"
          alt="Bàn cờ trong một sảnh chơi Việt Nam lúc chạng vạng"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#071117_0%,rgba(7,17,23,.98)_26%,rgba(7,17,23,.72)_48%,rgba(7,17,23,.12)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,#071117_0%,transparent_42%)]" />

        <div className="relative mx-auto grid min-h-[calc(100dvh-64px)] max-w-[1440px] items-center gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,.82fr)_minmax(360px,1.18fr)] lg:px-14 lg:py-20">
          <HomeReveal className="max-w-[590px]">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">
              Game hub Việt Nam
            </p>
            <h1 className="mt-5 max-w-[11ch] text-[clamp(3.4rem,6vw,6rem)] font-extrabold leading-[0.92] tracking-[-0.07em] text-[#f6f1e7]">
              Chọn bàn. <span className="text-brass">Chơi thật.</span>
            </h1>
            <p className="mt-7 max-w-[430px] text-base leading-7 text-[#c0cbd0] sm:text-lg">
              Tìm đối thủ, mời bạn bè và bắt đầu một ván vừa sức.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/matchmaking"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] border border-brass bg-brass px-6 py-3 text-sm font-bold text-ink shadow-[0_12px_32px_rgba(214,174,85,.18)] transition hover:bg-[#e4bf6b] active:translate-y-px"
              >
                Tìm trận
                <ArrowUpRight size={18} weight="bold" aria-hidden />
              </Link>
              <Link
                href="/games"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] border border-white/20 bg-ink/45 px-6 py-3 text-sm font-bold text-parchment backdrop-blur-sm transition hover:border-brass/70 hover:text-brass active:translate-y-px"
              >
                Xem game
                <ArrowRight size={18} weight="bold" aria-hidden />
              </Link>
            </div>
          </HomeReveal>

          <HomeReveal className="hidden lg:block" delay={0.12}>
            <div className="ml-auto max-w-[660px] rounded-[18px] border border-white/15 bg-ink/25 p-3 shadow-[0_30px_90px_rgba(2,8,12,.38)] backdrop-blur-[2px]">
              <div className="overflow-hidden rounded-[12px] border border-white/10 bg-slate/60">
                <Image
                  src="/images/branding/boards-feature.webp"
                  alt="Bàn cờ và quân cờ thủ công trong sảnh chơi"
                  width={1536}
                  height={1024}
                  sizes="(min-width: 1280px) 48vw, 60vw"
                  className="aspect-[1.35] w-full object-cover transition duration-700 hover:scale-[1.025]"
                />
              </div>
              <div className="flex items-center justify-between gap-4 px-2 pb-1 pt-4 text-sm">
                <span className="text-muted">Một sảnh cho nhiều nhịp chơi</span>
                <Link href="/rooms" className="font-semibold text-brass hover:text-[#f1d18a]">
                  Vào phòng <span aria-hidden>↗</span>
                </Link>
              </div>
            </div>
          </HomeReveal>
        </div>
      </section>

      <section className="border-b border-line bg-[#0a171d]">
        <div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1.15fr_.85fr] lg:px-14 lg:py-10">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] border border-brass/35 bg-brass/10 text-brass">
              <Lightning size={21} weight="duotone" aria-hidden />
            </span>
            <div>
              <p className="font-semibold text-parchment">Muốn chơi ngay?</p>
              <p className="mt-1 max-w-xl text-sm leading-6 text-muted">
                Tạo phòng riêng, nhập mã bạn bè hoặc để hệ thống tìm một đối thủ vừa sức.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 lg:justify-end">
            <Link href="/rooms" className="inline-flex items-center gap-2 text-sm font-bold text-brass hover:text-[#f1d18a]">
              Phòng chơi <ArrowRight size={17} weight="bold" aria-hidden />
            </Link>
            <Link href="/leaderboard" className="inline-flex items-center gap-2 text-sm font-bold text-parchment hover:text-brass">
              Bảng xếp hạng <Trophy size={17} weight="duotone" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-14 lg:py-28">
        <HomeReveal className="max-w-2xl">
          <h2 className="text-4xl font-extrabold tracking-[-0.055em] text-[#f6f1e7] sm:text-6xl">
            Mỗi mood một bàn.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted">
            Tập trung, cạnh tranh hoặc chỉ cần vài phút giải trí. Chọn nhịp chơi hợp với bạn.
          </p>
        </HomeReveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-[1.18fr_.82fr]">
          <HomeReveal className="group rounded-[18px] border border-line bg-slate/65 p-3 transition hover:border-brass/50" delay={0.06}>
            <Link href={stories[0].href} className="block">
              <div className="overflow-hidden rounded-[12px]">
                <Image
                  src={stories[0].image}
                  alt={stories[0].imageAlt}
                  width={1536}
                  height={1024}
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  className="aspect-[1.5] w-full object-cover transition duration-700 group-hover:scale-[1.035]"
                />
              </div>
              <div className="flex items-start justify-between gap-5 px-2 pb-2 pt-6">
                <div>
                  <span className="inline-flex items-center gap-2 text-brass">
                    <CastleTurret size={18} weight="duotone" aria-hidden />
                    <span className="font-mono text-[11px] uppercase tracking-[0.14em]">Bàn cờ</span>
                  </span>
                  <h3 className="mt-3 text-2xl font-bold tracking-[-0.035em] text-parchment sm:text-3xl">{stories[0].title}</h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{stories[0].description}</p>
                </div>
                <ArrowUpRight size={24} weight="bold" aria-hidden className="mt-1 shrink-0 text-muted transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-brass" />
              </div>
            </Link>
          </HomeReveal>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            {stories.slice(1).map((story, index) => {
              const Icon = story.icon;
              return (
                <HomeReveal key={story.href} className="group rounded-[18px] border border-line bg-slate/65 p-3 transition hover:border-brass/50" delay={0.12 + index * 0.06}>
                  <Link href={story.href} className="block">
                    <div className="overflow-hidden rounded-[12px]">
                      <Image
                        src={story.image}
                        alt={story.imageAlt}
                        width={1536}
                        height={1024}
                        sizes="(min-width: 1024px) 34vw, 50vw"
                        className="aspect-[2.1] w-full object-cover transition duration-700 group-hover:scale-[1.035] lg:aspect-[2.35]"
                      />
                    </div>
                    <div className="flex items-start justify-between gap-4 px-2 pb-2 pt-5">
                      <div>
                        <span className="inline-flex items-center gap-2 text-brass">
                          <Icon size={17} weight="duotone" aria-hidden />
                          <span className="font-mono text-[11px] uppercase tracking-[0.14em]">{index === 0 ? "Game bài" : "Chơi nhanh"}</span>
                        </span>
                        <h3 className="mt-2 text-xl font-bold tracking-[-0.03em] text-parchment">{story.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-muted">{story.description}</p>
                      </div>
                      <ArrowUpRight size={21} weight="bold" aria-hidden className="mt-1 shrink-0 text-muted transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-brass" />
                    </div>
                  </Link>
                </HomeReveal>
              );
            })}
          </div>
        </div>
      </section>

      <section id="games" className="border-y border-line bg-[#0a171d]">
        <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-14 lg:py-28">
          <HomeReveal className="max-w-2xl">
            <h2 className="text-4xl font-extrabold tracking-[-0.055em] text-[#f6f1e7] sm:text-6xl">Chơi gì hôm nay?</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted">
              Tìm đúng game theo thể loại, số người hoặc cách bạn muốn chơi.
            </p>
          </HomeReveal>
          <HomeReveal delay={0.08}>
            <GameCatalog games={Object.values(GAME_DEFINITIONS)} />
          </HomeReveal>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-14 lg:py-28">
        <HomeReveal className="grid overflow-hidden rounded-[18px] border border-brass/35 bg-[linear-gradient(120deg,rgba(214,174,85,.13),rgba(16,28,35,.7)_46%,rgba(7,17,23,.96))] lg:grid-cols-[minmax(0,.88fr)_minmax(360px,1.12fr)]">
          <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
            <span className="inline-flex w-fit items-center gap-2 text-brass">
              <UsersThree size={19} weight="duotone" aria-hidden />
              <span className="font-mono text-[11px] uppercase tracking-[0.15em]">Chơi cùng người thật</span>
            </span>
            <h2 className="mt-5 max-w-lg text-3xl font-extrabold tracking-[-0.045em] text-[#f6f1e7] sm:text-5xl">Bàn chơi luôn có chỗ cho bạn.</h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-muted">Tạo phòng riêng hoặc vào hàng chờ để gặp đối thủ phù hợp với nhịp chơi của bạn.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/rooms" className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-brass bg-brass px-5 py-2.5 text-sm font-bold text-ink transition hover:bg-[#e4bf6b] active:translate-y-px">Mở phòng <ArrowUpRight size={17} weight="bold" aria-hidden /></Link>
              <Link href="/matchmaking" className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-line bg-ink/40 px-5 py-2.5 text-sm font-bold text-parchment transition hover:border-brass/65 hover:text-brass active:translate-y-px">Tìm đối thủ <ArrowRight size={17} weight="bold" aria-hidden /></Link>
            </div>
          </div>
          <div className="relative min-h-[260px] overflow-hidden border-t border-line lg:border-l lg:border-t-0">
            <Image src="/images/branding/ky-dai-hero-v2.webp" alt="Không gian chơi cờ trong Kỳ Đài" fill sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover object-[68%_center] opacity-85 transition duration-700 hover:scale-[1.025]" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,#0c1a20_0%,rgba(12,26,32,.18)_55%,rgba(12,26,32,.05)_100%)] lg:bg-[linear-gradient(90deg,#0c1a20_0%,rgba(12,26,32,.15)_48%,rgba(12,26,32,.05)_100%)]" />
          </div>
        </HomeReveal>
      </section>

      <section className="border-y border-line bg-[#0a171d]">
        <div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.82fr)] lg:px-14 lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 text-brass"><FlagBanner size={19} weight="duotone" aria-hidden /><span className="font-mono text-[11px] uppercase tracking-[0.16em]">Mùa Khai Bàn</span></span>
            <h2 className="mt-4 max-w-xl text-3xl font-extrabold tracking-[-0.045em] text-[#f6f1e7] sm:text-5xl">Không chỉ chơi một ván. Xây tên tuổi qua cả mùa.</h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted">Tham gia giải Reversi, Connect Four và các game chiến thuật mới để tích điểm, săn achievement và leo bảng chung.</p>
            <Link href="/tournaments" className="mt-6 inline-flex items-center gap-2 rounded-[10px] border border-brass bg-brass px-5 py-2.5 text-sm font-bold text-ink transition hover:bg-[#e4bf6b]">Xem lịch giải <ArrowRight size={17} weight="bold" aria-hidden /></Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {["Giải theo game", "Bảng điểm theo mùa", "Achievement có tiến độ"].map((text, index) => <div key={text} className="rounded-[12px] border border-line bg-slate/60 p-4"><span className="font-mono text-xs text-brass">0{index + 1}</span><p className="mt-2 font-semibold text-parchment">{text}</p></div>)}
          </div>
        </div>
      </section>

      <footer className="border-t border-line bg-ink">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 py-8 text-sm text-muted sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-14">
          <div className="flex items-center gap-3 text-parchment">
            <span className="grid h-8 w-8 place-items-center rounded-[9px] border border-brass/35 bg-brass/10 text-brass"><CastleTurret size={17} weight="duotone" aria-hidden /></span>
            <span className="font-bold">Kỳ Đài</span>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/guide" className="hover:text-brass">Luật chơi</Link>
            <Link href="/leaderboard" className="hover:text-brass">Bảng xếp hạng</Link>
            <Link href="/account" className="hover:text-brass">Hồ sơ</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
