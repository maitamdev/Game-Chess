"use client";

import { useEffect } from "react";
import { useJungleStore } from "@/stores/jungleStore";

export function useJungleClockTicker() {
  const status = useJungleStore((s) => s.status);
  const clockRunning = useJungleStore((s) => s.clockRunning);
  const hasClock = useJungleStore((s) => s.timeControl !== null);

  useEffect(() => {
    if (status !== "playing" || !clockRunning || !hasClock) return;
    useJungleStore.getState().startTicking();
    const interval = setInterval(() => {
      useJungleStore.getState().tick();
    }, 100);
    return () => clearInterval(interval);
  }, [status, clockRunning, hasClock]);
}
