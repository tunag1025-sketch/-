import type { CardState, Song, VocabItem } from "./types";

/**
 * 단어 카드의 열쇠. 같은 단어는 어느 노래에서 나와도 카드 하나를 같이 쓴다.
 * (예전에는 `노래id:단어`였다. normalizeCardKey가 옛 열쇠를 바꿔 준다.)
 */
export const cardKey = (item: { word: string }) => item.word.normalize("NFKC").trim();

// 노래 id는 영문·숫자·하이픈이라 일본어 단어와 헷갈리지 않는다.
const LEGACY_KEY = /^[\w-]+:(.+)$/;

/** 예전 열쇠(`노래id:단어`)면 단어 열쇠로 바꾼다. */
export function normalizeCardKey(key: string): string {
  const m = LEGACY_KEY.exec(key);
  return m ? cardKey({ word: m[1] }) : key;
}

export const cardTime = (c: CardState) => c.updatedAt ?? c.lastReviewed ?? 0;

// 문법·한자 카드도 같은 cards에 둔다. 열쇠 앞에 붙는 말로 단어와 구분한다
// (한글이라 옛 열쇠 규칙 `노래id:단어`와도 겹치지 않는다).
const GRAMMAR = "문법:";
const KANJI = "한자:";

/** 문형 카드의 열쇠. 〜/~ 와 띄어쓰기 차이는 같은 문형으로 본다. */
export const grammarKey = (pattern: string) =>
  GRAMMAR + pattern.normalize("NFKC").replace(/[~〜～]/g, "〜").replace(/\s+/g, "");

export const kanjiKey = (char: string) => KANJI + char;

/** 단어 카드인지 (문법·한자 카드가 아닌지) */
export const isWordKey = (key: string) => !key.startsWith(GRAMMAR) && !key.startsWith(KANJI);

/**
 * 열쇠 목록(앞쪽이 먼저)으로 오늘 볼 카드: 기한이 된 카드(오래된 순) 뒤에 새 카드를 newLimit개까지.
 * 장기기억은 넣지 않는다. 문법·한자 카드에 쓴다.
 */
export function buildDeck(
  keys: string[],
  cards: Record<string, CardState>,
  now: number,
  newLimit: number,
): { queue: string[]; dueCount: number; newCount: number; freshTotal: number } {
  const due: string[] = [];
  const fresh: string[] = [];
  for (const key of new Set(keys)) {
    const card = cards[key];
    if (!card) fresh.push(key);
    else if (!card.learned && card.due <= now) due.push(key);
  }
  due.sort((a, b) => cards[a].due - cards[b].due);
  const taken = fresh.slice(0, newLimit);
  return { queue: [...due, ...taken], dueCount: due.length, newCount: taken.length, freshTotal: fresh.length };
}

/** 카드가 얼마나 익었는지 견줄 값: 장기기억 → 복습 간격 → 맞힌 횟수 → 최근에 본 쪽 */
function rank(c: CardState): number[] {
  return [c.learned ? 1 : 0, c.interval, c.correct ?? c.reps, cardTime(c)];
}

/**
 * 노래마다 따로 있던 같은 단어 카드 둘을 하나로: 더 많이 익힌 쪽을 남기고,
 * 고친 시각은 늦은 쪽으로 맞춰 다른 기기의 옛 카드에 밀리지 않게 한다.
 */
export function pickCard(a: CardState, b: CardState): CardState {
  const ra = rank(a);
  const rb = rank(b);
  const i = ra.findIndex((x, n) => x !== rb[n]);
  const best = i >= 0 && rb[i] > ra[i] ? b : a;
  return { ...best, updatedAt: Math.max(cardTime(a), cardTime(b)) };
}

/**
 * 동기화·백업에서 온 카드를 넣는다. 옛 열쇠면 같은 단어 카드와 합치고,
 * 같은 열쇠면 나중에 바뀐 쪽을 남긴다. cards를 직접 고친다.
 */
export function putCard(cards: Record<string, CardState>, key: string, card: CardState): void {
  const k = normalizeCardKey(key);
  const mine = cards[k];
  if (!mine) cards[k] = card;
  else if (k !== key) cards[k] = pickCard(mine, card);
  else if (cardTime(mine) < cardTime(card)) cards[k] = card;
}

/** 옛 열쇠 카드를 모두 단어 열쇠로 옮긴다. */
export function migrateCards(cards: Record<string, CardState>): Record<string, CardState> {
  const out: Record<string, CardState> = {};
  for (const [key, card] of Object.entries(cards)) putCard(out, key, card);
  return out;
}

/** 단어의 카드 (아직 학습 전이면 undefined) */
export const cardOf = (cards: Record<string, CardState>, item: { word: string }): CardState | undefined =>
  cards[cardKey(item)];

/** 준비된 노래들의 단어를 단어마다 하나씩. 여러 노래에 나오면 최근 노래 것을 쓴다. */
export function uniqueVocab(songs: Record<string, Song>, order: string[]): VocabItem[] {
  const seen = new Set<string>();
  const out: VocabItem[] = [];
  for (const id of order) {
    const song = songs[id];
    if (song?.status !== "ready") continue;
    for (const item of song.vocab) {
      const key = cardKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

/** 이 단어가 함께 나오는 다른 노래 */
export function otherSongsWith(songs: Record<string, Song>, order: string[], item: VocabItem): Song[] {
  const key = cardKey(item);
  return order
    .filter((id) => id !== item.songId)
    .map((id) => songs[id])
    .filter((s): s is Song => s?.status === "ready" && s.vocab.some((v) => cardKey(v) === key));
}
