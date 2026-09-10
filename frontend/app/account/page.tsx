"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ArrowRight";
import { Crown } from "@phosphor-icons/react/Crown";
import { LockKey } from "@phosphor-icons/react/LockKey";
import { User } from "@phosphor-icons/react/User";
import { UserPlus } from "@phosphor-icons/react/UserPlus";
import { Trophy } from "@phosphor-icons/react/Trophy";

import Button from "@/components/ui/Button";
import { api, ApiError } from "@/lib/api";

interface Profile {
  player: { id: string; display_name: string };
  account: { login: string; created_at: string } | null;
  ratings: Array<{
    game_type: string;
    rating: number;
    games: number;
    wins: number;
    draws: number;
    losses: number;
  }>;
  recent_games: Array<{
    id: string;
    variant: string;
    opponent: { id: string; username: string };
    side: string;
    result: string | null;
    termination: string | null;
    status: string;
    started_at: string;
  }>;
  achievements: Array<{
    key: string;
    title: string;
    description: string;
    category: string;
    icon: string;
    points: number;
    target: number;
    progress: number;
    unlocked_at: string | null;
    unlocked: boolean;
  }>;
}

const GAME_LABELS: Record<string, string> = {
  chess: "Cờ vua",
  xiangqi: "Cờ tướng",
  caro: "Caro",
  jungle: "Cờ thú",
  oanquan: "Ô ăn quan",
};

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      setProfile(await api<Profile>("/api/profile"));
      setError(null);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setProfile(null);
        return;
      }
      setError(cause instanceof Error ? cause.message : "Không tải được hồ sơ");
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api<{ player: Profile["player"]; account: NonNullable<Profile["account"]> }>(
        mode === "login" ? "/api/auth/login" : "/api/auth/register",
        {
          body:
            mode === "login"
              ? { login, password }
              : { login, password, display_name: displayName },
        },
      );
      await loadProfile();
      setPassword("");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Không thể thực hiện");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setProfile(null);
  };

  return (
    <div className="app-shell py-10 sm:py-14">
      <header className="max-w-2xl">
        <span className="grid h-12 w-12 place-items-center rounded-[12px] border border-brass/35 bg-brass/10 text-brass">
          <User size={27} weight="duotone" aria-hidden />
        </span>
        <h1 className="mt-6 text-4xl font-extrabold tracking-[-0.045em]">
          Hồ sơ người chơi
        </h1>
        <p className="mt-4 max-w-xl leading-7 text-muted">
          Chơi guest vẫn được. Tạo tài khoản để giữ tên, rating và lịch sử trận đấu.
        </p>
      </header>

      {!profile ? (
        <section className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
          <form onSubmit={submit} className="rounded-[14px] border border-line bg-slate p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-[10px] border border-brass/35 bg-brass/10 text-brass">
                {mode === "login" ? <LockKey size={20} /> : <UserPlus size={20} />}
              </span>
              <div>
                <h2 className="font-bold text-parchment">
                  {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
                </h2>
                <p className="text-xs text-muted">Tài khoản không bắt buộc để chơi</p>
              </div>
            </div>
            {mode === "register" && (
              <label className="mt-6 block text-sm font-semibold text-parchment">
                Tên hiển thị
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value.slice(0, 24))}
                  required
                  minLength={2}
                  maxLength={24}
                  className="mt-2 min-h-11 w-full rounded-[8px] border border-line bg-ink px-4 text-parchment outline-none focus:border-brass"
                />
              </label>
            )}
            <label className="mt-6 block text-sm font-semibold text-parchment">
              Tên tài khoản
              <input
                value={login}
                onChange={(event) => setLogin(event.target.value.toLowerCase().slice(0, 24))}
                required
                pattern="[a-z0-9_]{3,24}"
                autoComplete="username"
                className="mt-2 min-h-11 w-full rounded-[8px] border border-line bg-ink px-4 text-parchment outline-none focus:border-brass"
              />
            </label>
            <label className="mt-4 block text-sm font-semibold text-parchment">
              Mật khẩu
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                maxLength={72}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="mt-2 min-h-11 w-full rounded-[8px] border border-line bg-ink px-4 text-parchment outline-none focus:border-brass"
              />
            </label>
            <Button type="submit" variant="primary" className="mt-6 w-full" disabled={busy}>
              {busy ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Đăng ký"}
            </Button>
            <button
              type="button"
              onClick={() => setMode((current) => (current === "login" ? "register" : "login"))}
              className="mt-4 w-full text-center text-sm text-muted transition hover:text-brass"
            >
              {mode === "login" ? "Chưa có tài khoản? Tạo tài khoản" : "Đã có tài khoản? Đăng nhập"}
            </button>
            {error && <p className="mt-4 rounded-[8px] border border-rust/50 bg-rust/10 px-3 py-2 text-sm text-[#e48a78]">{error}</p>}
          </form>
          <div className="rounded-[14px] border border-line bg-slate p-6 sm:p-8">
            <h2 className="text-xl font-bold text-parchment">Bạn nhận được gì?</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["Rating riêng", "Theo dõi trình độ ở từng game bàn cờ."],
                ["Lịch sử trận", "Xem đối thủ, kết quả và mở lại replay."],
                ["Leaderboard", "So sánh thứ hạng theo từng variant."],
                ["Giữ guest", "Tài khoản có thể gắn vào guest hiện tại."],
              ].map(([title, text]) => (
                <article key={title} className="rounded-[10px] border border-line bg-ink/45 p-4">
                  <h3 className="font-semibold text-parchment">{title}</h3>
                  <p className="mt-1 text-sm leading-5 text-muted">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <ProfileView profile={profile} onLogout={logout} />
      )}
    </div>
  );
}

