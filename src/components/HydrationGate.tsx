"use client";

import { useHydrated } from "@/lib/store";

/** 이 기기에 저장된 데이터를 읽기 전에는 자리만 잡아 둔다. */
export function HydrationGate({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated((s) => s.hydrated);
  if (!hydrated) {
    return (
      <div className="space-y-4 pt-8" aria-busy>
        <div className="h-9 w-44 animate-pulse rounded-2xl bg-white/50" />
        <div className="h-28 animate-pulse rounded-3xl bg-white/50" />
        <div className="h-20 animate-pulse rounded-3xl bg-white/50" />
      </div>
    );
  }
  return children;
}
