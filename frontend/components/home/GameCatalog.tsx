"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { Cpu } from "@phosphor-icons/react/dist/ssr/Cpu";
import { GlobeHemisphereWest } from "@phosphor-icons/react/dist/ssr/GlobeHemisphereWest";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { UsersThree } from "@phosphor-icons/react/dist/ssr/UsersThree";
import type { CatalogGameId, GameDefinition } from "@/lib/games/registry";

type CategoryFilter = "all" | GameDefinition["category"];

const CATEGORIES: Array<{ id: CategoryFilter; label: string }> = [
  { id: "all", label: "Tất cả" },
  { id: "board", label: "Bàn cờ" },
  { id: "cards", label: "Game bài" },
  { id: "dice", label: "Xúc xắc" },
  { id: "minigame", label: "Chơi nhanh" },
];

function categoryLabel(category: GameDefinition["category"]): string {
  return CATEGORIES.find((item) => item.id === category)?.label ?? category;
}

function modeLabel(game: GameDefinition): string {
  if (game.online === "ready") return "Online sẵn sàng";
  if (game.modes.includes("computer")) return "Đấu máy";
  return "Chơi một mình";
}

export default function GameCatalog({
  games,
}: {
  games: readonly GameDefinition[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");

  const filteredGames = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    return games.filter((game) => {
      const matchesCategory = category === "all" || game.category === category;
      const matchesQuery =
        !normalized ||
        `${game.title} ${game.shortTitle} ${categoryLabel(game.category)}`
          .toLocaleLowerCase("vi")
          .includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [category, games, query]);

  return (
    <div className="mt-10">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <label className="relative block max-w-xl">
          <span className="sr-only">Tìm game</span>
          <MagnifyingGlass
            size={19}
            weight="duotone"
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm cờ, game bài hoặc trò chơi nhanh"
            className="h-12 w-full rounded-[10px] border border-line bg-slate/80 pl-11 pr-4 text-sm text-parchment outline-none transition placeholder:text-muted/75 focus:border-brass/70 focus:ring-2 focus:ring-brass/15"
          />
        </label>

        <div className="flex flex-wrap gap-2" aria-label="Lọc theo thể loại">
          {CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={category === item.id}
              onClick={() => setCategory(item.id)}
              className={`min-h-10 rounded-[10px] border px-3.5 text-sm font-semibold transition active:translate-y-px ${
                category === item.id
                  ? "border-brass bg-brass text-ink"
                  : "border-line bg-slate/70 text-muted hover:border-brass/55 hover:text-parchment"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-x-5 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredGames.map((game) => (
          <Link
            key={game.id}
            href={game.route}
            className="group flex min-h-[132px] flex-col justify-between rounded-[14px] border border-line bg-slate/70 p-5 transition duration-300 hover:-translate-y-0.5 hover:border-brass/55 hover:bg-slate active:translate-y-px"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-brass/80">
                  {categoryLabel(game.category)}
                </span>
                <h3 className="mt-2 text-lg font-bold tracking-[-0.025em] text-parchment">
                  {game.title}
                </h3>
              </div>
              <ArrowRight
                size={19}
                weight="bold"
                aria-hidden
                className="shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-brass"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <UsersThree size={15} weight="duotone" aria-hidden />
                {game.players.min === game.players.max
                  ? `${game.players.max} người`
                  : `${game.players.min}-${game.players.max} người`}
              </span>
              <span className="inline-flex items-center gap-1.5">
                {game.online === "ready" ? (
                  <GlobeHemisphereWest size={15} weight="duotone" aria-hidden />
                ) : (
                  <Cpu size={15} weight="duotone" aria-hidden />
                )}
                {modeLabel(game)}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {filteredGames.length === 0 && (
        <div className="mt-6 rounded-[14px] border border-dashed border-line bg-slate/50 px-6 py-12 text-center">
          <p className="font-semibold text-parchment">Chưa tìm thấy game phù hợp.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("all");
            }}
            className="mt-3 text-sm font-semibold text-brass underline-offset-4 hover:underline"
          >
            Xóa bộ lọc
          </button>
        </div>
      )}
    </div>
  );
}
