"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { getGameSocket } from "@/lib/ws";

const NAV = [
  { href: "/chess", label: "Cờ vua", also: "/play" },
  { href: "/xiangqi", label: "Cờ tướng" },
  { href: "/caro", label: "Caro" },
  { href: "/jungle", label: "Cờ thú" },
  { href: "/oanquan", label: "Ô ăn quan" },
  { href: "/leaderboard", label: "Xếp hạng" },
];

export default function Header() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 rounded-[6px] px-1">
          <span aria-hidden className="text-lg leading-none">
            ♞
          </span>
          <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
            Kỳ Đài
          </span>
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-[6px] transition-colors hover:text-parchment ${
                pathname?.startsWith(item.href) ||
                (item.also && pathname?.startsWith(item.also))
                  ? "text-brass"
                  : "text-muted"
              }`}
            >
              {item.label}
            </Link>
          ))}
          {hydrated && user ? (
            <span className="flex items-center gap-3">
              <Link
                href={`/u/${user.username}`}
                className="rounded-[6px] text-parchment transition-colors hover:text-brass"
              >
                {user.username}
                <span className="ml-1 font-[family-name:var(--font-mono)] text-xs text-muted">
                  {user.elo}
                </span>
              </Link>
              <button
                type="button"
                className="rounded-[6px] text-xs text-muted transition-colors hover:text-rust"
                onClick={() => {
                  getGameSocket().close();
                  useAuthStore.getState().logout();
                  router.push("/");
                }}
              >
                Đăng xuất
              </button>
            </span>
          ) : hydrated ? (
            <span className="flex items-center gap-3">
              <Link
                href="/login"
                className="rounded-[6px] text-muted transition-colors hover:text-parchment"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="rounded-[6px] bg-brass px-3 py-1.5 text-sm font-medium text-ink transition-[filter] hover:brightness-110"
              >
                Đăng ký
              </Link>
            </span>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
