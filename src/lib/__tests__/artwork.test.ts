import { describe, expect, it } from "vitest";
import { bestMatch, normalizeName, toArtworks } from "../artwork";
import { searchArtwork } from "../artwork.server";

const results = [
  { trackName: "夜に駆ける", artistName: "YOASOBI", collectionName: "THE BOOK", artworkUrl100: "https://x/a/100x100bb.jpg" },
  { trackName: "夜に駆ける (Live)", artistName: "YOASOBI", collectionName: "Live", artworkUrl100: "https://x/a/100x100bb.jpg" },
  { trackName: "群青", artistName: "YOASOBI", collectionName: "THE BOOK", artworkUrl100: "https://x/b/100x100bb.jpg" },
  { trackName: "No art" },
];

describe("artwork", () => {
  it("turns results into 600px covers without duplicates", () => {
    const arts = toArtworks(results);
    expect(arts.map((a) => a.url)).toEqual(["https://x/a/600x600bb.jpg", "https://x/b/600x600bb.jpg"]);
  });

  it("normalizes width and case differences", () => {
    expect(normalizeName("ＹＯＡＳＯＢＩ ")).toBe("yoasobi");
    expect(normalizeName("夜に駆ける！")).toBe("夜に駆ける");
  });

  it("only auto-picks a cover whose title and artist match", () => {
    const arts = toArtworks(results);
    expect(bestMatch(arts, "夜に駆ける", "yoasobi")?.album).toBe("THE BOOK");
    expect(bestMatch(arts, "群青", "")?.title).toBe("群青");
    expect(bestMatch(arts, "群青", "Ado")).toBeUndefined();
    expect(bestMatch(arts, "怪獣の花唄", "Vaundy")).toBeUndefined();
  });

  it("falls back to the next store when one has nothing", async () => {
    const asked: string[] = [];
    const fake = (async (url: URL) => {
      asked.push(url.searchParams.get("country")!);
      const body = url.searchParams.get("country") === "KR" ? { results } : { results: [] };
      return new Response(JSON.stringify(body));
    }) as unknown as typeof fetch;
    const arts = await searchArtwork("夜に駆ける", "YOASOBI", fake);
    expect(asked).toEqual(["JP", "KR"]);
    expect(arts).toHaveLength(2);
  });
});
