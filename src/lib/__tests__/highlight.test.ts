import { describe, expect, it } from "vitest";
import { matchTokens } from "../highlight";
import type { LyricLine, VocabItem } from "../types";

const line: LyricLine = {
  text: "君の名前を呼んだ夜に",
  tokens: ["君", "の", "名前", "を", "呼ん", "だ", "夜", "に"].map((surface) => ({
    surface,
    base: surface === "呼ん" ? "呼ぶ" : surface,
    pos: "",
    segs: [{ t: surface }],
  })),
};

const vocab = (word: string, formInSong: string, lines = [0]): VocabItem => ({
  id: `s:${word}`,
  songId: "s",
  word,
  reading: "",
  meaning: "",
  pos: "",
  jlpt: "N5",
  formInSong,
  lines,
  note: "",
  examples: [],
});

describe("matchTokens", () => {
  it("covers every token of an inflected form", () => {
    expect(matchTokens(line, 0, [vocab("呼ぶ", "呼んだ")])).toEqual([null, null, null, null, "s:呼ぶ", "s:呼ぶ", null, null]);
  });

  it("falls back to base form when the form string is not in the line", () => {
    expect(matchTokens(line, 0, [vocab("呼ぶ", "呼びます")])[4]).toBe("s:呼ぶ");
  });

  it("ignores vocab that belongs to other lines", () => {
    expect(matchTokens(line, 0, [vocab("夜", "夜", [3])]).every((m) => m === null)).toBe(true);
  });
});
