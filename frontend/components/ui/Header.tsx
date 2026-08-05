"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CardsThree } from "@phosphor-icons/react/CardsThree";
import { CastleTurret } from "@phosphor-icons/react/CastleTurret";
import { CrownSimple } from "@phosphor-icons/react/CrownSimple";
import { GridFour } from "@phosphor-icons/react/GridFour";
import { List } from "@phosphor-icons/react/List";
import { UsersThree } from "@phosphor-icons/react/UsersThree";
import { X } from "@phosphor-icons/react/X";

const NAV = [
  { href: "/chess", label: "Cờ vua", also: "/play" },
  { href: "/xiangqi", label: "Cờ tướng" },
  { href: "/caro", label: "Caro" },
  { href: "/jungle", label: "Cờ thú" },
  { href: "/oanquan", label: "Ô ăn quan" },
  { href: "/cards", label: "Game bài", icon: CardsThree },
  { href: "/rooms", label: "Phòng chơi", icon: UsersThree },
  { href: "/minigames", label: "Giải trí", icon: GridFour },
];

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isActive = (item: (typeof NAV)[number]) =>
    pathname?.startsWith(item.href) ||
    (item.also !== undefined && pathname?.startsWith(item.also));

  if (pathname?.startsWith("/cards/xidach")) {
    return (
      <header className="xi-dach-header sticky top-0 z-40 border-b border-[#8f7344]/35 bg-[#05090c]/95 shadow-[0_12px_36px_rgba(0,0,0,.34)] backdrop-blur-xl">
        <div className="relative mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-7 lg:px-10">
          <Link href="/" className="group flex items-center gap-3 rounded-[8px]">
            <span className="grid h-9 w-9 place-items-center rounded-[10px] border border-[#b59254]/45 bg-[#b59254]/10 text-[#d6b676]">
              <CastleTurret size={21} weight="duotone" aria-hidden />
            </span>
            <span className="hidden font-[family-name:var(--font-display)] text-lg font-extrabold tracking-[-0.035em] text-[#f1e4c7] sm:block">
              Kỳ Đài
            </span>
          </Link>

          <Link
            href="/cards/xidach"
            aria-current="page"
            className="absolute left-1/2 -translate-x-1/2 font-[family-name:var(--font-display)] text-lg font-extrabold uppercase tracking-[0.16em] text-[#ead39f] sm:text-xl"
          >
            Xì Dách
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/cards/xidach#luat-xi-dach"
              className="hidden rounded-[8px] border border-[#8f7344]/35 px-3 py-2 text-xs font-bold text-[#cfbd96] transition hover:border-[#b59254]/70 hover:text-[#f1e4c7] sm:block"
            >
              Luật chơi
            </Link>
            <Link
              href="/cards"
              aria-label="Về danh sách game bài"
              className="grid h-10 w-10 place-items-center rounded-[9px] border border-[#8f7344]/35 bg-[#11191d] text-[#ead39f] transition hover:border-[#b59254]/70"
            >
              <List size={21} aria-hidden />
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line/90 bg-ink/90 shadow-[0_12px_36px_rgba(2,8,12,.24)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-7 lg:px-10">
        <Link href="/" className="group flex items-center gap-3 rounded-[8px]">
          <span className="grid h-9 w-9 place-items-center rounded-[10px] border border-brass/45 bg-brass/10 text-brass shadow-[inset_0_1px_0_rgba(255,255,255,.08)]">
            <CastleTurret size={21} weight="duotone" aria-hidden />
          </span>
          <span className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-[-0.035em] text-parchment">
            Kỳ Đài
          </span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm xl:flex">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 rounded-[8px] px-3 py-2 font-medium transition ${
                  isActive(item)
                    ? "bg-brass/12 text-brass"
                    : "text-muted hover:bg-white/[.045] hover:text-parchment"
                }`}
              >
                {Icon && <Icon size={16} weight="duotone" aria-hidden />}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
          className="grid h-10 w-10 place-items-center rounded-[9px] border border-line bg-slate text-parchment transition hover:border-brass/60 xl:hidden"
        >
          {menuOpen ? <X size={20} aria-hidden /> : <List size={21} aria-hidden />}
        </button>
      </div>

      {menuOpen && (
        <nav className="border-t border-line bg-ink/98 px-4 py-4 shadow-2xl xl:hidden">
          <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-2 sm:grid-cols-3">
            {NAV.map((item) => {
              const Icon =
                item.icon ??
                (item.href === "/chess" ? CrownSimple : CastleTurret);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-12 items-center gap-2 rounded-[9px] border px-3 text-sm font-medium transition ${
                    isActive(item)
                      ? "border-brass/35 bg-brass/10 text-brass"
                      : "border-transparent bg-slate/70 text-muted hover:border-line hover:text-parchment"
                  }`}
                >
                  <Icon size={18} weight="duotone" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
