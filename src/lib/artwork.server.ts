import "server-only";
import { type Artwork, type ItunesResult, type SongHit, toArtworks, toSongHits } from "./artwork";

// 일본 노래가 많으니 일본 스토어부터 찾고, 없으면 한국·미국 스토어를 본다.
const COUNTRIES = ["JP", "KR", "US"] as const;

/** iTunes에서 노래를 찾아 pick으로 고른다. 한 스토어에서 나오면 거기서 멈춘다. */
async function searchItunes<T>(
  term: string,
  pick: (results: ItunesResult[]) => T[],
  limit: number,
  fetchImpl: typeof fetch,
): Promise<T[]> {
  for (const country of COUNTRIES) {
    const url = new URL("https://itunes.apple.com/search");
    url.search = new URLSearchParams({ term, country, media: "music", entity: "song", limit: "25" }).toString();
    try {
      const res = await fetchImpl(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const data = (await res.json()) as { results?: ItunesResult[] };
      const found = pick(data.results ?? []);
      if (found.length) return found.slice(0, limit);
    } catch {
      // 다음 스토어로
    }
  }
  return [];
}

export function searchArtwork(title: string, artist: string, fetchImpl: typeof fetch = fetch): Promise<Artwork[]> {
  return searchItunes([title, artist].filter(Boolean).join(" "), toArtworks, 8, fetchImpl);
}

/** 제목이나 가수로 노래를 찾는다 (노래 추가 화면). */
export function searchSongs(query: string, fetchImpl: typeof fetch = fetch): Promise<SongHit[]> {
  return searchItunes(query, toSongHits, 8, fetchImpl);
}
