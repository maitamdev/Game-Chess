"use client";

/**
 * Hook ván đấu online qua HTTP polling - thay thế lib/ws.ts (WebSocket).
 *
 * Server (app/api/live/*) là trọng tài duy nhất; hook chỉ:
 *   - poll GET /api/live/:id/state mỗi POLL_MS (kiêm heartbeat hiện diện),
 *   - đi nước lạc quan: áp local ngay, gửi POST /move kèm ply kỳ vọng,
 *     đối chiếu lại bằng state server trả về (state là chân lý),
 *   - nội suy đồng hồ từ mốc server_time gần nhất,
 *   - phát âm thanh khi ván chuyển sang trạng thái kết thúc.
 *
 * Dùng chung cho cả 5 game: mọi thứ đặc thù game (bàn cờ, luật client,
 * âm thanh) nằm ở trang gọi hook.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { playSound } from "@/lib/sounds";

const POLL_MS = 1500;
/** đối thủ không poll quá ngưỡng này (server đo) → coi là mất kết nối */
const OPP_DISCONNECT_VISIBLE_MS = 6000;

export type OnlineColor = "white" | "black";
export type OnlineVariant = "chess" | "xiangqi" | "caro" | "jungle" | "oanquan";

export interface LiveMove {
  ply: number;
  san: string;
  uci: string;
}

export interface LiveState {
  game_id: string;
  variant: OnlineVariant;
  time_control: string;
  status: "active" | "finished";
  white: { id: string; username: string };
  black: { id: string; username: string };
  your_color: OnlineColor | null;
  moves: LiveMove[];
  ply: number;
  turn: OnlineColor;
  white_time_ms: number;
  black_time_ms: number;
  clock_running: boolean;
  server_time: number;
  draw_offer_from: OnlineColor | null;
  opponent_last_seen_ms: number | null;
  disconnect_forfeit_ms: number;
  result: string | null;
  termination: string | null;
  score_a: number | null;
  score_b: number | null;
  rejected?: string;
}

export interface OnlineResultInfo {
  /** 'white' | 'black' | 'draw' | 'aborted' */
  raw: string;
  termination: string;
  scoreA: number | null;
  scoreB: number | null;
}

