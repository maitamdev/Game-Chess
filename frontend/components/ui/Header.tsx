"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

const NAV = [
  { href: "/chess", label: "Cờ vua", also: "/play" },
  { href: "/xiangqi", label: "Cờ tướng" },
  { href: "/caro", label: "Caro" },
  { href: "/jungle", label: "Cờ thú" },
  { href: "/oanquan", label: "Ô ăn quan" },
  { href: "/minigames", label: "Giải trí" },
  { href: "/leaderboard", label: "Xếp hạng" },
];

export default function Header() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  // đóng menu khi chuyển trang
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isActive = (item: (typeof NAV)[number]) =>
    pathname?.startsWith(item.href) ||
    (item.also !== undefined && pathname?.startsWith(item.also));

  const authBlock =
    hydrated && user ? (
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
    ) : null;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 rounded-[6px] px-1">
          <span aria-hidden className="text-lg leading-none">
            ♞
          </span>
          <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
            Kỳ Đài
          </span>
        </Link>

        {/* desktop */}
        <nav className="hidden items-center gap-5 text-sm lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-[6px] transition-colors hover:text-parchment ${
                isActive(item) ? "text-brass" : "text-muted"
              }`}
            >
              {item.label}
            </Link>
          ))}
          {authBlock}
        </nav>

        {/* mobile */}
        <div className="flex items-center gap-3 lg:hidden">
          {authBlock}
          <button
            type="button"
            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-[6px] border border-line px-2.5 py-1.5 text-sm text-parchment transition-colors hover:border-brass"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-line bg-ink px-4 py-3 lg:hidden">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-[6px] px-3 py-2 text-sm transition-colors hover:bg-slate ${
                  isActive(item) ? "text-brass" : "text-muted"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
