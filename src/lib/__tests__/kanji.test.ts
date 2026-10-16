import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { gradeLabel, kanjiIn } from "../kanji";

const table = JSON.parse(readFileSync(new URL("../../../public/kanji.json", import.meta.url), "utf8")).k as Record<
  string,
  [string, number, number, string, string]
>;

describe("kanji", () => {
  it("picks each kanji in a word once", () => {
    expect(kanjiIn("夜明け")).toEqual(["夜", "明"]);
    expect(kanjiIn("人々")).toEqual(["人"]);
    expect(kanjiIn("しまう")).toEqual([]);
  });

  it("labels joyo grades", () => {
    expect(gradeLabel(2)).toBe("상용한자 · 초등 2학년");
    expect(gradeLabel(8)).toBe("상용한자 · 중학 이상");
    expect(gradeLabel(9)).toBe("인명용 한자");
    expect(gradeLabel(0)).toBe("상용한자 아님");
  });

  it("has Korean readings for joyo kanji, including new-style forms", () => {
    expect(table["星"][0]).toBe("별 성");
    expect(table["気"][0]).toBe("기운 기");
    expect(table["楽"][0]).toBe("즐길 락");
    expect(table["円"][0]).toBe("둥글 원");
    const joyo = Object.entries(table).filter(([, v]) => v[1] >= 1 && v[1] <= 8);
    expect(joyo.length).toBe(2140);
    expect(joyo.filter(([, v]) => !v[0])).toEqual([]);
  });
});
