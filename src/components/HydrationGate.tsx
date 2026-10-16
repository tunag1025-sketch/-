"use client";

import { useHydrated } from "@/lib/store";

/** 이 기기에 저장된 데이터를 읽기 전에는 자리만 잡아 둔다. */
export function HydrationGate({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated((s) => s.hydrated);
  if (!hydrated) {
    return (
      <div className="space-y-3 pt-6" aria-busy>
        <div className="h-8 w-40 animate-pulse rounded-xl bg-surface-2" />
        <div className="h-24 animate-pulse rounded-3xl bg-surface-2" />
        <div className="h-24 animate-pulse rounded-3xl bg-surface-2" />
      </div>
    );
  }
  return children;
}
