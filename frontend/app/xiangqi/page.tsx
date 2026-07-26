import Link from "next/link";

const modes = [
  {
    href: "/xiangqi/online",
    title: "Đấu online",
    glyph: "將",
    description:
      "Ghép cặp tự động theo Elo cờ tướng riêng. Đồng hồ phía máy chủ, xếp hạng.",
    note: "Cần đăng nhập",
  },
  {
    href: "/xiangqi/computer",
    title: "Đấu với máy",
    glyph: "砲",
    description: "Engine cờ tướng chạy trong trình duyệt với 5 mức độ.",
    note: "Không cần đăng nhập",
  },
  {
    href: "/xiangqi/local",
    title: "Hai người một máy",
    glyph: "馬",
    description:
      "Thay phiên nhau trên cùng thiết bị, bàn cờ tự xoay về phía người đang đi.",
    note: "Không cần mạng",
  },
];

export default function XiangqiHubPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-12 max-w-2xl">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold leading-tight">
          Cờ Tướng
        </h1>
        <p className="mt-3 text-base text-muted">
          Xe pháo mã qua sông — bàn cờ 9×10 với đầy đủ luật cản mã, mắt tượng,
          lộ mặt tướng.
        </p>
        <Link
          href="/xiangqi/guide"
          className="mt-4 inline-block rounded-[6px] text-sm text-brass transition-[filter] hover:brightness-110"
        >
          Chưa rành luật? Xem hướng dẫn chơi →
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {modes.map((mode) => (
          <Link
            key={mode.href}
            href={mode.href}
            className="group flex flex-col rounded-[10px] border border-line bg-slate p-6 transition-colors hover:border-brass"
          >
            <span
              aria-hidden
              className="text-2xl leading-none text-brass transition-transform duration-200 group-hover:-translate-y-0.5"
              style={{ fontFamily: '"Noto Serif SC", "SimSun", serif' }}
            >
              {mode.glyph}
            </span>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-lg font-medium">
              {mode.title}
            </h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
              {mode.description}
            </p>
            <span className="mt-4 text-xs text-muted">{mode.note}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
