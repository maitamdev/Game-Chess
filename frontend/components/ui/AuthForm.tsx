"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import { api, ApiError } from "@/lib/api";
import { useAuthStore, type AuthUser } from "@/stores/authStore";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

const inputClass =
  "w-full rounded-[6px] border border-line bg-ink px-3 py-2 text-base text-parchment placeholder:text-muted focus:border-brass focus:outline-none";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body =
        mode === "login" ? { username, password } : { username, email, password };
      const res = await api<TokenResponse>(`/api/auth/${mode}`, { body });
      useAuthStore.getState().setAuth(res, res.user);
      router.push(params.get("next") ?? "/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không kết nối được máy chủ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mx-auto max-w-sm rounded-[10px] border border-line bg-slate p-6">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
        </h1>
        <form className="mt-6 flex flex-col gap-4" onSubmit={submit}>
          <label className="flex flex-col gap-1.5 text-sm">
            Tên đăng nhập
            <input
              className={inputClass}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              minLength={3}
              maxLength={20}
            />
          </label>
          {mode === "register" && (
            <label className="flex flex-col gap-1.5 text-sm">
              Email
              <input
                className={inputClass}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
          )}
          <label className="flex flex-col gap-1.5 text-sm">
            Mật khẩu
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={8}
            />
          </label>
          {error && <p className="text-sm text-rust">{error}</p>}
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting
              ? "Đang xử lý…"
              : mode === "login"
                ? "Đăng nhập"
                : "Đăng ký"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted">
          {mode === "login" ? (
            <>
              Chưa có tài khoản?{" "}
              <Link href="/register" className="text-brass hover:underline">
                Đăng ký
              </Link>
            </>
          ) : (
            <>
              Đã có tài khoản?{" "}
              <Link href="/login" className="text-brass hover:underline">
                Đăng nhập
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
