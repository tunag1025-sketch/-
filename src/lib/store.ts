"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { newCard, schedule } from "./srs";
import { dayKey } from "./stats";
import type { CardState, Grade, Level, LineExplanation, Song } from "./types";

type Settings = {
  furigana: boolean;
  defaultLevel: Level;
};

type State = {
  songs: Record<string, Song>;
  /** 최근에 추가한 노래가 앞 */
  order: string[];
  cards: Record<string, CardState>;
  explanations: Record<string, LineExplanation>;
  /** 날짜(YYYY-MM-DD)별로 답한 카드 수 */
  reviewLog: Record<string, number>;
  settings: Settings;
  seededDemo: boolean;

  addSong: (song: Song) => void;
  /** 새 노래를 만들어 저장하고 id를 돌려준다. */
  createSong: (song: Pick<Song, "title" | "artist" | "level" | "lines">) => string;
  updateSong: (id: string, patch: Partial<Song>) => void;
  removeSong: (id: string) => void;
  grade: (vocabId: string, grade: Grade) => void;
  setSuspended: (vocabId: string, suspended: boolean) => void;
  setExplanation: (key: string, explanation: LineExplanation) => void;
  setSettings: (patch: Partial<Settings>) => void;
  markDemoSeeded: () => void;
};

export const explanationKey = (songId: string, line: number) => `${songId}:${line}`;

export const useStore = create<State>()(
  persist(
    (set) => ({
      songs: {},
      order: [],
      cards: {},
      explanations: {},
      reviewLog: {},
      settings: { furigana: true, defaultLevel: "N4" },
      seededDemo: false,

      addSong: (song) =>
        set((s) => ({
          songs: { ...s.songs, [song.id]: song },
          order: [song.id, ...s.order.filter((id) => id !== song.id)],
        })),

      createSong: (data) => {
        const id = crypto.randomUUID().slice(0, 8);
        const song: Song = { ...data, id, createdAt: Date.now(), status: "analyzing", vocab: [], grammar: [] };
        set((s) => ({ songs: { ...s.songs, [id]: song }, order: [id, ...s.order] }));
        return id;
      },

      updateSong: (id, patch) =>
        set((s) => (s.songs[id] ? { songs: { ...s.songs, [id]: { ...s.songs[id], ...patch } } } : s)),

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
          };
        }),

      grade: (vocabId, grade) =>
        set((s) => {
          const now = Date.now();
          const day = dayKey(now);
          return {
            cards: { ...s.cards, [vocabId]: schedule(s.cards[vocabId] ?? newCard(now), grade, now) },
            reviewLog: { ...s.reviewLog, [day]: (s.reviewLog[day] ?? 0) + 1 },
          };
        }),

      setSuspended: (vocabId, suspended) =>
        set((s) => ({
          cards: { ...s.cards, [vocabId]: { ...(s.cards[vocabId] ?? newCard(Date.now())), suspended } },
        })),

      setExplanation: (key, explanation) =>
        set((s) => ({ explanations: { ...s.explanations, [key]: explanation } })),

      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      markDemoSeeded: () => set({ seededDemo: true }),
    }),
    {
      name: "utango-v1",
      storage: createJSONStorage(() => localStorage),
      // 서버 렌더와 첫 클라이언트 렌더를 맞추기 위해 마운트 후에 직접 rehydrate 한다.
      skipHydration: true,
    },
  ),
);

/** persist 복원이 끝났는지 */
export const useHydrated = create<{ hydrated: boolean }>(() => ({ hydrated: false }));
