import { describe, expect, it } from "vitest";
import { buildDeck, grammarKey, isWordKey, kanjiKey, normalizeCardKey } from "../cards";
import { patternCore, uniqueGrammar } from "../grammar";
import type { KanjiInfo } from "../kanji";
import { kanjiDeck } from "../kanji-deck";
import { weakWords } from "../review";
import { newCard } from "../srs";
import type { CardState, GrammarPoint, Song, VocabItem } from "../types";

const now = 1_700_000_000_000;

function song(id: string, words: string[], grammar: Partial<GrammarPoint>[] = []): Song {
  const vocab = words.map((word) => ({ id: `${id}:${word}`, songId: id, word }) as unknown as VocabItem);
  return {
    id,
    title: id,
    artist: "",
    level: "N4",
    createdAt: 0,
    lines: [],
    status: "ready",
    vocab,
    grammar: grammar.map((g) => ({ pattern: "", meaning: "", line: 0, explanation: "", ...g })),
  };
}

describe("grammar and kanji card keys", () => {
  it("treats tilde and spacing differences as the same pattern", () => {
    expect(grammarKey("〜ても")).toBe(grammarKey("~ても"));
    expect(grammarKey("～ても")).toBe(grammarKey(" 〜 ても"));
  });

  it("never looks like a word key or an old song:word key", () => {
    expect(isWordKey(grammarKey("〜ても"))).toBe(false);
    expect(isWordKey(kanjiKey("夜"))).toBe(false);
    expect(isWordKey("夜")).toBe(true);
    expect(normalizeCardKey(grammarKey("〜ても"))).toBe(grammarKey("〜ても"));
    expect(normalizeCardKey(kanjiKey("夜"))).toBe(kanjiKey("夜"));
  });
});

describe("buildDeck", () => {
  it("puts due cards first, then new ones up to the limit, and skips learned or not-yet-due cards", () => {
    const cards: Record<string, CardState> = {
      b: { ...newCard(now), due: now - 10 },
      c: { ...newCard(now), due: now - 50 },
      d: { ...newCard(now), learned: true },
      e: { ...newCard(now), due: now + 1000 },
    };
    const deck = buildDeck(["a", "b", "c", "d", "e", "f", "g"], cards, now, 2);
    expect(deck.queue).toEqual(["c", "b", "a", "f"]);
    expect([deck.dueCount, deck.newCount, deck.freshTotal]).toEqual([2, 2, 3]);
  });
});

describe("uniqueGrammar", () => {
  it("lists each pattern once, newest song first, and can stay in one song", () => {
    const songs = {
      a: song("a", [], [{ pattern: "〜ても" }, { pattern: "〜ば" }]),
      b: song("b", [], [{ pattern: "~ても", meaning: "b" }, { pattern: "〜ていく" }]),
    };
    const all = uniqueGrammar(songs, ["b", "a"]);
    expect(all.map((g) => `${g.song.id}:${g.pattern}`)).toEqual(["b:~ても", "b:〜ていく", "a:〜ば"]);
    expect(uniqueGrammar(songs, ["b", "a"], "a").map((g) => g.pattern)).toEqual(["〜ても", "〜ば"]);
    expect(patternCore("〜ても")).toBe("ても");
    expect(patternCore("동사 ます형 + 出す")).toBe("ます出す");
  });
});

describe("kanjiDeck", () => {
  it("collects each kanji once with the words that use it, skipping kanji without a meaning", () => {
    const info = (char: string): KanjiInfo => ({ char, hun: char === "前" ? "" : `${char}훈`, grade: 2, strokes: 8, on: [], kun: [] });
    const songs = { a: song("a", ["夜明け", "夜", "前", "ひとつ"]) };
    const deck = kanjiDeck(songs, ["a"], info);
    expect(deck.map((k) => k.char)).toEqual(["夜", "明"]);
    expect(deck[0].words.map((v) => v.word)).toEqual(["夜明け", "夜"]);
  });
});

describe("weakWords", () => {
  it("keeps words chosen 'again' twice or more that are not learned yet, most missed first", () => {
    const songs = { a: song("a", ["一", "二", "三", "四"]) };
    const cards: Record<string, CardState> = {
      一: { ...newCard(now), lapses: 2 },
      二: { ...newCard(now), lapses: 5 },
      三: { ...newCard(now), lapses: 1 },
      四: { ...newCard(now), lapses: 4, learned: true },
    };
    expect(weakWords(songs, ["a"], cards).map((v) => v.word)).toEqual(["二", "一"]);
  });
});
