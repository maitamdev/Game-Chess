"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowClockwise } from "@phosphor-icons/react/ArrowClockwise";
import { Lightning } from "@phosphor-icons/react/Lightning";
import { MagnifyingGlass } from "@phosphor-icons/react/MagnifyingGlass";

import Button from "@/components/ui/Button";
import { api, ApiError } from "@/lib/api";

const GAMES = [
  ["chess", "Cờ vua"],
  ["xiangqi", "Cờ tướng"],
  ["caro", "Caro"],
  ["jungle", "Cờ thú"],
  ["oanquan", "Ô ăn quan"],
] as const;
const TIMES = ["3+2", "5+0", "10+0", "15+10"] as const;

interface QueueResult {
  status: "waiting" | "matched";
  game_type: string;
  time_control: string;
  queued_at: string | null;
  room_code: string | null;
  game_id: string | null;
}

const ONLINE_PATHS: Record<string, string> = {
  chess: "/play/online",
  xiangqi: "/xiangqi/online",
  caro: "/caro/online",
  jungle: "/jungle/online",
  oanquan: "/oanquan/online",
};

export default function MatchmakingPage() {
  const router = useRouter();
  const [game, setGame] = useState("chess");
  const [timeControl, setTimeControl] = useState("10+0");
  const [queue, setQueue] = useState<QueueResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const data = await api<{ queue: QueueResult | null }>("/api/queue/status");
      if (data.queue?.status === "matched" && data.queue.game_id) {
        router.replace(`${ONLINE_PATHS[data.queue.game_type]}/${data.queue.game_id}`);
        return;
      }
      setQueue(data.queue);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setError("Hãy nhập tên hiển thị ở sảnh phòng trước khi tìm trận.");
      }
    }
  }, [router]);

  useEffect(() => {
    void loadStatus();
    const timer = setInterval(loadStatus, 1800);
    return () => clearInterval(timer);
  }, [loadStatus]);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await api<QueueResult>("/api/queue/join", {
        body: { game_type: game, time_control: timeControl },
      });
      if (result.status === "matched" && result.game_id) {
        router.push(`${ONLINE_PATHS[result.game_type]}/${result.game_id}`);
      } else {
        setQueue(result);
      }
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Không vào được hàng chờ");
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    setBusy(true);
    await api("/api/queue/leave", { method: "POST" }).catch(() => undefined);
    setQueue(null);
    setBusy(false);
  };

  return (
    <div className="app-shell py-10 sm:py-14">
      <header className="max-w-2xl">
        <span className="grid h-12 w-12 place-items-center rounded-[12px] border border-brass/35 bg-brass/10 text-brass"><Lightning size={27} weight="duotone" aria-hidden /></span>
        <h1 className="mt-6 text-4xl font-extrabold tracking-[-0.045em]">Tìm trận nhanh</h1>
        <p className="mt-4 leading-7 text-muted">Chọn game và thời gian. Hệ thống sẽ ghép người có rating gần nhau, rồi mở thẳng vào bàn online.</p>
      </header>

      <section className="mt-10 max-w-2xl rounded-[14px] border border-line bg-slate p-6 sm:p-8">
        <label className="text-sm font-semibold text-parchment">Game</label>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">{GAMES.map(([id, label]) => <button key={id} type="button" onClick={() => setGame(id)} disabled={queue !== null} className={`min-h-11 rounded-[8px] border px-4 text-left text-sm font-semibold transition ${game === id ? "border-brass bg-brass/12 text-brass" : "border-line text-muted hover:border-brass/45"}`}>{label}</button>)}</div>
        <label className="mt-7 block text-sm font-semibold text-parchment">Thời gian</label>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{TIMES.map((value) => <button key={value} type="button" onClick={() => setTimeControl(value)} disabled={queue !== null} className={`min-h-11 rounded-[8px] border font-[family-name:var(--font-mono)] text-sm transition ${timeControl === value ? "border-brass bg-brass/12 text-brass" : "border-line text-muted hover:border-brass/45"}`}>{value}</button>)}</div>
        {queue ? <div className="mt-7 rounded-[10px] border border-brass/35 bg-brass/[.07] p-4"><div className="flex items-center gap-3"><MagnifyingGlass size={21} className="animate-pulse text-brass" aria-hidden /><div><p className="font-semibold text-parchment">Đang tìm đối thủ...</p><p className="mt-1 text-sm text-muted">{queue.game_type} · {queue.time_control}. Có thể rời hàng chờ bất kỳ lúc nào.</p></div></div><Button variant="ghost" className="mt-4 w-full" onClick={() => void leave()} disabled={busy}>Rời hàng chờ</Button></div> : <Button variant="primary" className="mt-7 w-full" onClick={() => void start()} disabled={busy}><MagnifyingGlass size={19} aria-hidden /> {busy ? "Đang tìm..." : "Tìm trận"}</Button>}
        {error && <p className="mt-4 rounded-[8px] border border-rust/50 bg-rust/10 px-3 py-2 text-sm text-[#e48a88]">{error}</p>}
        <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-muted"><ArrowClockwise size={15} className="mt-0.5 shrink-0" aria-hidden /> Hàng chờ mở rộng khoảng rating theo thời gian chờ để tránh phải đợi quá lâu.</p>
      </section>
    </div>
  );
}

