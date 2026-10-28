import { cardKey, grammarKey, kanjiKey, uniqueVocab } from "./cards";
import type { Settings } from "./data";
import type { GrammarItem } from "./grammar";
import { isDue } from "./srs";
import { dayKey } from "./stats";
import type { CardState, JlptTag, Song, VocabItem } from "./types";

export const DAILY_NEW_OPTIONS = [10, 20, 30, 50] as const;
/** 직접 정할 때의 범위 */
export const DAILY_NEW_MIN = 1;
export const DAILY_NEW_MAX = 300;

/** 직접 넣은 하루 학습량을 1~max 안의 정수로 맞춘다. 숫자가 아니면 null. */
export function clampAmount(input: string, max: number): number | null {
  const n = Math.round(Number(input));
  if (!input.trim() || !Number.isFinite(n)) return null;
  return Math.min(max, Math.max(DAILY_NEW_MIN, n));
}
export const clampDailyNew = (input: string) => clampAmount(input, DAILY_NEW_MAX);
/** '더 학습하기'로 한 번에 더하는 새 단어 수 */
export const EXTRA_NEW = 10;

/** 하루 복습 수 고르기 (null = 기한이 된 것 모두) */
export const DAILY_REVIEW_OPTIONS = [null, 50, 100, 200] as const;
export const DAILY_REVIEW_MAX = 999;
/** '복습 더 하기'로 한 번에 더하는 복습 수 */
export const EXTRA_REVIEW = 20;

/** 오늘 더 배울 수 있는 새 단어 수 */
export function remainingNew(dailyNew: number, newLog: Record<string, number>, now: number): number {
  return Math.max(0, dailyNew - (newLog[dayKey(now)] ?? 0));
}

const KANJI = kanjiKey("");

/** 오늘 이미 복습한 카드 수: 오늘 답한 카드 중 오늘 처음 배운 게 아닌 것 (카드마다 한 번, 한자 카드는 빼고) */
export function reviewedToday(cards: Record<string, CardState>, now: number): number {
  const today = dayKey(now);
  let n = 0;
  for (const [key, c] of Object.entries(cards)) {
    if (key.startsWith(KANJI) || !c.lastReviewed || dayKey(c.lastReviewed) !== today) continue;
    if (c.firstReviewed !== undefined && dayKey(c.firstReviewed) === today) continue;
    n++;
  }
  return n;
}

/** 오늘 더 볼 수 있는 복습 수. 하루 복습 수를 정하지 않았으면 끝이 없다(Infinity). */
export function remainingReviews(dailyReview: number | null, cards: Record<string, CardState>, now: number): number {
  return dailyReview === null ? Infinity : Math.max(0, dailyReview - reviewedToday(cards, now));
}

/** 오늘 학습 몫: 새 단어 수와 복습 수. 더 학습하기로 늘린 만큼(extra) 더한다. */
export function todayLimits(
  state: { settings: Pick<Settings, "dailyNew" | "dailyReview">; newLog: Record<string, number>; cards: Record<string, CardState> },
  now: number,
  extra: { fresh?: number; review?: number } = {},
): { newLimit: number; reviewLimit: number } {
  const { dailyNew, dailyReview } = state.settings;
  return {
    newLimit: remainingNew(dailyNew + (extra.fresh ?? 0), state.newLog, now),
    reviewLimit: remainingReviews(dailyReview === null ? null : dailyReview + (extra.review ?? 0), state.cards, now),
  };
}

/** 학습 범위로 고르는 JLPT 레벨 (쉬운 것부터). 'N4'를 고르면 N5·N4 단어 */
export const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;
export type JlptLevel = (typeof JLPT_LEVELS)[number];

export const parseJlpt = (value: string | null | undefined): JlptLevel | undefined =>
  JLPT_LEVELS.find((l) => l === value);

/** 고른 레벨까지에 드는 단어인지. 레벨을 모르는 단어(기타)는 넣지 않는다. */
export function withinJlpt(tag: JlptTag, max: JlptLevel): boolean {
  const i = JLPT_LEVELS.indexOf(tag as JlptLevel);
  return i >= 0 && i <= JLPT_LEVELS.indexOf(max);
}

/** 학습 목록의 한 장: 단어 카드거나, 노래 속 문형 카드 */
export type QueueEntry =
  | { kind: "word"; id: string; key: string; item: VocabItem }
  | { kind: "grammar"; id: string; key: string; item: GrammarItem };

/**
 * 학습할 카드 목록: 기한이 된 카드 먼저(오래된 순), 그다음 새 카드.
 * 새 카드는 노래마다 돌아가며 하나씩 고른다(최근 노래부터). 한 노래 안에서는 가사 줄 순서로 단어와 문형을 섞는다
 * (같은 줄이면 단어 다음에 문형). 학습 화면은 이 목록을 다시 섞어서 보여 준다(mixQueue).
 * 문형도 단어처럼 함께 학습하고 하루 새 단어 몫도 같이 쓴다.
 * 장기기억은 넣지 않는다. songId를 주면 그 노래 것만. jlpt를 주면 그 레벨까지의 단어만 (문형은 레벨이 없어 뺀다).
 * reviewLimit을 주면 기한이 된 카드도 그만큼만 (오래 밀린 것부터).
 * 여러 노래에 나오는 단어·문형은 한 번만 넣는다 (카드를 같이 쓰니 다른 노래에서 배웠으면 새 카드가 아니다).
 */
