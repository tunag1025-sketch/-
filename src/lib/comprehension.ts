import { isKoreanOnly } from "./lyrics";
import type { Memory } from "./srs";
import type { Song, VocabItem } from "./types";

/**
 * 이 노래 가사를 얼마나 읽을 수 있는지.
 *  percent      가사에 나오는 단어장 단어(줄마다 따로 센다) 중 기억한(단기·장기) 비율. 후렴처럼 자주 나오는 단어는 더 무겁다.
 *  lines        단어장 단어가 하나라도 있는 가사 줄 수 (한글 발음·해석 줄은 뺀다)
 *  readable     그중 모르는 단어가 없는 줄 수
 */
export function lyricComprehension(
  song: Pick<Song, "lines" | "vocab">,
  memoryOf: (item: VocabItem) => Memory,
): { percent: number; lines: number; readable: number } {
  const known = new Map(song.vocab.map((v) => [v.id, memoryOf(v) !== "none"]));
  let words = 0;
  let knownWords = 0;
  let lines = 0;
  let readable = 0;
  song.lines.forEach((line, i) => {
    if (!line.text.trim() || isKoreanOnly(line.text)) return;
    const inLine = song.vocab.filter((v) => v.lines.includes(i));
    if (!inLine.length) return;
    const k = inLine.filter((v) => known.get(v.id)).length;
    words += inLine.length;
    knownWords += k;
    lines++;
    if (k === inLine.length) readable++;
  });
  return { percent: words ? Math.round((knownWords / words) * 100) : 0, lines, readable };
}
