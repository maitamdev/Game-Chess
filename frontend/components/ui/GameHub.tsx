import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { BookOpenText } from "@phosphor-icons/react/dist/ssr/BookOpenText";
import { Cpu } from "@phosphor-icons/react/dist/ssr/Cpu";
import { GlobeHemisphereWest } from "@phosphor-icons/react/dist/ssr/GlobeHemisphereWest";
import { UsersThree } from "@phosphor-icons/react/dist/ssr/UsersThree";

export type GameMode = {
  href: string;
  title: string;
  description: string;
  note: string;
  kind: "online" | "computer" | "local";
};

const MODE_ICONS = {
  online: GlobeHemisphereWest,
  computer: Cpu,
  local: UsersThree,
};

export default function GameHub({
  title,
  tagline,
  guideHref,
  mark,
  modes,
}: {
  title: string;
  tagline: string;
  guideHref: string;
  mark: string;
  modes: GameMode[];
}) {
  return (
    <div className="app-shell py-8 sm:py-12 lg:py-16">
      <section className="game-hub-hero grid overflow-hidden rounded-[16px] border border-line bg-slate md:grid-cols-[minmax(0,1.3fr)_minmax(260px,.7fr)]">
        <div className="flex min-h-[310px] flex-col justify-center p-6 sm:p-9 lg:p-12">
          <h1 className="max-w-2xl font-[family-name:var(--font-display)] text-4xl font-extrabold leading-[1.04] tracking-[-0.045em] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted">{tagline}</p>
          <Link
            href={guideHref}
            className="mt-7 inline-flex w-fit items-center gap-2 rounded-[8px] border border-line bg-ink/45 px-4 py-2.5 text-sm font-semibold text-parchment transition hover:border-brass/70 hover:text-brass active:translate-y-px"
          >
            <BookOpenText size={18} weight="duotone" aria-hidden />
            Hướng dẫn chơi
          </Link>
        </div>

        <div className="game-hub-mark relative hidden min-h-[310px] place-items-center border-l border-line md:grid">
          <span className="select-none font-[family-name:var(--font-display)] text-[clamp(7rem,15vw,12rem)] font-black leading-none text-brass/90">
            {mark}
          </span>
        </div>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-2">
        {modes.map((mode, index) => {
          const Icon = MODE_ICONS[mode.kind];
          return (
            <Link
              key={mode.href}
              href={mode.href}
              className={`mode-tile group relative flex min-h-[190px] flex-col overflow-hidden rounded-[14px] border p-6 transition duration-300 hover:-translate-y-0.5 active:translate-y-px sm:p-7 ${
                index === 0
                  ? "border-brass/45 bg-[linear-gradient(135deg,rgba(214,174,85,.16),rgba(17,28,35,.92))] md:col-span-2 md:min-h-[220px]"
                  : "border-line bg-slate hover:border-brass/55"
              }`}
            >
              <div className="flex items-start justify-between gap-5">
                <span className="grid h-12 w-12 place-items-center rounded-[12px] border border-white/10 bg-ink/55 text-brass shadow-[inset_0_1px_0_rgba(255,255,255,.06)]">
                  <Icon size={25} weight="duotone" aria-hidden />
                </span>
                <ArrowRight
                  size={22}
                  className="text-muted transition-transform duration-300 group-hover:translate-x-1 group-hover:text-brass"
                  aria-hidden
                />
              </div>
              <h2 className="mt-7 text-xl font-bold tracking-[-0.025em] text-parchment">
                {mode.title}
              </h2>
              <p className="mt-2 max-w-xl flex-1 text-sm leading-6 text-muted">
                {mode.description}
              </p>
              <span className="mt-5 text-xs font-semibold text-brass/85">{mode.note}</span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
