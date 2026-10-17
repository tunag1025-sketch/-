import { useSyncExternalStore } from "react";
import { PREVIEW } from "./preview";
import { useStore } from "./store";
import type { Song } from "./types";

/** 첫 안내(/onboarding)를 봤는지. 이 기기 브라우저에만 둔다. */
const KEY = "utango-onboarded";
const listeners = new Set<() => void>();

function seen(): boolean {
  try {
    return Boolean(localStorage.getItem(KEY));
  } catch {
    return true;
  }
}

export function markOnboarded() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // 저장할 수 없으면 다음에 한 번 더 보여도 괜찮다.
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** 데모곡 말고는 노래도 학습 기록도 없는 사람 */
export function isNewLearner(state: { songs: Record<string, Song>; order: string[]; reviewLog: Record<string, number> }) {
  return Object.keys(state.reviewLog).length === 0 && state.order.every((id) => state.songs[id]?.isDemo);
}

/**
 * 첫 안내를 띄울지: 안내를 본 적 없는 새 사람. 화면 미리보기에서는 띄우지 않는다.
 * 안내를 마치면 바로 바뀌게 구독한다 (앞서 연 홈 화면이 그대로 남아 있어도 다시 보내지 않게).
 */
export function useNeedsOnboarding(): boolean {
  const done = useSyncExternalStore(subscribe, seen, () => true);
  const fresh = useStore(isNewLearner);
  return !PREVIEW && !done && fresh;
}
