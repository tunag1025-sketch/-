import { uniqueVocab } from "./cards";
import type { KanjiInfo } from "./kanji";
import { kanjiIn } from "./kanji";
import type { Song, VocabItem } from "./types";

/** 한 번에 새로 배우는 한자 수 */
export const KANJI_NEW_PER_SESSION = 10;

export type KanjiCard = KanjiInfo & { words: VocabItem[] };

/**
 * 모은 단어 속 한자를 한 글자씩 (최근 노래 단어에 나온 것 먼저). 훈음이 있는 한자만 카드로 쓴다.
 * 글자마다 그 한자가 들어간 내 단어를 붙인다.
 */
export function kanjiDeck(songs: Record<string, Song>, order: string[], info: (char: string) => KanjiInfo): KanjiCard[] {
  const byChar = new Map<string, VocabItem[]>();
  for (const v of uniqueVocab(songs, order)) {
    for (const c of kanjiIn(v.word)) {
      const list = byChar.get(c);
      if (list) list.push(v);
      else byChar.set(c, [v]);
    }
  }
  return [...byChar].map(([c, words]) => ({ ...info(c), words })).filter((k) => k.hun);
}
