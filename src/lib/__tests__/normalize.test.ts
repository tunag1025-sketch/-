import { describe, expect, it } from "vitest";
import { normalizeAnalysis } from "../analysis/normalize";
import type { SongAnalysis } from "../analysis/schema";

const entry = (word: string, lines: number[]): SongAnalysis["vocab"][number] => ({
  word,
  reading: "よみ",
  meaning: "뜻",
  pos: "명사",
  jlpt: "n4",
  formInSong: "",
  lines,
  note: " ",
  examples: [{ ja: "例文です。", ko: "예문입니다." }],
});

describe("normalizeAnalysis", () => {
  it("drops invalid line numbers, merges duplicates and adds ruby to examples", async () => {
    const lines = ["一", "", "三"];
    const result = await normalizeAnalysis(
      {
        summary: " 요약 ",
        vocab: [entry("星", [0, 1, 7]), entry("星", [2])],
        grammar: [
          { pattern: "〜ても", meaning: "~해도", line: 2, explanation: "" },
          { pattern: "〜ば", meaning: "~하면", line: 9, explanation: "" },
        ],
      },
      lines,
      async (text) => [{ t: text }],
    );
    expect(result.summary).toBe("요약");
    expect(result.vocab).toHaveLength(1);
    expect(result.vocab[0].lines).toEqual([0, 2]);
    expect(result.vocab[0].formInSong).toBe("星");
    expect(result.vocab[0].jlpt).toBe("N4");
    expect(result.vocab[0].examples[0].segs).toEqual([{ t: "例文です。" }]);
    expect(result.grammar.map((g) => g.pattern)).toEqual(["〜ても"]);
  });
});
