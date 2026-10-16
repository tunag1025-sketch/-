import type { LyricLine, VocabItem } from "./types";

/**
 * 가사 한 줄에서 각 형태소가 어떤 단어장 항목에 속하는지 찾는다.
 * 가사에 쓰인 형태(formInSong) → 사전형(word) 순으로 문자열을 찾고, 둘 다 없으면 형태소 기본형으로 맞춘다.
 */
export function matchTokens(line: LyricLine, lineIndex: number, vocab: VocabItem[]): (string | null)[] {
  const result: (string | null)[] = line.tokens.map(() => null);
  const starts: number[] = [];
  let offset = 0;
  for (const t of line.tokens) {
    starts.push(offset);
    offset += t.surface.length;
  }

  // 긴 단어부터 칠해서 짧은 단어가 덮어쓰지 않게 한다.
  const candidates = vocab
    .filter((v) => v.lines.includes(lineIndex))
    .sort((a, b) => b.formInSong.length - a.formInSong.length);

  for (const v of candidates) {
    let found = false;
    for (const needle of [v.formInSong, v.word]) {
      const at = needle ? line.text.indexOf(needle) : -1;
      if (at < 0) continue;
      const end = at + needle.length;
      line.tokens.forEach((t, i) => {
        const s = starts[i];
        if (s < end && s + t.surface.length > at && result[i] === null) result[i] = v.id;
      });
      found = true;
      break;
    }
    if (!found) {
      line.tokens.forEach((t, i) => {
        if (t.base === v.word && result[i] === null) result[i] = v.id;
      });
    }
  }
  return result;
}
