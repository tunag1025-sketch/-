"use client";

import { useEffect } from "react";
import { loadAccount, useAccount } from "@/lib/account";
import demoSong from "@/lib/demo-song.json";
import { explanationKey, useHydrated, useStore } from "@/lib/store";
import { startSync, stopSync } from "@/lib/sync";
import type { Song } from "@/lib/types";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const finish = () => {
      const state = useStore.getState();
      // 처음 연 사람에게는 바로 둘러볼 수 있게 데모곡을 하나 넣어 둔다.
      if (!state.seededDemo) {
        if (!state.songs[demoSong.id]) {
          const { explanations, ...song } = demoSong;
          state.addSong({ ...(song as Song), createdAt: Date.now() });
          for (const [line, exp] of Object.entries(explanations)) {
            state.setExplanation(explanationKey(demoSong.id, Number(line)), exp);
          }
        }
        state.markDemoSeeded();
      }
      useHydrated.setState({ hydrated: true });
      void loadAccount();
    };
    const result = useStore.persist.rehydrate();
    if (result instanceof Promise) result.then(finish, finish);
    else finish();

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    }
  }, []);

  // 로그인했으면 이 기기의 기록을 계정과 맞춘다.
  const userId = useAccount((s) => s.user?.id);
  const hydrated = useHydrated((s) => s.hydrated);
  useEffect(() => {
    if (!hydrated || !userId) return;
    startSync(userId);
    return () => stopSync();
  }, [hydrated, userId]);

  return children;
}
