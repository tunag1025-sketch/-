"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { LEARNED_INTERVAL_DAYS, newCard, schedule } from "./srs";
import { dayKey } from "./stats";
import { DEFAULT_SETTINGS, mergeData, type Settings, type UserData } from "./data";
import type { CardState, Grade, LineExplanation, Song } from "./types";

type State = UserData & {
  seededDemo: boolean;

  addSong: (song: Song) => void;
  /** 새 노래를 만들어 저장하고 id를 돌려준다. */
  createSong: (song: Pick<Song, "title" | "artist" | "level" | "lines">) => string;
  updateSong: (id: string, patch: Partial<Song>) => void;
  removeSong: (id: string) => void;
  grade: (vocabId: string, grade: Grade) => void;
  /** 외운 단어로 옮기거나 다시 학습 목록으로 돌린다. */
  setLearned: (vocabId: string, learned: boolean) => void;
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

export const explanationKey = (songId: string, line: number) => `${songId}:${line}`;

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

      removeSong: (id) =>
        set((s) => {
          const { [id]: removed, ...songs } = s.songs;
          if (!removed) return s;
          const prefix = `${id}:`;
          const keep = <T,>(rec: Record<string, T>) =>
            Object.fromEntries(Object.entries(rec).filter(([key]) => !key.startsWith(prefix)));
          return {
            songs,
            order: s.order.filter((x) => x !== id),
            cards: keep(s.cards),
            explanations: keep(s.explanations),
            deleted: { ...s.deleted, [id]: Date.now() },
          };
        }),

      grade: (vocabId, grade) =>
        set((s) => {
          const now = Date.now();
          const day = dayKey(now);
          const isNew = !s.cards[vocabId];
          return {
            cards: { ...s.cards, [vocabId]: { ...schedule(s.cards[vocabId] ?? newCard(now), grade, now), updatedAt: now } },
            reviewLog: { ...s.reviewLog, [day]: (s.reviewLog[day] ?? 0) + 1 },
            newLog: isNew ? { ...s.newLog, [day]: (s.newLog[day] ?? 0) + 1 } : s.newLog,
          };
        }),

      setLearned: (vocabId, learned) =>
        set((s) => {
          const now = Date.now();
          const card = s.cards[vocabId] ?? newCard(now);
          // 다시 학습할 때는 연속 '완벽'을 지우고 바로 학습 목록에 올린다.
          const next: CardState = learned
            ? { ...card, learned: true, learnedAt: now, updatedAt: now }
            : { ...card, learned: false, learnedAt: undefined, perfect: 0, due: now, updatedAt: now };
          // 처음 보는 단어를 바로 외운 단어로 옮겨도 오늘 배운 새 단어로 센다.
          const day = dayKey(now);
          const isNew = !s.cards[vocabId];
          return {
            cards: { ...s.cards, [vocabId]: next },
            newLog: isNew ? { ...s.newLog, [day]: (s.newLog[day] ?? 0) + 1 } : s.newLog,
          };
        }),

      setExplanation: (key, explanation) =>
        set((s) => ({ explanations: { ...s.explanations, [key]: explanation } })),

      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      markDemoSeeded: () => set({ seededDemo: true }),

      importData: (incoming) => set((s) => mergeData(pickData(s), incoming, { honorDeletes: false })),
    }),
    {
      name: "utango-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: (persisted, version) => {
        const state = persisted as Partial<State> & { cards?: Record<string, CardState & { suspended?: boolean }> };
        if (version < 1 && state.cards) {
          // 예전 '복습에서 빼기'(suspended)와 3주 넘게 기억한 단어는 외운 단어로 옮긴다.
          state.cards = Object.fromEntries(
            Object.entries(state.cards).map(([id, { suspended, ...card }]) => {
              const learned = suspended === true || card.interval >= LEARNED_INTERVAL_DAYS;
              return [id, learned ? { ...card, learned, learnedAt: card.lastReviewed } : card];
            }),
          );
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
