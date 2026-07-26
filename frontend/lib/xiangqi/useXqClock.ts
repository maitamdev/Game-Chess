"use client";

import { useEffect } from "react";
import { useXiangqiStore } from "@/stores/xiangqiStore";

/** Đồng hồ cờ tướng: store tự tính delta từ lastTickAt. */
export function useXqClockTicker() {
  const status = useXiangqiStore((s) => s.status);
  const clockRunning = useXiangqiStore((s) => s.clockRunning);
  const hasClock = useXiangqiStore((s) => s.timeControl !== null);

  useEffect(() => {
    if (status !== "playing" || !clockRunning || !hasClock) return;
    useXiangqiStore.getState().startTicking();
    const interval = setInterval(() => {
      useXiangqiStore.getState().tick();
    }, 100);
    return () => clearInterval(interval);
  }, [status, clockRunning, hasClock]);
}
