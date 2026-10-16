"use client";

import { create } from "zustand";

export type AccountUser = { id: string; name: string; image: string | null; role: "admin" | "member" };

type Account = {
  /** 서버에 물어보기 전 */
  loading: boolean;
  /** 로그인을 쓸 수 있게 설정돼 있는지 */
  enabled: boolean;
  providers: ("google" | "kakao")[];
  user: AccountUser | null;
};

export const useAccount = create<Account>(() => ({ loading: true, enabled: false, providers: [], user: null }));

export async function loadAccount(): Promise<void> {
  try {
    const res = await fetch("/api/me", { cache: "no-store" });
    const data = (await res.json()) as Omit<Account, "loading">;
    useAccount.setState({ loading: false, enabled: data.enabled, providers: data.providers, user: data.user });
  } catch {
    // 오프라인이면 마지막으로 알던 상태를 둔다.
    useAccount.setState({ loading: false });
  }
}

export const loginHref = (provider: "google" | "kakao", opts: { next?: string; invite?: string } = {}) => {
  const q = new URLSearchParams();
  if (opts.next) q.set("next", opts.next);
  if (opts.invite) q.set("invite", opts.invite);
  const s = q.toString();
  return `/api/auth/${provider}/login${s ? `?${s}` : ""}`;
};