export function useOnlineGame(gameId: string | null) {
  const [state, setState] = useState<LiveState | null>(null);
  const [pending, setPending] = useState<{ uci: string; ply: number } | null>(
    null,
  );
  const [notFound, setNotFound] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  const [, setClockTick] = useState(0);

  const stateRef = useRef<LiveState | null>(null);
  const timesRef = useRef<{ at: number } | null>(null);
  const failsRef = useRef(0);
  const prevStatusRef = useRef<"active" | "finished" | null>(null);
  const notFoundRef = useRef(false);

  const myColor: OnlineColor | null = useMemo(() => {
    return state?.your_color ?? null;
  }, [state]);

  const applyState = useCallback((st: LiveState) => {
    stateRef.current = st;
    timesRef.current = { at: performance.now() };
    failsRef.current = 0;
    setConnectionLost(false);
    setState(st);
    setPending((p) => (p !== null && st.ply >= p.ply ? null : p));
  }, []);

  // ---- polling (kiêm heartbeat) ----
  useEffect(() => {
    if (gameId === null) return;
    let stopped = false;

    const tick = async () => {
      try {
        const st = await api<LiveState>(`/api/live/${gameId}/state`);
        if (!stopped) applyState(st);
      } catch (err) {
        if (stopped) return;
        if (err instanceof ApiError && err.status === 404) {
          notFoundRef.current = true; // dừng hẳn vòng poll
          setNotFound(true);
          return;
        }
        failsRef.current += 1;
        if (failsRef.current >= 2) setConnectionLost(true);
      }
    };

    const shouldPoll = () =>
      stateRef.current?.status !== "finished" && !notFoundRef.current;

    tick();
    const timer = setInterval(() => {
      if (shouldPoll()) tick();
    }, POLL_MS);
    // tab nền bị browser bóp setInterval xuống ~1 nhịp/phút - poll ngay khi
    // tab hiện lại để heartbeat/đồng hồ bắt kịp
    const onVisible = () => {
      if (document.visibilityState === "visible" && shouldPoll()) tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [gameId, applyState]);

  // ---- chuyển active → finished: âm thanh phản hồi ----
  useEffect(() => {
    if (!state) return;
    const prev = prevStatusRef.current;
    prevStatusRef.current = state.status;
    if (state.status !== "finished" || prev !== "active") return;
    playSound("game-end");
  }, [state]);

  // ---- tick 100ms cho đồng hồ ----
  const finished = state?.status === "finished";
  useEffect(() => {
    if (finished || state === null) return;
    const t = setInterval(() => setClockTick((n) => n + 1), 100);
    return () => clearInterval(t);
  }, [finished, state === null]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- danh sách nước đi (đã xác nhận + nước lạc quan) ----
  const confirmedUcis = useMemo(
    () => state?.moves.map((m) => m.uci) ?? null,
    [state],
  );
  const displayUcis = useMemo(() => {
    const base = confirmedUcis ?? [];
    return pending !== null && pending.ply === base.length + 1
      ? [...base, pending.uci]
      : base;
  }, [confirmedUcis, pending]);

  // ---- đồng hồ nội suy ----
  const now = performance.now();
  const displayTimes = useMemo(() => {
    if (!state) return { white: 0, black: 0 };
    let w = state.white_time_ms;
    let b = state.black_time_ms;
    if (state.clock_running && state.status === "active" && timesRef.current) {
      const elapsed = performance.now() - timesRef.current.at;
      if (state.turn === "white") w -= elapsed;
      else b -= elapsed;
    }
    return { white: Math.max(0, w), black: Math.max(0, b) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, Math.floor(now / 100)]);

  // ---- đối thủ mất kết nối ----
  const oppSecondsLeft = useMemo(() => {
    if (
      !state ||
      state.status !== "active" ||
      myColor === null ||
      state.opponent_last_seen_ms === null ||
      timesRef.current === null
    ) {
      return null;
    }
    const serverNow =
      state.server_time + (performance.now() - timesRef.current.at);
    const silentFor = serverNow - state.opponent_last_seen_ms;
    if (silentFor < OPP_DISCONNECT_VISIBLE_MS) return null;
    return Math.max(
      0,
      Math.ceil((state.disconnect_forfeit_ms - silentFor) / 1000),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, myColor, Math.floor(now / 1000)]);

  // ---- kết quả ----
  const result: OnlineResultInfo | null = useMemo(() => {
    if (!state || state.status !== "finished") return null;
    return {
      raw: state.result ?? "draw",
      termination: state.termination ?? "agreement",
      scoreA: state.score_a,
      scoreB: state.score_b,
    };
  }, [state]);

  // ---- hành động ----
  const post = useCallback(
    async (path: string, body?: unknown) => {
      if (gameId === null) return;
      try {
        const st = await api<LiveState>(`/api/live/${gameId}${path}`, {
          method: "POST",
          body: body ?? {},
        });
        applyState(st);
        if (st.rejected !== undefined) setPending(null);
      } catch (err) {
        setPending(null);
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
      }
    },
    [gameId, applyState],
  );

  /** Đi nước lạc quan - trang gọi sau khi đã tự kiểm tra hợp lệ bằng luật client. */
  const sendMove = useCallback(
    (uci: string) => {
      const base = stateRef.current?.moves.length ?? 0;
      const ply = base + 1;
      setPending({ uci, ply });
      void post("/move", { uci, ply });
    },
    [post],
  );

  const resign = useCallback(() => void post("/resign"), [post]);
  const offerDraw = useCallback(
    () => void post("/draw", { action: "offer" }),
    [post],
  );
  const respondDraw = useCallback(
    (accept: boolean) =>
      void post("/draw", { action: accept ? "accept" : "decline" }),
    [post],
  );

  const drawOfferFromOpponent =
    state !== null &&
    state.status === "active" &&
    state.draw_offer_from !== null &&
    myColor !== null &&
    state.draw_offer_from !== myColor;

  return {
    state,
    notFound,
    connectionLost,
    myColor,
    /** nước đã server xác nhận (null khi chưa nạp xong) */
    confirmedUcis,
    /** nước hiển thị = xác nhận + nước lạc quan đang chờ */
    displayUcis,
    pending,
    displayTimes,
    serverTurn: state?.turn ?? "white",
    clockActive: state !== null && state.status === "active" && state.clock_running,
    drawOfferFromOpponent,
    oppSecondsLeft,
    result,
    sendMove,
    resign,
    offerDraw,
    respondDraw,
  };
}
