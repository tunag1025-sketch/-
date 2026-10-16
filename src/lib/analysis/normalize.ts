import { JLPT_TAGS, type GrammarPoint, type JlptTag, type RubySegment, type VocabItem } from "../types";
import type { SongAnalysis } from "./schema";

const POS = ["명사", "동사", "형용사", "형용동사", "부사", "표현", "기타"];

function toJlpt(value: string): JlptTag {
  const tag = value.trim().toUpperCase();
  return (JLPT_TAGS as readonly string[]).includes(tag) ? (tag as JlptTag) : "기타";
}

export type AnalyzedVocab = Omit<VocabItem, "id" | "songId">;

export type AnalyzeResponse = {
  summary: string;
  vocab: AnalyzedVocab[];
  grammar: GrammarPoint[];
};

/**
 * 모델 출력을 정리한다: 존재하지 않는 줄 번호 제거, 중복 단어 합치기, 예문에 후리가나 붙이기.
 */
export async function normalizeAnalysis(
  analysis: SongAnalysis,
  lines: string[],
  toRuby: (text: string) => Promise<RubySegment[]>,
): Promise<AnalyzeResponse> {
  const validLine = (n: number) => Number.isInteger(n) && n >= 0 && n < lines.length && lines[n].trim() !== "";

  const byWord = new Map<string, AnalyzedVocab>();
  for (const v of analysis.vocab) {
    const word = v.word.trim();
    if (!word) continue;
    const linesForWord = [...new Set(v.lines.filter(validLine))].sort((a, b) => a - b);
    const existing = byWord.get(word);
    if (existing) {
      existing.lines = [...new Set([...existing.lines, ...linesForWord])].sort((a, b) => a - b);
      continue;
    }
    byWord.set(word, {
      word,
      reading: v.reading.trim(),
      meaning: v.meaning.trim(),
      pos: POS.includes(v.pos.trim()) ? v.pos.trim() : "기타",
      jlpt: toJlpt(v.jlpt),
      formInSong: v.formInSong.trim() || word,
      lines: linesForWord,
      note: v.note.trim(),
      examples: await Promise.all(
        v.examples.slice(0, 3).map(async (ex) => ({ ja: ex.ja, ko: ex.ko, segs: await toRuby(ex.ja) })),
      ),
    });
  }

  return {
    summary: analysis.summary.trim(),
    vocab: [...byWord.values()],
    grammar: analysis.grammar
      .filter((g) => validLine(g.line))
      .map((g) => ({ pattern: g.pattern, meaning: g.meaning, line: g.line, explanation: g.explanation })),
  };
}
