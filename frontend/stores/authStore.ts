"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id: string;
  username: string;
  elo: number;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  xq_elo: number;
  xq_games_played: number;
  xq_wins: number;
  xq_losses: number;
  xq_draws: number;
  caro_elo: number;
  caro_games_played: number;
  caro_wins: number;
  caro_losses: number;
  caro_draws: number;
  jg_elo: number;
  jg_games_played: number;
  jg_wins: number;
  jg_losses: number;
  jg_draws: number;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  /** true sau khi đọc xong localStorage — tránh redirect nhầm khi chưa nạp */
  hydrated: boolean;
  setAuth(
    tokens: { access_token: string; refresh_token?: string },
    user?: AuthUser,
  ): void;
  setHydrated(): void;
  logout(): void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      hydrated: false,
      setAuth(tokens, user) {
        set((s) => ({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? s.refreshToken,
          user: user ?? s.user,
        }));
      },
      setHydrated() {
        set({ hydrated: true });
      },
      logout() {
        set({ user: null, accessToken: null, refreshToken: null });
      },
    }),
    {
      name: "kd-auth",
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
