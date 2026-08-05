"use client";

import type { ReactNode } from "react";
import { Leaf } from "@phosphor-icons/react";
import type { JgColor } from "@/lib/jungle/rules";

interface JungleGameFrameProps {
  topPlayer: ReactNode;
  board: ReactNode;
  bottomPlayer: ReactNode;
  actions: ReactNode;
  moveList: ReactNode;
  soundControl?: ReactNode;
  statusLabel: string;
  statusColor?: JgColor | null;
  notices?: ReactNode;
}

export default function JungleGameFrame({
  topPlayer,
  board,
  bottomPlayer,
  actions,
  moveList,
  soundControl,
  statusLabel,
  statusColor,
  notices,
}: JungleGameFrameProps) {
  return (
    <main className="jg-stage relative min-h-[calc(100dvh-64px)] overflow-hidden px-4 py-5 sm:px-6 lg:py-6">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-[-14rem] top-[8%] h-[32rem] w-[32rem] rounded-full bg-[#214638]/15 blur-[120px]" />
        <div className="absolute bottom-[-16rem] right-[-10rem] h-[36rem] w-[36rem] rounded-full bg-[#9A6E2F]/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-[1120px]">
        {notices}
        <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,auto)_320px] lg:justify-center lg:gap-7 xl:gap-9">
          <section className="jg-board-column mx-auto flex w-full flex-col gap-2.5">
            {topPlayer}
            {board}
            {bottomPlayer}
          </section>

          <aside className="jg-rail mx-auto flex min-h-[420px] w-full max-w-[460px] flex-col p-3 lg:mx-0 lg:h-[min(68dvh,690px)] lg:max-w-none">
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <div className="min-w-0">{actions}</div>
              {soundControl && <div>{soundControl}</div>}
            </div>

            <div className="mt-3 min-h-0 flex-1">{moveList}</div>

            <div className="mt-3 flex items-center justify-between rounded-[10px] border border-white/[0.07] bg-black/15 px-3 py-2.5">
              <span className="flex items-center gap-2 text-xs font-medium text-[#C7C4B8]">
                <Leaf aria-hidden size={15} weight="duotone" className="text-[#D6A84B]" />
                Trạng thái
              </span>
              <span className="flex items-center gap-2 text-xs text-[#E7E2D5]">
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{
                    background:
                      statusColor === "r"
                        ? "#C9664F"
                        : statusColor === "b"
                          ? "#5B88A8"
                          : "#D6A84B",
                    boxShadow: "0 0 0 3px rgba(255,255,255,0.04)",
                  }}
                />
                {statusLabel}
              </span>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
