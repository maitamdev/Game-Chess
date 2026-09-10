import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dots & Boxes | Kỳ Đài", description: "Kẻ cạnh, ăn ô và đấu máy trong Dots & Boxes trên Kỳ Đài." };

export default function DotsPage() {
  return <div className="app-shell py-12 sm:py-16"><p className="text-xs font-bold uppercase tracking-[0.18em] text-brass">Chơi nhanh</p><h1 className="mt-4 text-5xl font-extrabold tracking-[-0.055em]">Dots &amp; Boxes</h1><p className="mt-5 max-w-2xl leading-7 text-muted">Mỗi cạnh đều có giá. Khép được ô thì được điểm và đi tiếp, nhưng để lộ cơ hội là mất cả chuỗi.</p><div className="mt-9 grid max-w-2xl gap-3 sm:grid-cols-2"><Link href="/dots/online" className="rounded-[12px] border border-brass/45 bg-brass/10 p-5 transition hover:border-brass sm:col-span-2"><strong className="text-lg text-parchment">Đấu online</strong><span className="mt-2 block text-sm text-muted">Tạo phòng, săn điểm và giữ lượt cùng bạn bè.</span></Link><Link href="/dots/computer" className="rounded-[12px] border border-brass/45 bg-brass/10 p-5 transition hover:border-brass"><strong className="text-lg text-parchment">Đấu với máy</strong><span className="mt-2 block text-sm text-muted">Máy ưu tiên các nước tạo điểm.</span></Link><Link href="/dots/local" className="rounded-[12px] border border-line bg-slate p-5 transition hover:border-brass/50"><strong className="text-lg text-parchment">Hai người một máy</strong><span className="mt-2 block text-sm text-muted">Chọn cạnh và giành quyền đi tiếp.</span></Link></div></div>;
}
