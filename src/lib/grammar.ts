import { grammarKey } from "./cards";
import type { GrammarPoint, Song } from "./types";

/** 문법 카드 하나: 문형과 그 문형이 나온 노래·가사 줄 */
export type GrammarItem = GrammarPoint & { key: string; song: Song };

/** 한 번에 새로 배우는 문형 수 */
export const GRAMMAR_NEW_PER_SESSION = 5;

/**
 * 준비된 노래들의 문형을 문형마다 하나씩 (최근 노래 것을 먼저).
 * songId를 주면 그 노래 문형만.
 */
export function uniqueGrammar(songs: Record<string, Song>, order: string[], songId?: string): GrammarItem[] {
  const seen = new Set<string>();
  const out: GrammarItem[] = [];
  for (const id of order) {
    if (songId && id !== songId) continue;
    const song = songs[id];
    if (song?.status !== "ready") continue;
    for (const g of song.grammar) {
      const key = grammarKey(g.pattern);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...g, key, song });
    }
  }
  return out;
}

/** 문형에서 가나·한자만 (〜ても → ても). 보기로 쓴다. 없으면 문형 그대로. */
export function patternCore(pattern: string): string {
  const runs = pattern.match(/[぀-ヿ㐀-鿿々]+/gu);
  return runs ? runs.join("") : pattern;
}
