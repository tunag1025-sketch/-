import { cardTime, putCard } from "./cards";
import { type Settings, songTime, type UserData } from "./data";
import { withNewQuizTypes } from "./quiz";
import type { CardState, LineExplanation, Song } from "./types";

/**
 * 서버와 주고받는 단위.
 *  song  노래 (deleted면 지운 노래)
 *  card  단어 카드의 학습 상태
 *  expl  가사 한 줄 해설
 *  day   날짜별 학습 수 ("r:날짜" 답한 수, "n:날짜" 새 단어 수). 서버는 큰 값을 남긴다.
 *  settings  설정
 */
export type EntityKind = "song" | "card" | "expl" | "day" | "settings";
export type Entity = { kind: EntityKind; key: string; data: unknown; updatedAt: number; deleted?: boolean };
export type Ref = `${EntityKind}|${string}`;

export type SyncState = UserData & { settingsUpdatedAt: number };

export const ref = (kind: EntityKind, key: string): Ref => `${kind}|${key}`;
export const parseRef = (r: Ref) => {
  const i = r.indexOf("|");
  return { kind: r.slice(0, i) as EntityKind, key: r.slice(i + 1) };
};

const songIdOf = (key: string) => key.slice(0, key.indexOf(":"));

/** 데모곡은 기기마다 따로 넣으니 올리지 않는다. */
function skip(state: SyncState, songId: string) {
  return state.songs[songId]?.isDemo === true;
}

/** 지금 데이터에서 동기화할 모든 항목의 ref (처음 로그인한 기기에서 전부 올릴 때) */
export function allRefs(state: SyncState): Ref[] {
  const refs: Ref[] = [];
  for (const id of Object.keys(state.songs)) if (!skip(state, id)) refs.push(ref("song", id));
  for (const id of Object.keys(state.deleted)) refs.push(ref("song", id));
  // 카드는 노래가 아니라 단어마다 하나라 데모곡 단어도 올린다.
  for (const key of Object.keys(state.cards)) refs.push(ref("card", key));
  for (const key of Object.keys(state.explanations))
    if (state.songs[songIdOf(key)] && !skip(state, songIdOf(key))) refs.push(ref("expl", key));
  for (const day of Object.keys(state.reviewLog)) refs.push(ref("day", `r:${day}`));
  for (const day of Object.keys(state.newLog)) refs.push(ref("day", `n:${day}`));
  refs.push(ref("settings", "settings"));
  return refs;
}

/** 두 상태를 비교해 바뀐 항목의 ref */
export function changedRefs(next: SyncState, prev: SyncState): Ref[] {
  const refs: Ref[] = [];
  const diff = <T,>(a: Record<string, T>, b: Record<string, T>, kind: EntityKind, fmt = (k: string) => k) => {
    if (a === b) return;
    for (const k of Object.keys(a)) if (a[k] !== b[k]) refs.push(ref(kind, fmt(k)));
    if (kind === "song") for (const k of Object.keys(b)) if (!(k in a)) refs.push(ref(kind, k));
  };
  diff(next.songs, prev.songs, "song");
  diff(next.cards, prev.cards, "card");
  diff(next.explanations, prev.explanations, "expl");
  diff(next.reviewLog, prev.reviewLog, "day", (d) => `r:${d}`);
  diff(next.newLog, prev.newLog, "day", (d) => `n:${d}`);
  if (next.settings !== prev.settings) refs.push(ref("settings", "settings"));
  return refs.filter((r) => {
    const { kind, key } = parseRef(r);
    if (kind === "song") return !skip(next, key) && !prev.songs[key]?.isDemo;
    if (kind === "expl") return !skip(next, songIdOf(key));
    return true;
  });
}

