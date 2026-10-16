import "server-only";
import path from "node:path";
import kuromoji, { type IpadicFeatures, type Tokenizer } from "kuromoji";
import { hasKanji, toRubySegments } from "./furigana";
import type { LyricLine, LyricToken, RubySegment } from "./types";

let tokenizerPromise: Promise<Tokenizer<IpadicFeatures>> | null = null;

function getTokenizer(): Promise<Tokenizer<IpadicFeatures>> {
  tokenizerPromise ??= new Promise((resolve, reject) => {
    kuromoji
      .builder({ dicPath: path.join(process.cwd(), "node_modules/kuromoji/dict") })
      .build((err, tokenizer) => (err ? reject(err) : resolve(tokenizer)));
  });
  // 한 번 실패하면 다음 요청에서 다시 시도할 수 있게 비운다.
  tokenizerPromise.catch(() => {
    tokenizerPromise = null;
  });
  return tokenizerPromise;
}

function toToken(t: IpadicFeatures): LyricToken {
  return {
    surface: t.surface_form,
    base: t.basic_form === "*" ? t.surface_form : t.basic_form,
    pos: t.pos,
    segs: toRubySegments(t.surface_form, t.reading),
  };
}

/** 글자 위치가 붙은 루비 조각들 */
function rubyWithOffsets(tokenizer: Tokenizer<IpadicFeatures>, text: string) {
  const out: (RubySegment & { at: number })[] = [];
  let at = 0;
  for (const t of tokenizer.tokenize(text)) {
    for (const seg of toRubySegments(t.surface_form, t.reading)) {
      out.push({ ...seg, at });
      at += seg.t.length;
    }
  }
  return out;
}

/** text[start, start+len) 한자 덩어리의 읽기. 형태소 경계가 맞지 않으면 null */
function readingOf(tokenizer: Tokenizer<IpadicFeatures>, text: string, start: number, len: number): string | null {
  let reading = "";
  for (const seg of rubyWithOffsets(tokenizer, text)) {
    if (seg.at >= start + len || seg.at + seg.t.length <= start) continue;
    if (seg.at < start || seg.at + seg.t.length > start + len || !seg.r) return null;
    reading += seg.r;
  }
  return reading || null;
}

const KANA_AFTER = /[ぁ-ゖー]/;

/**
 * 웹에서 후리가나째 복사한 가사(思おもい出だす)를 원래 문장(思い出す)으로 되돌린다.
 * 한자 덩어리 바로 뒤의 히라가나 중, 그것을 지웠을 때 그 한자의 읽기와 같아지는 부분을 지운다.
 */
function stripLine(tokenizer: Tokenizer<IpadicFeatures>, line: string) {
  let text = line;
  let hits = 0;
  let runs = 0;
  for (let i = 0; i < text.length; ) {
    if (!hasKanji(text[i])) {
      i++;
      continue;
    }
    let j = i;
    while (j < text.length && hasKanji(text[j])) j++;
    let k = j;
    while (k < text.length && KANA_AFTER.test(text[k])) k++;
    const kana = text.slice(j, k);
    if (kana) runs++;
    for (let n = 1; n <= kana.length; n++) {
      const candidate = text.slice(0, j) + text.slice(j + n);
      if (readingOf(tokenizer, candidate, i, j - i) === kana.slice(0, n)) {
        text = candidate;
        hits++;
        break;
      }
    }
    i = j;
  }
  return { text, hits, runs };
}

/** 가사 전체에서 후리가나가 섞여 들어온 흔적이 분명할 때만 걷어낸다. 일반 문장을 잘못 고치지 않게. */
export async function stripInlineFurigana(lines: string[]): Promise<string[]> {
  const tokenizer = await getTokenizer();
  // 思(おも)い 처럼 괄호로 붙은 읽기는 언제나 지운다.
  const unparen = lines.map((l) => l.replace(/([\u3400-\u9fff\uf900-\ufaff々〆ヵヶ]+)[（(][ぁ-ゖァ-ヺー]+[）)]/g, "$1"));
  const results = unparen.map((l) => stripLine(tokenizer, l));
  const hits = results.reduce((n, r) => n + r.hits, 0);
  const runs = results.reduce((n, r) => n + r.runs, 0);
  return hits >= 2 && hits / Math.max(runs, 1) >= 0.5 ? results.map((r) => r.text) : unparen;
}

export async function tokenizeLines(lines: string[]): Promise<LyricLine[]> {
  const tokenizer = await getTokenizer();
  return lines.map((text) => ({
    text,
    tokens: text.trim() ? tokenizer.tokenize(text).map(toToken) : [],
  }));
}

export async function toRubyText(text: string): Promise<RubySegment[]> {
  const tokenizer = await getTokenizer();
  return tokenizer.tokenize(text).flatMap((t) => toRubySegments(t.surface_form, t.reading));
}
