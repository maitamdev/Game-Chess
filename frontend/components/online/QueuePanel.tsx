"use client";

/**
 * Panel tìm trận dùng chung cho cả 5 game — thay 5 trang queue copy-paste
 * thời WebSocket. Join qua POST /api/queue/join rồi poll /api/queue/status;
 * server tự ghép cặp trong lúc poll (không có vòng lặp nền).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/ui/Button";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

const TIME_CONTROLS = [
  { value: "3+2", label: "3+2", note: "Siêu nhanh" },
  { value: "5+0", label: "5+0", note: "Nhanh" },
  { value: "10+0", label: "10+0", note: "Tiêu chuẩn" },
  { value: "15+10", label: "15+10", note: "Thong thả" },
];

const STATUS_POLL_MS = 1200;

/** Ván dang dở có thể thuộc game KHÁC trang queue hiện tại — route theo variant thật. */
const VARIANT_PATHS: Record<string, string> = {
  chess: "/play/online",
  xiangqi: "/xiangqi/online",
  caro: "/caro/online",
  jungle: "/jungle/online",
  oanquan: "/oanquan/online",
};

interface QueueStatus {
  status: "idle" | "waiting" | "matched";
  position?: number;
  game_id?: string;
  variant?: string;
}

interface Props {
  variant: "chess" | "xiangqi" | "caro" | "jungle" | "oanquan";
  /** ví dụ "Cờ thú — đấu online" */
  title: string;
  /** ví dụ "Elo cờ thú" */
  eloLabel: string;
  eloValue: number | undefined;
  /** đường dẫn trang queue, ví dụ "/jungle/online" — ván sẽ mở tại `${basePath}/${id}` */
  basePath: string;
}

export default function QueuePanel({
  variant,
  title,
  eloLabel,
  eloValue,
  basePath,
}: Props) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrated = useAuthStore((s) => s.hydrated);

  const [timeControl, setTimeControl] = useState("10+0");
  const [searching, setSearching] = useState(false);
  const [waitedSec, setWaitedSec] = useState(0);
  const [queueError, setQueueError] = useState<string | null>(null);
  const searchingRef = useRef(false);

  useEffect(() => {
    if (hydrated && !accessToken) {
      router.replace(`/login?next=${basePath}`);
    }
  }, [hydrated, accessToken, router, basePath]);

  const goToGame = useCallback(
    (gameId: string, gameVariant?: string) => {
      searchingRef.current = false;
      const base =
        (gameVariant !== undefined ? VARIANT_PATHS[gameVariant] : undefined) ??
        basePath;
      router.push(`${base}/${gameId}`);
    },
    [router, basePath],
  );

  // poll status khi đang tìm trận
  useEffect(() => {
    if (!searching) return;
    let stopped = false;
    const timer = setInterval(async () => {
      if (!searchingRef.current) return;
      try {
        const st = await api<QueueStatus>("/api/queue/status", { auth: true });
        if (stopped) return;
        if (st.status === "matched" && st.game_id) {
          goToGame(st.game_id, st.variant);
        } else if (st.status === "idle" && searchingRef.current) {
          // entry bị dọn (mạng gián đoạn dài) — vào lại hàng đợi; kiểm tra lại
          // searchingRef sau await để không re-join sau khi người dùng đã Huỷ
          await api("/api/queue/join", {
            body: { variant, time_control: timeControl },
            auth: true,
          }).catch(() => undefined);
        }
      } catch {
        // lỗi mạng tạm thời — thử lại ở nhịp sau
      }
    }, STATUS_POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [searching, variant, timeControl, goToGame]);

  // đồng hồ chờ
  useEffect(() => {
    if (!searching) return;
    setWaitedSec(0);
    const t = setInterval(() => setWaitedSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [searching]);

  // rời hàng đợi khi đóng trang
  useEffect(() => {
    return () => {
      if (searchingRef.current) {
        searchingRef.current = false;
        void api("/api/queue/leave", { method: "POST", auth: true }).catch(
          () => undefined,
        );
      }
    };
  }, []);

  const startSearch = async () => {
    setQueueError(null);
    try {
      const st = await api<QueueStatus>("/api/queue/join", {
        body: { variant, time_control: timeControl },
        auth: true,
      });
      if (st.status === "matched" && st.game_id) {
        goToGame(st.game_id, st.variant);
        return;
      }
      searchingRef.current = true;
      setSearching(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === "ALREADY_IN_GAME") {
        // đang có ván dang dở — đưa người chơi quay lại ván
        try {
          const st = await api<QueueStatus>("/api/queue/status", { auth: true });
          if (st.status === "matched" && st.game_id) {
            goToGame(st.game_id, st.variant);
            return;
          }
        } catch {
          // rơi xuống thông báo lỗi chung
        }
      }
      setQueueError(
        err instanceof ApiError ? err.message : "Không vào được hàng đợi",
      );
    }
  };

  const cancelSearch = () => {
    searchingRef.current = false;
    setSearching(false);
    void api("/api/queue/leave", { method: "POST", auth: true }).catch(
      () => undefined,
    );
  };

  if (!hydrated || !accessToken) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold">
        {title}
      </h1>
      <p className="mt-2 text-sm text-muted">
        Ghép cặp theo {eloLabel} riêng (±100, nới dần khi chờ lâu). {eloLabel}{" "}
        của bạn:{" "}
        <span className="font-[family-name:var(--font-mono)] text-brass">
          {eloValue ?? "…"}
        </span>
      </p>

      <div className="mt-8 max-w-md rounded-[10px] border border-line bg-slate p-6">
        {!searching ? (
          <>
            <p className="text-sm font-medium">Thể thức</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {TIME_CONTROLS.map((tc) => (
                <button
                  key={tc.value}
                  type="button"
                  onClick={() => setTimeControl(tc.value)}
                  className={`rounded-[6px] border px-2 py-3 text-center transition-colors ${
                    timeControl === tc.value
                      ? "border-brass bg-brass/10"
                      : "border-line hover:border-brass/50"
                  }`}
                >
                  <span className="block font-[family-name:var(--font-mono)] text-base text-parchment">
                    {tc.label}
                  </span>
                  <span className="mt-1 block text-xs text-muted">{tc.note}</span>
                </button>
              ))}
            </div>
            {queueError && <p className="mt-4 text-sm text-rust">{queueError}</p>}
            <Button variant="primary" className="mt-6 w-full" onClick={startSearch}>
              Tìm trận
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center py-4 text-center">
            <span className="flex items-center gap-1.5">
              <span className="thinking-dot" />
              <span className="thinking-dot" />
              <span className="thinking-dot" />
            </span>
            <p className="mt-4 text-base">
              Đang tìm đối thủ —{" "}
              <span className="font-[family-name:var(--font-mono)] text-brass">
                {timeControl}
              </span>
            </p>
            <p className="mt-2 font-[family-name:var(--font-mono)] text-lg text-muted">
              {Math.floor(waitedSec / 60)}:{String(waitedSec % 60).padStart(2, "0")}
            </p>
            <Button className="mt-6" onClick={cancelSearch}>
              Huỷ tìm trận
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
