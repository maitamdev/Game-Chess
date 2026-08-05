import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { Bomb } from "@phosphor-icons/react/dist/ssr/Bomb";
import { Cards } from "@phosphor-icons/react/dist/ssr/Cards";
import { Hash } from "@phosphor-icons/react/dist/ssr/Hash";
import { SquaresFour } from "@phosphor-icons/react/dist/ssr/SquaresFour";

export const metadata: Metadata = {
  title: "Góc Giải Trí | Kỳ Đài",
  description: "UNO, 2048, Dò Mìn và Lật Thẻ. Mở trình duyệt là chơi ngay.",
};

const minigames = [
  {
    href: "/minigames/uno",
    title: "UNO Arena",
    description: "Đấu tốc độ với ba đối thủ máy, đầy đủ lá hành động và đổi màu.",
    note: "Một người đấu ba máy",
    Icon: Cards,
    featured: true,
  },
  {
    href: "/minigames/2048",
    title: "2048",
    description: "Trượt ô, ghép số và chinh phục cột mốc 2048.",
    note: "Phản xạ và tính toán",
    Icon: Hash,
    featured: false,
  },
  {
    href: "/minigames/domin",
    title: "Dò Mìn",
    description: "Đọc gợi ý số, đánh dấu mìn và mở sạch bàn chơi.",
    note: "Ba cấp độ",
    Icon: Bomb,
    featured: false,
  },
  {
    href: "/minigames/latthe",
    title: "Lật Thẻ",
    description: "Ghi nhớ vị trí và tìm đủ cặp với số lượt ít nhất.",
    note: "Bàn 4 × 4 hoặc 6 × 6",
    Icon: SquaresFour,
    featured: false,
  },
];

export default function MinigamesPage() {
  return (
    <div className="app-shell py-10 sm:py-14">
      <header className="max-w-2xl">
        <h1 className="text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">
          Góc giải trí
        </h1>
        <p className="mt-4 max-w-xl leading-7 text-muted">
          Những ván ngắn để đổi nhịp, mở trình duyệt là chơi và luôn sẵn sàng.
        </p>
      </header>

      <div className="mt-9 grid gap-4 md:grid-cols-2">
        {minigames.map(({ Icon, ...game }) => (
          <Link
            key={game.href}
            href={game.href}
            className={`group flex min-h-[210px] flex-col rounded-[14px] border p-6 transition duration-300 hover:-translate-y-0.5 active:translate-y-px sm:p-7 ${
              game.featured
                ? "border-brass/45 bg-[linear-gradient(135deg,rgba(214,174,85,.14),rgba(16,28,35,.94))] md:col-span-2"
                : "border-line bg-slate hover:border-brass/55"
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-[12px] border border-white/10 bg-ink/55 text-brass">
                <Icon size={26} weight="duotone" aria-hidden />
              </span>
              <ArrowRight
                size={22}
                className="text-muted transition group-hover:translate-x-1 group-hover:text-brass"
                aria-hidden
              />
            </div>
            <h2 className="mt-7 text-xl font-bold tracking-[-0.025em]">{game.title}</h2>
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
