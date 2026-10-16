import { describe, expect, it } from "vitest";
import { cleanLyrics, isKoreanOnly } from "../lyrics";

describe("cleanLyrics", () => {
  it("trims edges and collapses blank runs", () => {
    expect(cleanLyrics("\n\n  一行目  \r\n\r\n\r\n　二行目\n\n")).toEqual({ lines: ["一行目", "", "二行目"], koreanLines: 0 });
  });

  it("drops Korean pronunciation and translation lines", () => {
    const raw = [
      "신구루 사이즈노 헤야데 히토리키리",
      "シングルサイズの部屋で一人きり",
      "싱글 사이즈 방에 혼자뿐",
      "오모이다스노와 아나타토노 쿠라시",
      "思い出すのはあなたとの暮らし",
      "떠오르는 건 당신과 함께했던 생활",
    ].join("\n");
    expect(cleanLyrics(raw)).toEqual({
      lines: ["シングルサイズの部屋で一人きり", "思い出すのはあなたとの暮らし"],
      koreanLines: 4,
    });
  });

  it("removes the blank lines left between every line once the Korean lines are gone", () => {
    const raw = "君の声\n키미노 코에\n너의 목소리\n\n星の夜\n호시노 요루\n별의 밤\n\n空の色\n소라노 이로\n하늘의 색";
    expect(cleanLyrics(raw).lines).toEqual(["君の声", "星の夜", "空の色"]);
  });

  it("keeps stanza breaks in lyrics that had no Korean lines, and keeps English lines", () => {
    expect(cleanLyrics("君の声\n星の夜\n\nBaby, I love you\n空の色").lines).toEqual([
      "君の声",
      "星の夜",
      "",
      "Baby, I love you",
      "空の色",
    ]);
  });
});

describe("isKoreanOnly", () => {
  it("tells Korean-only lines from Japanese ones", () => {
    expect(isKoreanOnly("싱글 사이즈 방에 혼자뿐")).toBe(true);
    expect(isKoreanOnly("Baby 사랑해")).toBe(true);
    expect(isKoreanOnly("思い出す (생각나다)")).toBe(false);
    expect(isKoreanOnly("Baby, I love you")).toBe(false);
    expect(isKoreanOnly("")).toBe(false);
  });
});
