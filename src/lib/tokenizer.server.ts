import "server-only";
import path from "node:path";
import kuromoji, { type IpadicFeatures, type Tokenizer } from "kuromoji";
import { toRubySegments } from "./furigana";
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
