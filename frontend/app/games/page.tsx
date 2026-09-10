import Image from "next/image";
import type { Metadata } from "next";
import GameCatalog from "@/components/home/GameCatalog";
import { GAME_DEFINITIONS } from "@/lib/games/registry";

export const metadata: Metadata = {
  title: "Kho game | Kỳ Đài",
  description: "Khám phá toàn bộ game cờ, game bài, game dân gian và game chơi nhanh trên Kỳ Đài.",
};

export default function GamesPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-14 lg:py-16">
      <section className="grid overflow-hidden rounded-[18px] border border-line bg-slate lg:grid-cols-[minmax(0,.82fr)_minmax(360px,1.18fr)]">
        <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">Kho game</p>
          <h1 className="mt-4 max-w-xl text-4xl font-extrabold leading-[.98] tracking-[-.06em] text-parchment sm:text-6xl">Một sảnh. Hai mươi cách để bắt đầu.</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted">Lọc theo nhịp chơi, tìm game hợp số người và vào thẳng bàn.</p>
        </div>
        <div className="relative min-h-[280px] border-t border-line lg:border-l lg:border-t-0">
          <Image src="/images/branding/boards-feature.webp" alt="Các bàn cờ thủ công trong một sảnh chơi" fill sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover object-center" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,28,35,.9),rgba(16,28,35,.14)_65%,rgba(16,28,35,.08))]" />
        </div>
      </section>
      <GameCatalog games={Object.values(GAME_DEFINITIONS)} />
    </div>
  );
}
