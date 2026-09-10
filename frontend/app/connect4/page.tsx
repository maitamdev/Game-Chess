import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connect Four | Kỳ Đài",
  description: "Chơi Connect Four local hoặc đấu máy.",
};

export default function Connect4LandingPage() {
  return (
    <div className="app-shell py-12 sm:py-16">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-brass">Game mới</p>
      <h1 className="mt-4 text-5xl font-extrabold tracking-[-0.055em]">Connect Four</h1>
      <p className="mt-5 max-w-2xl leading-7 text-muted">Tạo chuỗi bốn quân trước đối thủ bằng cách kiểm soát cột trung tâm và những đường chéo kín.</p>
      <div className="mt-9 grid max-w-2xl gap-3 sm:grid-cols-2">
        <Link href="/connect4/online" className="rounded-[12px] border border-brass/45 bg-brass/10 p-5 transition hover:border-brass sm:col-span-2">
          <strong className="text-lg text-parchment">Đấu online</strong>
          <span className="mt-2 block text-sm text-muted">Tạo phòng, mời bạn bè và chơi với trọng tài server.</span>
        </Link>
        <Link href="/connect4/computer" className="rounded-[12px] border border-brass/45 bg-brass/10 p-5 transition hover:border-brass">
          <strong className="text-lg text-parchment">Đấu với máy</strong>
          <span className="mt-2 block text-sm text-muted">Máy ưu tiên cột trung tâm.</span>
        </Link>
        <Link href="/connect4/local" className="rounded-[12px] border border-line bg-slate p-5 transition hover:border-brass/50">
          <strong className="text-lg text-parchment">Hai người một máy</strong>
          <span className="mt-2 block text-sm text-muted">Đỏ và Vàng luân phiên thả quân.</span>
        </Link>
      </div>
    </div>
  );
}
