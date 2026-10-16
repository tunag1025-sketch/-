"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { migrateCards } from "./cards";
import { PREVIEW, previewStorage } from "./preview";
import { LEARNED_INTERVAL_DAYS, newCard, schedule } from "./srs";
import { dayKey } from "./stats";
import { DEFAULT_SETTINGS, explanationKey, mergeData, type Settings, type UserData } from "./data";
import type { CardState, Grade, LineExplanation, Song } from "./types";

type State = UserData & {
  seededDemo: boolean;
  /** 설정을 마지막으로 바꾼 시각 (동기화용) */
  settingsUpdatedAt: number;

  addSong: (song: Song) => void;
  /** 새 노래를 만들어 저장하고 id를 돌려준다. */
  createSong: (song: Pick<Song, "title" | "artist" | "level" | "lines">) => string;
  updateSong: (id: string, patch: Partial<Song>) => void;
  removeSong: (id: string) => void;
  /** key는 cardKey(단어)·grammarKey·kanjiKey. countNew를 끄면 하루 새 단어 몫에 세지 않는다. */
  grade: (key: string, grade: Grade, opts?: { countNew?: boolean }) => void;
  /** 장기기억으로 옮기거나 다시 학습 목록으로 돌린다. */
  setLearned: (key: string, learned: boolean, opts?: { countNew?: boolean }) => void;
  setExplanation: (key: string, explanation: LineExplanation) => void;
  setSettings: (patch: Partial<Settings>) => void;
  markDemoSeeded: () => void;
  /** 백업 파일 등에서 읽은 데이터를 지금 데이터와 합친다. */
  importData: (incoming: Partial<UserData>) => void;
};

/** 상태에서 학습 데이터 부분만 */
export function pickData(s: UserData): UserData {
  const { songs, order, cards, explanations, reviewLog, newLog, settings, deleted } = s;
  return { songs, order, cards, explanations, reviewLog, newLog, settings, deleted };
}

export { explanationKey };

const STORE_VERSION = 2;

export const useStore = create<State>()(
  persist(
    (set) => ({
      songs: {},
      order: [],
      cards: {},
      explanations: {},
      reviewLog: {},
      newLog: {},
      settings: DEFAULT_SETTINGS,
      deleted: {},
      seededDemo: false,
      settingsUpdatedAt: 0,

      addSong: (song) =>
        set((s) => ({
          songs: { ...s.songs, [song.id]: { ...song, updatedAt: Date.now() } },
          order: [song.id, ...s.order.filter((id) => id !== song.id)],
        })),

      createSong: (data) => {
        const id = crypto.randomUUID().slice(0, 8);
        const now = Date.now();
        const song: Song = { ...data, id, createdAt: now, updatedAt: now, status: "analyzing", vocab: [], grammar: [] };
        set((s) => ({ songs: { ...s.songs, [id]: song }, order: [id, ...s.order] }));
        return id;
      },

      updateSong: (id, patch) =>
        set((s) =>
          s.songs[id] ? { songs: { ...s.songs, [id]: { ...s.songs[id], ...patch, updatedAt: Date.now() } } } : s,
        ),

      // 단어 카드는 다른 노래와 같이 쓰니 남긴다 (같은 노래를 다시 넣으면 기록이 이어진다).
      removeSong: (id) =>
        set((s) => {
          const { [id]: removed, ...songs } = s.songs;
          if (!removed) return s;
          const prefix = `${id}:`;
          return {
            songs,
            order: s.order.filter((x) => x !== id),
            explanations: Object.fromEntries(Object.entries(s.explanations).filter(([key]) => !key.startsWith(prefix))),
            deleted: { ...s.deleted, [id]: Date.now() },
          };
        }),

      grade: (key, grade, { countNew = true } = {}) =>
        set((s) => {
          const now = Date.now();
          const day = dayKey(now);
          const isNew = !s.cards[key] && countNew;
          return {
            cards: { ...s.cards, [key]: { ...schedule(s.cards[key] ?? newCard(now), grade, now), updatedAt: now } },
            reviewLog: { ...s.reviewLog, [day]: (s.reviewLog[day] ?? 0) + 1 },
            newLog: isNew ? { ...s.newLog, [day]: (s.newLog[day] ?? 0) + 1 } : s.newLog,
          };
        }),

      setLearned: (key, learned, { countNew = true } = {}) =>
        set((s) => {
          const now = Date.now();
          const card = s.cards[key] ?? newCard(now);
          // 다시 학습할 때는 연속 '완벽'을 지우고 바로 학습 목록에 올린다.
          const next: CardState = learned
            ? { ...card, learned: true, learnedAt: now, updatedAt: now }
            : { ...card, learned: false, learnedAt: undefined, perfect: 0, due: now, updatedAt: now };
          // 처음 보는 단어를 바로 장기기억으로 옮겨도 오늘 배운 새 단어로 센다.
          const day = dayKey(now);
          const isNew = !s.cards[key] && countNew;
          return {
            cards: { ...s.cards, [key]: next },
            newLog: isNew ? { ...s.newLog, [day]: (s.newLog[day] ?? 0) + 1 } : s.newLog,
          };
        }),

      setExplanation: (key, explanation) =>
        set((s) => ({ explanations: { ...s.explanations, [key]: explanation } })),

      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch }, settingsUpdatedAt: Date.now() })),

      markDemoSeeded: () => set({ seededDemo: true }),

      importData: (incoming) => set((s) => mergeData(pickData(s), incoming, { honorDeletes: false })),
    }),
    {
      name: "utango-v1",
      // 화면 미리보기에서는 샘플 데이터를 이 탭에만 둔다 (진짜 기록은 건드리지 않는다).
      storage: createJSONStorage(() => (PREVIEW ? previewStorage(STORE_VERSION) : localStorage)),
      version: STORE_VERSION,
      migrate: (persisted, version) => {
        const state = persisted as Partial<State> & { cards?: Record<string, CardState & { suspended?: boolean }> };
        if (version < 1 && state.cards) {
          // 예전 '복습에서 빼기'(suspended)와 3주 넘게 기억한 단어는 장기기억으로 옮긴다.
          state.cards = Object.fromEntries(
            Object.entries(state.cards).map(([id, { suspended, ...card }]) => {
              const learned = suspended === true || card.interval >= LEARNED_INTERVAL_DAYS;
              return [id, learned ? { ...card, learned, learnedAt: card.lastReviewed } : card];
            }),
          );
        }
        if (version < 2 && state.cards) {
          // 노래마다 따로 있던 같은 단어 카드를 하나로 합친다 (더 많이 익힌 쪽을 남긴다).
          state.cards = migrateCards(state.cards);
        }
        return state as State;
      },
      // 설정에 새 항목이 생겨도 기본값이 채워지게 한 단계 더 합친다.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return { ...current, ...p, settings: { ...current.settings, ...p.settings } };
      },
      // 서버 렌더와 첫 클라이언트 렌더를 맞추기 위해 마운트 후에 직접 rehydrate 한다.
      skipHydration: true,
    },
  ),
);

/** persist 복원이 끝났는지 */
export const useHydrated = create<{ hydrated: boolean }>(() => ({ hydrated: false }));
