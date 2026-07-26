"use client";

import { useCallback, useEffect, useRef } from "react";
import type { CaroEngineLevel } from "./caro.worker";

export interface CaroEngineMove {
  uci: string;
  evaluation: number;
  depth: number;
}

export type CaroRequestKind = "move" | "hint";

interface Pending {
  kind: CaroRequestKind;
  startedAt: number;
  minThinkMs: number;
  timer: ReturnType<typeof setTimeout> | null;
}

/** Cầu nối worker engine caro — cùng hợp đồng với hai engine kia. */
export function useCaroEngine(
  onResult: (kind: CaroRequestKind, move: CaroEngineMove) => void,
) {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Pending | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const attach = useCallback((worker: Worker): Worker => {
    worker.onmessage = (
      e: MessageEvent<
        | { type: "bestmove"; move: string; evaluation: number; depth: number }
        | { type: "progress"; depth: number; evaluation: number }
      >,
    ) => {
      const msg = e.data;
      if (msg.type !== "bestmove") return;
      const pending = pendingRef.current;
      if (!pending || pending.timer) return;
      const move: CaroEngineMove = {
        uci: msg.move,
        evaluation: msg.evaluation,
        depth: msg.depth,
      };
      const elapsed = performance.now() - pending.startedAt;
      const delay = Math.max(0, pending.minThinkMs - elapsed);
      pending.timer = setTimeout(() => {
        if (pendingRef.current === pending) {
          pendingRef.current = null;
          onResultRef.current(pending.kind, move);
        }
      }, delay);
    };
    return worker;
  }, []);

  const spawn = useCallback(
    () => attach(new Worker(new URL("./caro.worker.ts", import.meta.url))),
    [attach],
  );

  useEffect(() => {
    workerRef.current = spawn();
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      if (pendingRef.current?.timer) clearTimeout(pendingRef.current.timer);
      pendingRef.current = null;
    };
  }, [spawn]);

  const stop = useCallback(() => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (!pending) return;
    if (pending.timer) {
      clearTimeout(pending.timer);
      return;
    }
    workerRef.current?.postMessage({ type: "stop" });
    workerRef.current?.terminate();
    workerRef.current = spawn();
  }, [spawn]);

  const request = useCallback(
    (
      history: string[],
      level: CaroEngineLevel,
      kind: CaroRequestKind,
      minThinkMs = 0,
    ) => {
      if (pendingRef.current) stop();
      const worker = workerRef.current;
      if (!worker) return;
      pendingRef.current = {
        kind,
        startedAt: performance.now(),
        minThinkMs,
        timer: null,
      };
      worker.postMessage({ type: "search", level, history });
    },
    [stop],
  );

  return { request, stop };
}
