import { DEFAULT_QUIZ_TYPES, type QuizType } from "./quiz";
import type { CardState, Level, LineExplanation, Song } from "./types";

export type Settings = {
  furigana: boolean;
  defaultLevel: Level;
  /** 하루에 새로 배울 단어 수 */
  dailyNew: number;
  /** 학습에 낼 문제 유형 */
  quizTypes: QuizType[];
};

export const DEFAULT_SETTINGS: Settings = {
  furigana: true,
  defaultLevel: "N4",
  dailyNew: 20,
  quizTypes: DEFAULT_QUIZ_TYPES,
};

/** 기기에 저장하고, 백업 파일과 동기화로 주고받는 학습 데이터 */
export type UserData = {
  songs: Record<string, Song>;
  /** 최근에 추가한 노래가 앞 */
  order: string[];
  cards: Record<string, CardState>;
  explanations: Record<string, LineExplanation>;
  /** 날짜(YYYY-MM-DD)별로 답한 카드 수 */
  reviewLog: Record<string, number>;
  /** 날짜별로 처음 학습한 새 단어 수 */
  newLog: Record<string, number>;
  settings: Settings;
  /** 지운 노래 id → 지운 시각. 다른 기기에서 되살아나지 않게 남겨 둔다. */
  deleted: Record<string, number>;
};

export const songTime = (s: Song) => s.updatedAt ?? s.createdAt;
export const cardTime = (c: CardState) => c.updatedAt ?? c.lastReviewed ?? 0;

const songOf = (key: string) => key.slice(0, key.indexOf(":"));

function maxPerDay(a: Record<string, number>, b: Record<string, number> = {}) {
  const out = { ...a };
  for (const [day, n] of Object.entries(b)) out[day] = Math.max(out[day] ?? 0, n);
  return out;
}

/**
 * 두 데이터를 합친다. 노래와 카드는 더 나중에 바뀐 쪽을, 해설은 양쪽 모두를, 기록은 날짜별 큰 값을 남긴다.
 * honorDeletes가 false면(백업 불러오기) 지웠던 노래도 되살린다.
 */
export function mergeData(local: UserData, incoming: Partial<UserData>, { honorDeletes }: { honorDeletes: boolean }): UserData {
  const songs = { ...local.songs };
  const cards = { ...local.cards };
  const explanations = { ...incoming.explanations, ...local.explanations };
  const deleted = { ...local.deleted };

  if (honorDeletes) {
    for (const [id, at] of Object.entries(incoming.deleted ?? {})) {
      deleted[id] = Math.max(deleted[id] ?? 0, at);
    }
  }

  for (const song of Object.values(incoming.songs ?? {})) {
    const mine = songs[song.id];
    if (honorDeletes && (deleted[song.id] ?? -1) >= songTime(song)) continue;
    if (!mine || songTime(song) > songTime(mine)) songs[song.id] = song;
    if (!honorDeletes) delete deleted[song.id];
  }
  for (const [key, card] of Object.entries(incoming.cards ?? {})) {
    const mine = cards[key];
    if (!mine || cardTime(card) > cardTime(mine)) cards[key] = card;
  }

  // 지운 뒤로 바뀐 적 없는 노래는 그 카드·해설과 함께 뺀다.
  if (honorDeletes) {
    for (const [id, at] of Object.entries(deleted)) {
      if (songs[id] && songTime(songs[id]) <= at) delete songs[id];
    }
    for (const rec of [cards, explanations]) {
      for (const key of Object.keys(rec)) if (!songs[songOf(key)] && deleted[songOf(key)]) delete rec[key];
    }
  }

  const order = Object.values(songs)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((s) => s.id);

  return {
    songs,
    order,
    cards,
    explanations,
    reviewLog: maxPerDay(local.reviewLog, incoming.reviewLog),
    newLog: maxPerDay(local.newLog, incoming.newLog),
    settings: local.settings,
    deleted,
  };
}

const BACKUP_APP = "utango";

export function makeBackup(data: UserData, now: number): string {
  const { songs, order, cards, explanations, reviewLog, newLog, settings } = data;
  return JSON.stringify({
    app: BACKUP_APP,
    version: 1,
    exportedAt: new Date(now).toISOString(),
    data: { songs, order, cards, explanations, reviewLog, newLog, settings },
  });
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** 백업 파일 내용을 읽는다. 이 앱의 백업이 아니면 null. */
export function parseBackup(text: string): Partial<UserData> | null {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(json) || json.app !== BACKUP_APP || !isRecord(json.data)) return null;
  const d = json.data;
  const songs = isRecord(d.songs) ? d.songs : {};
  const valid = Object.fromEntries(
    Object.entries(songs).filter(
      ([id, s]) => isRecord(s) && s.id === id && typeof s.title === "string" && Array.isArray(s.lines) && Array.isArray(s.vocab),
    ),
  ) as Record<string, Song>;
  return {
    songs: valid,
    cards: (isRecord(d.cards) ? d.cards : {}) as Record<string, CardState>,
    explanations: (isRecord(d.explanations) ? d.explanations : {}) as Record<string, LineExplanation>,
    reviewLog: (isRecord(d.reviewLog) ? d.reviewLog : {}) as Record<string, number>,
    newLog: (isRecord(d.newLog) ? d.newLog : {}) as Record<string, number>,
  };
}
