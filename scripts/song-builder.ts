// 원본 노래(가사 + 사람이 쓴 단어·문법·해설)에 후리가나를 붙여 앱의 Song 형태로 만든다.
import { createRequire } from "node:module";
import { toRubySegments } from "../src/lib/furigana.ts";

const require = createRequire(import.meta.url);
const kuromoji = require("kuromoji");

export type SongSource = {
  id: string;
  title: string;
  artist: string;
  level: string;
  summary?: string;
  status?: "ready" | "analyzing" | "error";
  error?: string;
  lyrics: string;
  /** kuromoji가 잘못 읽는 한자 조각의 바른 읽기 (예: 雨上 → あまあ) */
  readings?: Record<string, string>;
  vocab: {
    word: string;
    reading: string;
    meaning: string;
    pos: string;
    jlpt: string;
    formInSong: string;
    lines: number[];
    note: string;
    examples: { ja: string; ko: string }[];
  }[];
  grammar: { pattern: string; meaning: string; line: number; explanation: string }[];
  explanations: Record<number, { translation: string; breakdown: { part: string; meaning: string }[]; notes: string }>;
};

/** kuromoji로 후리가나를 붙인 노래들. extra는 노래마다 summary 뒤에 덧붙인다 (데모곡 표시 등). */
export function buildSongs(sources: SongSource[], extra: Record<string, unknown> = {}): Promise<object[]> {
  return new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: "node_modules/kuromoji/dict" }).build((err: Error | null, tokenizer: any) => {
      if (err) return reject(err);
      const songs = sources.map((src) => {
        const fix = (segs: { t: string; r?: string }[]) =>
          segs.map((seg) => (seg.r && src.readings?.[seg.t] ? { ...seg, r: src.readings[seg.t] } : seg));
        const ruby = (text: string) =>
          fix(tokenizer.tokenize(text).flatMap((t: any) => toRubySegments(t.surface_form, t.reading)));
        const lines = src.lyrics.split("\n").map((text) => ({
          text,
          tokens: text.trim()
            ? tokenizer.tokenize(text).map((t: any) => ({
                surface: t.surface_form,
                base: t.basic_form === "*" ? t.surface_form : t.basic_form,
                pos: t.pos,
                segs: fix(toRubySegments(t.surface_form, t.reading)),
              }))
            : [],
        }));
        for (const v of src.vocab) {
          for (const n of v.lines) {
            const line = lines[n]?.text ?? "";
            if (!line.includes(v.formInSong)) throw new Error(`${src.id}: "${v.formInSong}" not in line ${n}: ${line}`);
          }
        }
        for (const n of Object.keys(src.explanations)) {
          if (!lines[Number(n)]?.text.trim()) throw new Error(`${src.id}: explanation for empty line ${n}`);
        }
        return {
          id: src.id,
          title: src.title,
          artist: src.artist,
          level: src.level,
          createdAt: 0,
          lines,
          status: src.status ?? "ready",
          error: src.error,
          summary: src.summary,
          ...extra,
          grammar: src.grammar,
          explanations: src.explanations,
          vocab: src.vocab.map((v) => ({
            ...v,
            id: `${src.id}:${v.word}`,
            songId: src.id,
            examples: v.examples.map((ex) => ({ ...ex, segs: ruby(ex.ja) })),
          })),
        };
      });
      resolve(songs);
    });
  });
}
