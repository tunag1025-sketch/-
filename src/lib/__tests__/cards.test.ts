import { describe, expect, it } from "vitest";
import { cardKey, migrateCards, normalizeCardKey, otherSongsWith, pickCard, uniqueVocab } from "../cards";
import type { CardState, Song, VocabItem } from "../types";

const card = (extra: Partial<CardState> = {}): CardState => ({ due: 0, interval: 1, ease: 2.5, reps: 1, lapses: 0, ...extra });

function song(id: string, words: string[], status: Song["status"] = "ready"): Song {
  const vocab = words.map((word) => ({ id: `${id}:${word}`, songId: id, word }) as unknown as VocabItem);
  return { id, title: id, artist: "", level: "N4", createdAt: 0, lines: [], status, vocab, grammar: [] };
}

describe("card keys", () => {
  it("uses the word itself, normalized", () => {
    expect(cardKey({ word: "君" })).toBe("君");
    expect(cardKey({ word: " ｶﾞﾗｽ " })).toBe("ガラス");
  });

  it("turns old song:word keys into word keys and leaves new ones alone", () => {
    expect(normalizeCardKey("a1b2c3d4:君")).toBe("君");
    expect(normalizeCardKey("demo-yoake:夜明け")).toBe("夜明け");
    expect(normalizeCardKey("君")).toBe("君");
    expect(normalizeCardKey("love")).toBe("love");
  });
});

describe("pickCard", () => {
  it("keeps the better-learned card and the later time", () => {
    const learned = card({ learned: true, interval: 3, updatedAt: 2 });
    const recent = card({ interval: 10, updatedAt: 8 });
    expect(pickCard(learned, recent)).toEqual({ ...learned, updatedAt: 8 });
    expect(pickCard(recent, learned)).toEqual({ ...learned, updatedAt: 8 });
    expect(pickCard(card({ interval: 2, updatedAt: 1 }), card({ interval: 6, updatedAt: 1 })).interval).toBe(6);
  });
});

describe("migrateCards", () => {
  it("merges the same word from different songs into one card", () => {
    const out = migrateCards({
      "aaaa1111:君": card({ interval: 8, correct: 3, updatedAt: 4 }),
      "bbbb2222:君": card({ interval: 0, correct: 0, reps: 0, updatedAt: 6 }),
      "aaaa1111:空": card({ updatedAt: 1 }),
    });
    expect(Object.keys(out).sort()).toEqual(["君", "空"]);
    expect(out["君"]).toMatchObject({ interval: 8, correct: 3, updatedAt: 6 });
  });
});

describe("uniqueVocab", () => {
  it("lists each word once, from the most recent song, skipping songs not ready", () => {
    const songs = { a: song("a", ["君", "空"]), b: song("b", ["君", "海"]), c: song("c", ["星"], "analyzing") };
    expect(uniqueVocab(songs, ["c", "b", "a"]).map((v) => v.id)).toEqual(["b:君", "b:海", "a:空"]);
    expect(otherSongsWith(songs, ["c", "b", "a"], songs.a.vocab[0]).map((s) => s.id)).toEqual(["b"]);
  });
});
