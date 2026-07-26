"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useAuthStore } from "@/stores/authStore";
import { getGameSocket, type SocketStatus } from "@/lib/ws";

const TIME_CONTROLS = [
  { value: "3+2", label: "3+2", note: "Siêu nhanh" },
  { value: "5+0", label: "5+0", note: "Nhanh" },
  { value: "10+0", label: "10+0", note: "Tiêu chuẩn" },
  { value: "15+10", label: "15+10", note: "Thong thả" },
];

export default function JungleQueuePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrated = useAuthStore((s) => s.hydrated);

  const [timeControl, setTimeControl] = useState("10+0");
  const [searching, setSearching] = useState(false);
  const [waitedSec, setWaitedSec] = useState(0);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>("closed");
  const [queueError, setQueueError] = useState<string | null>(null);
  const searchingRef = useRef(false);

  useEffect(() => {
    if (hydrated && !accessToken) {
      router.replace("/login?next=/jungle/online");
    }
  }, [hydrated, accessToken, router]);

  useEffect(() => {
    const socket = getGameSocket();
    const offMsg = socket.onMessage((msg) => {
      if (msg.type === "match_found" && msg.variant === "jungle") {
        searchingRef.current = false;
        router.push(`/jungle/online/${msg.game_id}`);
      }
      if (msg.type === "error") {
        searchingRef.current = false;
        setSearching(false);
        setQueueError(String(msg.message ?? "Không vào được hàng đợi"));
      }
    });
    const offStatus = socket.onStatus((status) => {
      setSocketStatus(status);
      if (status === "open" && searchingRef.current) {
        socket.send({
          type: "join_queue",
          time_control: timeControl,
          variant: "jungle",
        });
      }
    });
    return () => {
      offMsg();
      offStatus();
      if (searchingRef.current) {
        socket.send({ type: "leave_queue" });
        searchingRef.current = false;
      }
    };
  }, [router, timeControl]);

  useEffect(() => {
    if (!searching) return;
    setWaitedSec(0);
    const t = setInterval(() => setWaitedSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [searching]);

  const startSearch = () => {
    setQueueError(null);
    const socket = getGameSocket();
    socket.connect();
    socket.send({ type: "join_queue", time_control: timeControl, variant: "jungle" });
    searchingRef.current = true;
    setSearching(true);
  };

  const cancelSearch = () => {
    getGameSocket().send({ type: "leave_queue" });
    searchingRef.current = false;
    setSearching(false);
  };

  if (!hydrated || !accessToken) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold">
        Cờ thú — đấu online
      </h1>
      <p className="mt-2 text-sm text-muted">
        Ghép cặp theo Elo cờ thú riêng (±100, nới dần khi chờ lâu). Elo cờ thú
        của bạn:{" "}
        <span className="font-[family-name:var(--font-mono)] text-brass">
          {user?.jg_elo ?? "…"}
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
              Đang tìm đối thủ cờ thú —{" "}
              <span className="font-[family-name:var(--font-mono)] text-brass">
                {timeControl}
              </span>
            </p>
            <p className="mt-2 font-[family-name:var(--font-mono)] text-lg text-muted">
              {Math.floor(waitedSec / 60)}:{String(waitedSec % 60).padStart(2, "0")}
            </p>
            {socketStatus !== "open" && (
              <p className="mt-2 text-xs text-rust">Đang kết nối lại…</p>
            )}
            <Button className="mt-6" onClick={cancelSearch}>
              Huỷ tìm trận
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
