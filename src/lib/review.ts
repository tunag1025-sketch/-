import { cardKey } from "./cards";
import { isDue } from "./srs";
import { dayKey } from "./stats";
import type { CardState, Song, VocabItem } from "./types";

export const DAILY_NEW_OPTIONS = [10, 20, 30, 50] as const;
/** 직접 정할 때의 범위 */
export const DAILY_NEW_MIN = 1;
export const DAILY_NEW_MAX = 300;

/** 직접 넣은 하루 학습량을 범위 안의 정수로 맞춘다. 숫자가 아니면 null. */
export function clampDailyNew(input: string): number | null {
  const n = Math.round(Number(input));
  if (!input.trim() || !Number.isFinite(n)) return null;
  return Math.min(DAILY_NEW_MAX, Math.max(DAILY_NEW_MIN, n));
}
/** '더 학습하기'로 한 번에 더하는 새 단어 수 */
export const EXTRA_NEW = 10;

/** 오늘 더 배울 수 있는 새 단어 수 */
export function remainingNew(dailyNew: number, newLog: Record<string, number>, now: number): number {
  return Math.max(0, dailyNew - (newLog[dayKey(now)] ?? 0));
}

/**
 * 학습할 카드 목록: 기한이 된 카드 먼저(오래된 순), 그다음 새 카드(최근 노래부터).
 * 장기기억 단어는 넣지 않는다. songId를 주면 그 노래 단어만.
 * 여러 노래에 나오는 단어는 한 번만 넣는다 (카드를 같이 쓰니 다른 노래에서 배웠으면 새 단어가 아니다).
 */
export function buildQueue(
  songs: Record<string, Song>,
  order: string[],
  cards: Record<string, CardState>,
  now: number,
  opts: { songId?: string; newLimit: number },
): { queue: VocabItem[]; dueCount: number; newCount: number; freshTotal: number } {
  const due: VocabItem[] = [];
  const fresh: VocabItem[] = [];
  const seen = new Set<string>();
  for (const id of order) {
    if (opts.songId && id !== opts.songId) continue;
    const song = songs[id];
    if (!song || song.status !== "ready") continue;
    for (const item of song.vocab) {
      const key = cardKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      const card = cards[key];
      if (!card) fresh.push(item);
      else if (isDue(card, now)) due.push(item);
    }
  }
  due.sort((a, b) => cards[cardKey(a)].due - cards[cardKey(b)].due);
  const newTaken = fresh.slice(0, opts.newLimit);
  return { queue: [...due, ...newTaken], dueCount: due.length, newCount: newTaken.length, freshTotal: fresh.length };
}

/** 학습 화면 주소. extra만큼 오늘 새 단어를 더 배운다. */
export function reviewHref(songId?: string, extra = 0): string {
  const q = new URLSearchParams();
  if (songId) q.set("song", songId);
  if (extra) q.set("extra", String(extra));
  const s = q.toString();
  return s ? `/review?${s}` : "/review";
}
