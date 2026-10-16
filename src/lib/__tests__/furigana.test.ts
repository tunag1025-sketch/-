import { describe, expect, it } from "vitest";
import { kataToHira, toRubySegments } from "../furigana";

describe("toRubySegments", () => {
  it("puts the reading only over the kanji part", () => {
    expect(toRubySegments("食べる", "タベル")).toEqual([{ t: "食", r: "た" }, { t: "べる" }]);
    expect(toRubySegments("取り扱い", "トリアツカイ")).toEqual([
      { t: "取", r: "と" },
      { t: "り" },
      { t: "扱", r: "あつか" },
      { t: "い" },
    ]);
  });

  it("handles all-kanji words and kana-only words", () => {
    expect(toRubySegments("未来", "ミライ")).toEqual([{ t: "未来", r: "みらい" }]);
    expect(toRubySegments("ありがとう", "アリガトウ")).toEqual([{ t: "ありがとう" }]);
    expect(toRubySegments("ネコ", "ネコ")).toEqual([{ t: "ネコ" }]);
  });

  it("falls back to a whole-word reading when kana do not line up", () => {
    expect(toRubySegments("今日は", "キョウワ")).toEqual([{ t: "今日は", r: "きょうわ" }]);
  });

  it("leaves unknown words without a reading", () => {
    expect(toRubySegments("夜空", undefined)).toEqual([{ t: "夜空" }]);
  });
});

describe("kataToHira", () => {
  it("converts katakana and leaves other characters", () => {
    expect(kataToHira("ヨアケ、ー")).toBe("よあけ、ー");
  });
});
