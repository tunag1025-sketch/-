/** 붙여넣은 가사를 줄 단위로 정리한다: 앞뒤 공백 줄 제거, 연속된 빈 줄은 하나로. */
export function cleanLyrics(raw: string): string[] {
  const out: string[] = [];
  for (const line of raw.replace(/\r\n?/g, "\n").split("\n")) {
    const text = line.replace(/\s+$/u, "").replace(/^[\s　]+/u, "");
    if (!text && (out.length === 0 || out.at(-1) === "")) continue;
    out.push(text.slice(0, 500));
  }
  while (out.at(-1) === "") out.pop();
  return out;
}
