"use client";

import { useCallback, useEffect, useRef } from "react";
import type { XqEngineLevel } from "./xiangqi.worker";

export interface XqEngineMove {
  uci: string;
  evaluation: number;
  depth: number;
}

export type XqRequestKind = "move" | "hint";

interface Pending {
  kind: XqRequestKind;
  startedAt: number;
  minThinkMs: number;
  timer: ReturnType<typeof setTimeout> | null;
}

/** Cầu nối worker engine cờ tướng — cùng hợp đồng với useEngine cờ vua
 *  (suy nghĩ tối thiểu, stop = terminate + respawn để hủy thật sự). */
export function useXqEngine(
  onResult: (kind: XqRequestKind, move: XqEngineMove) => void,
  onProgress?: (depth: number, evaluation: number) => void,
) {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Pending | null>(null);
  const onResultRef = useRef(onResult);
  const onProgressRef = useRef(onProgress);
  onResultRef.current = onResult;
  onProgressRef.current = onProgress;

  const attach = useCallback((worker: Worker): Worker => {
    worker.onmessage = (
      e: MessageEvent<
        | { type: "bestmove"; move: string; evaluation: number; depth: number }
        | { type: "progress"; depth: number; evaluation: number }
      >,
    ) => {
      const msg = e.data;
      if (msg.type === "progress") {
        if (pendingRef.current) onProgressRef.current?.(msg.depth, msg.evaluation);
        return;
      }
      const pending = pendingRef.current;
      if (!pending || pending.timer) return;
      const move: XqEngineMove = {
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
    () => attach(new Worker(new URL("./xiangqi.worker.ts", import.meta.url))),
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
      fen: string,
      level: XqEngineLevel,
      kind: XqRequestKind,
      minThinkMs = 0,
      history?: string[],
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
      worker.postMessage({ type: "search", fen, level, history });
    },
    [stop],
  );

  return { request, stop };
}
