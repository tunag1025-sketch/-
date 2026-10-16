/** 앨범 커버 후보 */
export type Artwork = { url: string; title: string; artist: string; album: string };

export type ItunesResult = {
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  artworkUrl100?: string;
};

/** 비교용: 전각/반각·대소문자·공백·기호 차이를 없앤다. */
export function normalizeName(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

/** iTunes 검색 결과를 커버 후보로 바꾼다 (600px, 같은 그림은 하나만). */
export function toArtworks(results: ItunesResult[]): Artwork[] {
  const seen = new Set<string>();
  const out: Artwork[] = [];
  for (const r of results) {
    if (!r.artworkUrl100) continue;
    const url = r.artworkUrl100.replace(/\/\d+x\d+bb\./, "/600x600bb.");
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, title: r.trackName ?? "", artist: r.artistName ?? "", album: r.collectionName ?? "" });
  }
  return out;
}

/** 제목(과 가수)이 맞는 첫 후보. 노래를 추가할 때 자동으로 커버를 붙일지 정한다. */
export function bestMatch(candidates: Artwork[], title: string, artist: string): Artwork | undefined {
  const t = normalizeName(title);
  const a = normalizeName(artist);
  if (!t) return undefined;
  return candidates.find((c) => {
    const ct = normalizeName(c.title);
    const ca = normalizeName(c.artist);
    const titleOk = ct === t || (t.length >= 2 && (ct.startsWith(t) || t.startsWith(ct)) && ct.length > 0);
    const artistOk = !a || ca.includes(a) || a.includes(ca);
    return titleOk && artistOk;
  });
}

/** 노래 검색 결과 하나 */
export type SongHit = { title: string; artist: string; album: string; cover: string | null };

/** iTunes 검색 결과를 노래 후보로 바꾼다. 같은 제목·가수는 하나만. */
export function toSongHits(results: ItunesResult[]): SongHit[] {
  const seen = new Set<string>();
  const out: SongHit[] = [];
  for (const r of results) {
    if (!r.trackName) continue;
    const key = `${normalizeName(r.trackName)}|${normalizeName(r.artistName ?? "")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      title: r.trackName,
      artist: r.artistName ?? "",
      album: r.collectionName ?? "",
      cover: r.artworkUrl100 ? r.artworkUrl100.replace(/\/\d+x\d+bb\./, "/600x600bb.") : null,
    });
  }
  return out;
}
