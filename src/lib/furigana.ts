import type { RubySegment } from "./types";

const KANJI_CLASS = "\\u3400-\\u9fff\\uf900-\\ufaff々〆ヵヶ";
const HAS_KANJI = new RegExp(`[${KANJI_CLASS}]`);
const RUNS = new RegExp(`[${KANJI_CLASS}]+|[^${KANJI_CLASS}]+`, "g");

export function hasKanji(text: string): boolean {
  return HAS_KANJI.test(text);
}

export function kataToHira(text: string): string {
  return text.replace(/[ァ-ヶ]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0x60),
  );
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 표기와 읽기(가타카나/히라가나)를 맞춰서 한자 부분에만 읽기를 붙인다.
 * 例) 食べる + タベル → [{t:"食",r:"た"},{t:"べる"}]
 */
export function toRubySegments(surface: string, reading?: string): RubySegment[] {
  if (!reading || !hasKanji(surface)) return [{ t: surface }];
  const hira = kataToHira(reading);
  const runs = surface.match(RUNS) ?? [surface];
  const pattern = runs
    .map((run) => (hasKanji(run) ? "(.+?)" : escapeRegExp(kataToHira(run))))
    .join("");
  const match = new RegExp(`^${pattern}$`).exec(hira);
  if (!match) return [{ t: surface, r: hira }];

  let group = 1;
  return runs.map((run) => (hasKanji(run) ? { t: run, r: match[group++] } : { t: run }));
}