/** ref 하나를 서버로 보낼 항목으로. 보낼 게 없으면 null. */
export function toEntity(state: SyncState, r: Ref): Entity | null {
  const { kind, key } = parseRef(r);
  switch (kind) {
    case "song": {
      const song = state.songs[key];
      if (song) return { kind, key, data: song, updatedAt: songTime(song) };
      const at = state.deleted[key];
      return at ? { kind, key, data: null, updatedAt: at, deleted: true } : null;
    }
    case "card": {
      const card = state.cards[key];
      return card ? { kind, key, data: card, updatedAt: cardTime(card) } : null;
    }
    case "expl": {
      const e = state.explanations[key];
      return e ? { kind, key, data: e, updatedAt: 0 } : null;
    }
    case "day": {
      const log = key.startsWith("r:") ? state.reviewLog : state.newLog;
      const count = log[key.slice(2)];
      return count === undefined ? null : { kind, key, data: { count }, updatedAt: 0 };
    }
    case "settings":
      return { kind, key, data: state.settings, updatedAt: state.settingsUpdatedAt };
  }
}

/**
 * 서버에서 받은 항목을 지금 데이터에 반영한 새 상태. 더 나중에 바뀐 쪽을 남긴다.
 * 노래가 지워졌으면 그 노래의 해설도 지운다. 카드는 다른 노래와 같이 쓰니 남긴다.
 */
export function applyEntities(state: SyncState, entities: Entity[]): SyncState {
  const songs = { ...state.songs };
  const cards = { ...state.cards };
  const explanations = { ...state.explanations };
  const reviewLog = { ...state.reviewLog };
  const newLog = { ...state.newLog };
  const deleted = { ...state.deleted };
  let settings = state.settings;
  let settingsUpdatedAt = state.settingsUpdatedAt;

  for (const e of entities) {
    if (e.kind === "song") {
      const mine = songs[e.key];
      if (e.deleted) {
        if (mine && !mine.isDemo && songTime(mine) <= e.updatedAt) delete songs[e.key];
        deleted[e.key] = Math.max(deleted[e.key] ?? 0, e.updatedAt);
      } else if ((deleted[e.key] ?? -1) < e.updatedAt && (!mine || songTime(mine) < e.updatedAt)) {
        songs[e.key] = e.data as Song;
        delete deleted[e.key];
      }
    } else if (e.kind === "card") {
      // 옛 기기가 올린 카드(노래id:단어)는 같은 단어 카드와 합친다.
      putCard(cards, e.key, { ...(e.data as CardState), updatedAt: e.updatedAt });
    } else if (e.kind === "expl") {
      explanations[e.key] ??= e.data as LineExplanation;
    } else if (e.kind === "day") {
      const log = e.key.startsWith("r:") ? reviewLog : newLog;
      const day = e.key.slice(2);
      log[day] = Math.max(log[day] ?? 0, (e.data as { count: number }).count);
    } else if (e.kind === "settings" && e.updatedAt > settingsUpdatedAt) {
      // 예전 앱이 올린 설정에는 새 문제 유형이 없으니 켜 준다.
      const data = e.data as Partial<Settings>;
      settings = withNewQuizTypes({ ...settings, ...data, knownQuizTypes: data.knownQuizTypes });
      settingsUpdatedAt = e.updatedAt;
    }
  }

  for (const id of Object.keys(deleted)) {
    if (songs[id]) continue;
    for (const k of Object.keys(explanations)) if (songIdOf(k) === id) delete explanations[k];
  }
  const order = Object.values(songs)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((s) => s.id);
  return { songs, order, cards, explanations, reviewLog, newLog, deleted, settings, settingsUpdatedAt };
}

/** 보낼 항목을 대략 maxBytes 이하 묶음으로 나눈다 (서버 요청 크기 제한). */
export function chunkEntities(entities: Entity[], maxBytes = 900_000): Entity[][] {
  const chunks: Entity[][] = [];
  let current: Entity[] = [];
  let size = 0;
  for (const e of entities) {
    const s = JSON.stringify(e).length;
    if (current.length && size + s > maxBytes) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(e);
    size += s;
  }
  if (current.length) chunks.push(current);
  return chunks;
}
