"use client";

import { useEffect } from "react";
import { useCaroStore } from "@/stores/caroStore";

export function useCaroClockTicker() {
  const status = useCaroStore((s) => s.status);
  const clockRunning = useCaroStore((s) => s.clockRunning);
  const hasClock = useCaroStore((s) => s.timeControl !== null);

  useEffect(() => {
    if (status !== "playing" || !clockRunning || !hasClock) return;
    useCaroStore.getState().startTicking();
    const interval = setInterval(() => {
      useCaroStore.getState().tick();
    }, 100);
    return () => clearInterval(interval);
  }, [status, clockRunning, hasClock]);
}
