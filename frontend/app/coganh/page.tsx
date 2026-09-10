import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cờ Gánh | Kỳ Đài", description: "Chơi Cờ Gánh Việt Nam local hoặc đấu máy." };

export default function CoGanhPage() {
  return <div className="app-shell py-12 sm:py-16"><p className="text-xs font-bold uppercase tracking-[0.18em] text-brass">Game mới</p><h1 className="mt-4 text-5xl font-extrabold tracking-[-0.055em]">Cờ Gánh</h1><p className="mt-5 max-w-2xl leading-7 text-muted">Game dân gian Việt trên lưới 5×5: mỗi bước đi là một cơ hội gánh đôi hoặc khóa đường đối thủ.</p><div className="mt-9 grid max-w-2xl gap-3 sm:grid-cols-2"><Link href="/coganh/computer" className="rounded-[12px] border border-brass/45 bg-brass/10 p-5 transition hover:border-brass"><strong className="text-lg text-parchment">Đấu với máy</strong><span className="mt-2 block text-sm text-muted">Máy ưu tiên nước thu phục.</span></Link><Link href="/coganh/local" className="rounded-[12px] border border-line bg-slate p-5 transition hover:border-brass/50"><strong className="text-lg text-parchment">Hai người một máy</strong><span className="mt-2 block text-sm text-muted">Luân phiên Đỏ và Xanh.</span></Link></div></div>;
}
