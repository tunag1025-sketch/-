// 가나·한자(일본어) / 한글
const JAPANESE = /[぀-ヿ㐀-鿿豈-﫿ｦ-ﾟ々〆]/u;
const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/u;

/**
 * 한글은 있는데 일본어(가나·한자)는 없는 줄.
 * 한국 가사 사이트에서 복사하면 섞여 오는 한글 발음(신구루 사이즈노…)이나 해석 줄이다.
 */
export function isKoreanOnly(line: string): boolean {
  return HANGUL.test(line) && !JAPANESE.test(line);
}

/**
 * 붙여넣은 가사를 줄 단위로 정리한다: 앞뒤 공백 줄 제거, 연속된 빈 줄은 하나로,
 * 한글 발음·해석 줄은 뺀다 (뺀 줄 수는 koreanLines).
 */
export function cleanLyrics(raw: string): { lines: string[]; koreanLines: number } {
  let out: string[] = [];
  let koreanLines = 0;
  for (const line of raw.replace(/\r\n?/g, "\n").split("\n")) {
    const text = line.replace(/\s+$/u, "").replace(/^[\s　]+/u, "");
    if (isKoreanOnly(text)) {
      koreanLines++;
      continue;
    }
    if (!text && (out.length === 0 || out.at(-1) === "")) continue;
    out.push(text.slice(0, 500));
  }
  while (out.at(-1) === "") out.pop();
  // "원문 / 발음 / 해석 / 빈 줄"이 반복되던 가사는 원문만 남기면 모든 줄 사이가 비므로 빈 줄을 없앤다.
  const alternating = out.every((l, i) => !l || !out[i + 1]);
  if (koreanLines && alternating && out.filter(Boolean).length >= 3) out = out.filter(Boolean);
  return { lines: out, koreanLines };
}
