import { isDue } from "./srs";
import type { CardState, Song, VocabItem } from "./types";

export const NEW_PER_SESSION = 20;

/** 복습할 카드 목록: 기한이 된 카드 먼저(오래된 순), 그다음 새 카드(최근 노래부터). */
export function buildQueue(
  songs: Record<string, Song>,
  order: string[],
  cards: Record<string, CardState>,
  now: number,
  opts: { songId?: string; newLimit?: number } = {},
): { queue: VocabItem[]; dueCount: number; newCount: number } {
  const due: VocabItem[] = [];
  const fresh: VocabItem[] = [];
  for (const id of order) {
    if (opts.songId && id !== opts.songId) continue;
    const song = songs[id];
    if (!song || song.status !== "ready") continue;
    for (const item of song.vocab) {
      const card = cards[item.id];
      if (!card) fresh.push(item);
      else if (isDue(card, now)) due.push(item);
    }
  }
  due.sort((a, b) => cards[a.id].due - cards[b.id].due);
  const newTaken = fresh.slice(0, opts.newLimit ?? NEW_PER_SESSION);
  return { queue: [...due, ...newTaken], dueCount: due.length, newCount: newTaken.length };
}
