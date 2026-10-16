"use client";

import { useEffect } from "react";
import demoSong from "@/lib/demo-song.json";
import { explanationKey, useHydrated, useStore } from "@/lib/store";
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
    };
    const result = useStore.persist.rehydrate();
    if (result instanceof Promise) result.then(finish, finish);
    else finish();

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    }
  }, []);

  return children;
}
