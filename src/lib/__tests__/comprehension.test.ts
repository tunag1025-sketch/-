import { describe, expect, it } from "vitest";
import { lyricComprehension } from "../comprehension";
import type { LyricLine, VocabItem } from "../types";

const line = (text: string) => ({ text, tokens: [] }) as unknown as LyricLine;
const word = (w: string, lines: number[]) => ({ id: `s:${w}`, word: w, lines }) as unknown as VocabItem;

describe("lyricComprehension", () => {
  const song = {
    lines: [line("夜明けの空"), line("星がひとつ"), line(""), line("새벽 하늘"), line("夜明けまで")],
    vocab: [word("夜明け", [0, 4]), word("空", [0]), word("星", [1])],
  };

  it("counts each appearance in the lyrics and the lines with no unknown words", () => {
    const known = new Set(["夜明け"]);
    const r = lyricComprehension(song, (v) => (known.has(v.word) ? "long" : "none"));
    // 夜明け 2번 + 空 + 星 = 4번 나오고 그중 2번을 안다. 0줄(空 모름)·1줄(星 모름)은 못 읽고 4줄은 읽는다.
    expect(r).toEqual({ percent: 50, lines: 3, readable: 1 });
  });

  it("is 100% when every word is remembered and 0 without words", () => {
    expect(lyricComprehension(song, () => "short")).toEqual({ percent: 100, lines: 3, readable: 3 });
    expect(lyricComprehension({ lines: [line("ラララ")], vocab: [] }, () => "none")).toEqual({
      percent: 0,
      lines: 0,
      readable: 0,
    });
  });
});
