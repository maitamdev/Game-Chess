"use client";

import { useCallback, useEffect, useRef } from "react";
import type { EngineLevel } from "./engine.worker";

export interface EngineMove {
  uci: string;
  evaluation: number;
  depth: number;
}

export type RequestKind = "move" | "hint";

interface Pending {
  kind: RequestKind;
  startedAt: number;
  minThinkMs: number;
  /** khác null khi worker đã trả kết quả và đang chờ đủ thời gian suy nghĩ tối thiểu */
  timer: ReturnType<typeof setTimeout> | null;
}

/**
 * Cầu nối với engine chạy trong Web Worker (mục 5.2, 6).
 * - Đảm bảo thời gian suy nghĩ tối thiểu.
 * - Search trong worker chạy đồng bộ nên 'stop' không thể ngắt giữa chừng;
 *   để hủy thật sự (và để kết quả cũ không bao giờ bị gán cho yêu cầu mới),
 *   stop() terminate worker đang tính và tạo worker mới.
 */
export function useEngine(
  onResult: (kind: RequestKind, move: EngineMove) => void,
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
      if (!pending || pending.timer) return; // không có yêu cầu đang chờ kết quả
      const move: EngineMove = {
        uci: msg.move,
        evaluation: msg.evaluation,
        depth: msg.depth,
      };
      // Máy suy nghĩ tối thiểu 300ms kể cả khi tìm ra nước ngay lập tức
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
    () => attach(new Worker(new URL("./engine.worker.ts", import.meta.url))),
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
      // kết quả đã về, chỉ còn chờ min-think — hủy timer là đủ
      clearTimeout(pending.timer);
      return;
    }
    // worker đang tính đồng bộ: gửi 'stop' theo giao thức rồi thay worker
    // để chắc chắn không còn thông điệp cũ nào về được
    workerRef.current?.postMessage({ type: "stop" });
    workerRef.current?.terminate();
    workerRef.current = spawn();
  }, [spawn]);

  const request = useCallback(
    (fen: string, level: EngineLevel, kind: RequestKind, minThinkMs = 0) => {
      if (pendingRef.current) stop(); // mỗi lúc chỉ một yêu cầu
      const worker = workerRef.current;
      if (!worker) return;
      pendingRef.current = {
        kind,
        startedAt: performance.now(),
        minThinkMs,
        timer: null,
      };
      worker.postMessage({ type: "search", fen, level });
    },
    [stop],
  );

  return { request, stop };
}
