import "server-only";
import { type Artwork, toArtworks } from "./artwork";

// 일본 노래가 많으니 일본 스토어부터 찾고, 없으면 한국·미국 스토어를 본다.
const COUNTRIES = ["JP", "KR", "US"] as const;

export async function searchArtwork(
  title: string,
  artist: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Artwork[]> {
  const term = [title, artist].filter(Boolean).join(" ");
  for (const country of COUNTRIES) {
    const url = new URL("https://itunes.apple.com/search");
    url.search = new URLSearchParams({ term, country, media: "music", entity: "song", limit: "12" }).toString();
    try {
      const res = await fetchImpl(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const data = (await res.json()) as { results?: Parameters<typeof toArtworks>[0] };
      const found = toArtworks(data.results ?? []);
      if (found.length) return found.slice(0, 8);
    } catch {
      // 다음 스토어로
    }
  }
  return [];
}
