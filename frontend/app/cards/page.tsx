import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { CardsThree } from "@phosphor-icons/react/dist/ssr/CardsThree";
import { Club } from "@phosphor-icons/react/dist/ssr/Club";
import { Spade } from "@phosphor-icons/react/dist/ssr/Spade";
import { UsersThree } from "@phosphor-icons/react/dist/ssr/UsersThree";
import { Crown } from "@phosphor-icons/react/dist/ssr/Crown";

export const metadata: Metadata = {
  title: "Game Bài | Kỳ Đài",
  description: "UNO nhiều người, Xì Dách và Bài Cào trên Kỳ Đài.",
};

const games = [
  {
    href: "/cards/uno",
    title: "UNO Online",
    description: "Tạo phòng riêng cho 2, 3 hoặc 4 người. Chơi bằng mã phòng.",
    note: "Phòng online 2-4 người",
    Icon: UsersThree,
    featured: true,
  },
  {
    href: "/cards/xidach",
    title: "Xì Dách",
    description: "Luật Việt Nam với Xì Bàn, Xì Dách, Ngũ Linh và choét.",
    note: "Chơi với nhà cái",
    Icon: Spade,
    featured: false,
  },
  {
    href: "/cards/baicao",
    title: "Bài Cào",
    description: "Ba lá, tính nút nhanh và so điểm với ba đối thủ máy.",
    note: "Một người đấu ba máy",
    Icon: Club,
    featured: false,
  },
  {
    href: "/cards/tienlen",
    title: "Tiến Lên Miền Nam",
    description: "Bàn 4 người với luật chặt heo, đôi thông, tới trắng và đối thủ máy.",
    note: "Local hoặc tạo phòng online",
    Icon: Crown,
    featured: false,
  },
];

export default function CardsPage() {
  return (
    <div className="app-shell py-10 sm:py-14">
      <header className="grid overflow-hidden rounded-[18px] border border-line bg-slate lg:grid-cols-[minmax(0,.78fr)_minmax(320px,1.22fr)]">
        <div className="p-7 sm:p-9 lg:p-12">
          <span className="grid h-12 w-12 place-items-center rounded-[12px] border border-brass/35 bg-brass/10 text-brass">
            <CardsThree size={27} weight="duotone" aria-hidden />
          </span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">Bàn bài Kỳ Đài</h1>
          <p className="mt-4 max-w-xl leading-7 text-muted">Chọn một bàn, mời bạn bằng mã phòng hoặc chơi nhanh với máy.</p>
        </div>
        <div className="relative min-h-[260px] border-t border-line lg:border-l lg:border-t-0">
          <Image src="/images/branding/cards-feature.webp" alt="Bộ bài truyền thống trên mặt bàn nỉ xanh" fill sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover object-center" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,28,35,.9),rgba(16,28,35,.12)_70%,rgba(16,28,35,.08))]" />
        </div>
      </header>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {games.map(({ Icon, ...game }) => (
          <Link
            key={game.href}
            href={game.href}
            className={`group flex min-h-[220px] flex-col rounded-[14px] border p-6 transition duration-300 hover:-translate-y-0.5 active:translate-y-px sm:p-8 ${
              game.featured
                ? "border-brass/45 bg-[linear-gradient(135deg,rgba(214,174,85,.15),rgba(16,28,35,.94))] md:col-span-2"
                : "border-line bg-slate hover:border-brass/55"
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-[12px] border border-white/10 bg-ink/60 text-brass">
                <Icon size={26} weight="duotone" aria-hidden />
              </span>
              <ArrowRight
                size={22}
                className="text-muted transition group-hover:translate-x-1 group-hover:text-brass"
                aria-hidden
              />
            </div>
            <h2 className="mt-7 text-2xl font-bold tracking-[-0.03em]">{game.title}</h2>
            <p className="mt-2 max-w-xl flex-1 text-sm leading-6 text-muted">
              {game.description}
            </p>
            <span className="mt-5 text-xs font-semibold text-brass">{game.note}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
