import { describe, expect, it } from "vitest";
import { cleanLyrics } from "../lyrics";

describe("cleanLyrics", () => {
  it("trims edges and collapses blank runs", () => {
    expect(cleanLyrics("\n\n  一行目  \r\n\r\n\r\n　二行目\n\n")).toEqual(["一行目", "", "二行目"]);
  });
});
