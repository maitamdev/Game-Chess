import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cờ Đam | Kỳ Đài", description: "Chơi Cờ Đam 8×8 local hoặc đấu máy trên Kỳ Đài." };

export default function DraughtsPage() {
  return <div className="app-shell py-12 sm:py-16"><p className="text-xs font-bold uppercase tracking-[0.18em] text-brass">Game mới</p><h1 className="mt-4 text-5xl font-extrabold tracking-[-0.055em]">Cờ Đam 8×8</h1><p className="mt-5 max-w-2xl leading-7 text-muted">Luật bắt buộc ăn, ăn liên hoàn và phong vua. Một game dễ vào nhưng khó đọc hết thế.</p><div className="mt-9 grid max-w-2xl gap-3 sm:grid-cols-2"><Link href="/draughts/online" className="rounded-[12px] border border-brass/45 bg-brass/10 p-5 transition hover:border-brass sm:col-span-2"><strong className="text-lg text-parchment">Đấu online</strong><span className="mt-2 block text-sm text-muted">Tạo phòng và để server xử lý ăn liên hoàn.</span></Link><Link href="/draughts/computer" className="rounded-[12px] border border-brass/45 bg-brass/10 p-5 transition hover:border-brass"><strong className="text-lg text-parchment">Đấu với máy</strong><span className="mt-2 block text-sm text-muted">Máy ưu tiên nước bắt và phong vua.</span></Link><Link href="/draughts/local" className="rounded-[12px] border border-line bg-slate p-5 transition hover:border-brass/50"><strong className="text-lg text-parchment">Hai người một máy</strong><span className="mt-2 block text-sm text-muted">Luân phiên Đỏ và Đen trên cùng thiết bị.</span></Link></div></div>;
}