export function buildQueue(
  songs: Record<string, Song>,
  order: string[],
  cards: Record<string, CardState>,
  now: number,
  opts: { songId?: string; newLimit: number; reviewLimit?: number; jlpt?: JlptLevel },
): { queue: QueueEntry[]; dueCount: number; dueTotal: number; newCount: number; freshTotal: number } {
  const due: QueueEntry[] = [];
  // 노래마다 아직 안 배운 카드
  const freshBySong: QueueEntry[][] = [];
  const seen = new Set<string>();
  const add = (entry: QueueEntry, fresh: QueueEntry[]) => {
    if (seen.has(entry.key)) return;
    seen.add(entry.key);
    const card = cards[entry.key];
    if (!card) fresh.push(entry);
    else if (isDue(card, now)) due.push(entry);
  };
  for (const id of order) {
    if (opts.songId && id !== opts.songId) continue;
    const song = songs[id];
    if (!song || song.status !== "ready") continue;
    const { jlpt } = opts;
    const inSong: { line: number; entry: QueueEntry }[] = [
      ...song.vocab
        .filter((item) => !jlpt || withinJlpt(item.jlpt, jlpt))
        .map((item) => ({
        line: item.lines.length ? Math.min(...item.lines) : Infinity,
        entry: { kind: "word", id: item.id, key: cardKey(item), item } as const,
      })),
      ...(jlpt ? [] : song.grammar).map((g, i) => {
        const key = grammarKey(g.pattern);
        return { line: g.line + 0.5, entry: { kind: "grammar", id: `${song.id}#${i}`, key, item: { ...g, key, song } } as const };
      }),
    ];
    const fresh: QueueEntry[] = [];
    for (const { entry } of inSong.sort((a, b) => a.line - b.line)) add(entry, fresh);
    freshBySong.push(fresh);
  }
  due.sort((a, b) => cards[a.key].due - cards[b.key].due);
  // 한 노래를 다 배우기 전에도 여러 노래 단어가 고루 나오게 한 바퀴씩 돌며 고른다.
  const fresh: QueueEntry[] = [];
  const longest = Math.max(0, ...freshBySong.map((list) => list.length));
  for (let i = 0; i < longest; i++) fresh.push(...freshBySong.flatMap((list) => (i < list.length ? [list[i]] : [])));
  const newTaken = fresh.slice(0, opts.newLimit);
  const dueTaken = due.slice(0, opts.reviewLimit ?? Infinity);
  return {
    queue: [...dueTaken, ...newTaken],
    dueCount: dueTaken.length,
    dueTotal: due.length,
    newCount: newTaken.length,
    freshTotal: fresh.length,
  };
}

/** 학습 화면에 낼 순서: 노래·가사 순서대로 외우지 않게 섞는다 (기한이 된 카드와 새 카드도 섞인다). */
export function mixQueue<T>(list: T[], rand: () => number = Math.random): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** '다시'를 이만큼 이상 고른 단어를 자주 틀린 단어로 본다. */
export const WEAK_LAPSES = 2;
/** 자주 틀린 단어를 한 번에 이만큼까지 */
export const WEAK_LIMIT = 20;

/** 자주 틀린 단어: 아직 장기기억이 아니고 '다시'를 여러 번 고른 단어 (많이 틀린 순). 기한과 상관없이 다시 본다. */
export function weakWords(songs: Record<string, Song>, order: string[], cards: Record<string, CardState>): VocabItem[] {
  const lapses = (v: VocabItem) => cards[cardKey(v)]?.lapses ?? 0;
  return uniqueVocab(songs, order)
    .filter((v) => {
      const card = cards[cardKey(v)];
      return !!card && !card.learned && card.lapses >= WEAK_LAPSES;
    })
    .sort((a, b) => lapses(b) - lapses(a) || cards[cardKey(a)].due - cards[cardKey(b)].due);
}

/** 한자·자주 틀린 단어 학습 주소 */
export const KANJI_HREF = "/review?kind=kanji";
export const WEAK_HREF = "/review?kind=weak";

/**
 * 학습 화면 주소. extra만큼 오늘 새 단어를, extraReview만큼 복습을 더 한다.
 * jlpt를 주면 그 레벨까지의 단어만.
 */
export function reviewHref(songId?: string, extra = 0, jlpt?: JlptLevel, extraReview = 0): string {
  const q = new URLSearchParams();
  if (songId) q.set("song", songId);
  if (extra) q.set("extra", String(extra));
  if (extraReview) q.set("more", String(extraReview));
  if (jlpt) q.set("level", jlpt);
  const s = q.toString();
  return s ? `/review?${s}` : "/review";
}
