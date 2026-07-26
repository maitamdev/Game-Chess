"use client";

import { useEffect } from "react";
import { useOanquanStore } from "@/stores/oanquanStore";

export function useOanquanClockTicker() {
  const status = useOanquanStore((s) => s.status);
  const clockRunning = useOanquanStore((s) => s.clockRunning);
  const hasClock = useOanquanStore((s) => s.timeControl !== null);

  useEffect(() => {
    if (status !== "playing" || !clockRunning || !hasClock) return;
    useOanquanStore.getState().startTicking();
    const interval = setInterval(() => {
      useOanquanStore.getState().tick();
    }, 100);
    return () => clearInterval(interval);
  }, [status, clockRunning, hasClock]);
}
