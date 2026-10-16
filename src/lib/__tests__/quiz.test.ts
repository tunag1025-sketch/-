import { describe, expect, it } from "vitest";
import demo from "../demo-song.json";
import { blankAnswer, canAsk, makeChoices, pickQuizType, readingMatches } from "../quiz";
import type { Song, VocabItem } from "../types";

const song = demo as unknown as Song;
const pool = song.vocab;
const find = (word: string) => pool.find((v) => v.word === word) as VocabItem;

describe("quiz", () => {
  it("finds the part of the lyric line to blank out", () => {
    expect(blankAnswer(find("星"), song)).toBe("星");
    const item = find("眠る");
    expect(song.lines[item.lines[0]].text).toContain(blankAnswer(item, song)!);
  });

  it("asks new words as recall first", () => {
    expect(pickQuizType(["choice", "blank"], find("星"), song, pool.length, true)).toBe("recall");
    expect(pickQuizType(["choice"], find("星"), song, pool.length, false)).toBe("choice");
  });

  it("skips types that do not fit the word", () => {
    expect(canAsk("reading", find("しまう"), song, pool.length)).toBe(false);
    expect(canAsk("reading", find("星"), song, pool.length)).toBe(true);
    expect(canAsk("choice", find("星"), song, 3)).toBe(false);
    expect(pickQuizType(["reading"], find("しまう"), song, pool.length, false)).toBe("recall");
  });

  it("makes four distinct choices including the answer", () => {
    const item = find("星");
    for (let i = 0; i < 20; i++) {
      const choices = makeChoices(item, item.word, pool, (v) => v.word);
      expect(choices).toHaveLength(4);
      expect(new Set(choices).size).toBe(4);
      expect(choices).toContain("星");
    }
  });

  it("accepts katakana or spaces in a typed reading", () => {
    expect(readingMatches("よあけ", "よあけ")).toBe(true);
    expect(readingMatches("ヨアケ", "よあけ")).toBe(true);
    expect(readingMatches(" よ あけ ", "よあけ")).toBe(true);
    expect(readingMatches("よる", "よあけ")).toBe(false);
    expect(readingMatches("", "よあけ")).toBe(false);
  });
});