function ProfileView({ profile, onLogout }: { profile: Profile; onLogout: () => void }) {
  return (
    <>
      <section className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-brass/30 bg-brass/[.07] p-5 sm:p-7">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-full border border-brass/45 bg-brass/15 text-xl font-bold text-brass">
            {profile.player.display_name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <p className="text-2xl font-bold text-parchment">{profile.player.display_name}</p>
            <p className="mt-1 text-sm text-muted">
              {profile.account ? `@${profile.account.login}` : "Guest session"}
            </p>
          </div>
        </div>
        <button type="button" onClick={onLogout} className="rounded-[8px] border border-line px-4 py-2 text-sm font-semibold text-muted transition hover:border-rust/50 hover:text-parchment">
          Đăng xuất
        </button>
      </section>

      <section className="mt-6">
        <div className="flex items-center gap-3">
          <Trophy size={22} className="text-brass" aria-hidden />
          <h2 className="text-2xl font-bold text-parchment">Rating theo game</h2>
        </div>
        {profile.ratings.length === 0 ? (
          <p className="mt-4 rounded-[10px] border border-dashed border-line p-6 text-sm text-muted">Chơi một ván online để nhận rating đầu tiên.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {profile.ratings.map((rating) => (
              <article key={rating.game_type} className="rounded-[12px] border border-line bg-slate p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-parchment">{GAME_LABELS[rating.game_type] ?? rating.game_type}</h3>
                  <strong className="font-[family-name:var(--font-mono)] text-xl text-brass">{rating.rating}</strong>
                </div>
                <p className="mt-3 text-sm text-muted">{rating.games} ván · {rating.wins} thắng · {rating.draws} hòa · {rating.losses} thua</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-parchment">Trận gần đây</h2>
          <Link href="/leaderboard" className="inline-flex items-center gap-1 text-sm font-semibold text-brass">Leaderboard <ArrowRight size={16} /></Link>
        </div>
        <div className="mt-4 grid gap-2">
          {profile.recent_games.length === 0 ? (
            <p className="rounded-[10px] border border-dashed border-line p-6 text-sm text-muted">Chưa có ván online nào.</p>
          ) : profile.recent_games.map((game) => (
            <Link key={game.id} href={`/game/${game.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-line bg-slate px-4 py-3 transition hover:border-brass/45">
              <div>
                <p className="font-semibold text-parchment">{GAME_LABELS[game.variant] ?? game.variant} · gặp {game.opponent.username}</p>
                <p className="mt-1 text-xs text-muted">{new Date(game.started_at).toLocaleString("vi-VN")}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${game.result === game.side ? "bg-sage/15 text-sage" : game.result === "draw" ? "bg-brass/15 text-brass" : "bg-rust/15 text-[#e99a88]"}`}>
                {game.result === game.side ? "Thắng" : game.result === "draw" ? "Hòa" : game.result ? "Thua" : "Đang chơi"}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brass">Hồ sơ thành tích</p>
            <h2 className="mt-2 text-2xl font-bold text-parchment">Những cột mốc đang mở</h2>
          </div>
          <span className="text-sm text-muted">{profile.achievements.filter((achievement) => achievement.unlocked).length}/{profile.achievements.length} đã mở</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {profile.achievements.map((achievement) => {
            const percent = Math.min(100, Math.round((achievement.progress / achievement.target) * 100));
            return <article key={achievement.key} className={`rounded-[12px] border p-5 ${achievement.unlocked ? "border-brass/45 bg-brass/[.07]" : "border-line bg-slate"}`}>
              <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-parchment">{achievement.title}</h3><p className="mt-1 text-sm leading-5 text-muted">{achievement.description}</p></div><span className="shrink-0 font-mono text-xs text-brass">+{achievement.points}</span></div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink"><span className="block h-full rounded-full bg-brass transition-all" style={{ width: `${percent}%` }} /></div>
              <p className="mt-2 text-xs text-muted">{achievement.unlocked ? "Đã mở khóa" : `${achievement.progress}/${achievement.target} tiến độ`}</p>
            </article>;
          })}
        </div>
      </section>
    </>
  );
}
