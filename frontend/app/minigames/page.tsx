import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Góc Giải Trí — Kỳ Đài",
  description:
    "Minigame giải trí trên Kỳ Đài: 2048, Dò mìn, Lật thẻ — chơi ngay không cần đăng nhập.",
};

const minigames = [
  {
    href: "/minigames/2048",
    title: "2048",
    glyph: "🎯",
    description:
      "Trượt các ô số, hợp nhất những ô giống nhau và chạm mốc 2048. Chơi bằng phím mũi tên hoặc vuốt.",
    tags: ["Một mình", "Phản xạ + tính toán"],
  },
  {
    href: "/minigames/domin",
    title: "Dò Mìn",
    glyph: "💣",
    description:
      "Mở từng ô theo gợi ý số, cắm cờ đánh dấu mìn. Ba mức từ 9×9 tới 16×30 — cú click đầu luôn an toàn.",
    tags: ["Một mình", "Suy luận"],
  },
  {
    href: "/minigames/latthe",
    title: "Lật Thẻ",
    glyph: "🎴",
    description:
      "Lật hai thẻ mỗi lượt, tìm đủ các cặp giống nhau với số lượt ít nhất. Bàn 4×4 hoặc 6×6.",
    tags: ["Một mình", "Trí nhớ"],
  },
];

export default function MinigamesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-10 max-w-2xl">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold leading-tight">
          Góc Giải Trí
        </h1>
        <p className="mt-3 text-base text-muted">
          Vài phút xả hơi giữa hai ván cờ — không cần đối thủ, không cần đăng
          nhập, kỷ lục lưu ngay trên máy bạn.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {minigames.map((mg) => (
          <Link
            key={mg.href}
            href={mg.href}
            className="group flex flex-col rounded-[10px] border border-line bg-slate p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-brass hover:shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
          >
            <div className="flex items-center gap-3">
              <span aria-hidden className="text-2xl leading-none">
                {mg.glyph}
              </span>
              <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold transition-colors group-hover:text-brass">
                {mg.title}
              </h2>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
              {mg.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {mg.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-line px-3 py-1 text-xs text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
