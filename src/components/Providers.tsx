"use client";

import { useEffect } from "react";
import { loadAccount, useAccount } from "@/lib/account";
import { useInFlight } from "@/lib/api-client";
import demoSong from "@/lib/demo-song.json";
import { explanationKey, useHydrated, useStore } from "@/lib/store";
import { applyPreviewTheme, PREVIEW, PREVIEW_ANALYZING_ID, PREVIEW_GUEST } from "@/lib/preview";
import { hideSplash } from "@/lib/splash";
import { startSync, stopSync, useSyncStatus } from "@/lib/sync";
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
      if (PREVIEW) {
        // 미리보기: 단어장을 만드는 중인 노래와 동기화된 상태를 그대로 보여 준다.
        useInFlight.setState({ ids: new Set([PREVIEW_ANALYZING_ID]) });
        if (!PREVIEW_GUEST) useSyncStatus.setState({ status: "synced", lastSynced: Date.now() - 2 * 60_000 });
        applyPreviewTheme();
      }
      useHydrated.setState({ hydrated: true });
      hideSplash();
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
    // 미리보기 데이터는 계정에 올리지 않는다.
    if (!hydrated || !userId || PREVIEW) return;
    startSync(userId);
    return () => stopSync();
  }, [hydrated, userId]);

  return children;
}
