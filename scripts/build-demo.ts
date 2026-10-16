// 데모 노래에 후리가나를 붙여 src/lib/demo-song.json 으로 저장한다.
// 실행: node scripts/build-demo.ts
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { toRubySegments } from "../src/lib/furigana.ts";
import { demoSong } from "./demo-source.ts";

const require = createRequire(import.meta.url);
const kuromoji = require("kuromoji");

kuromoji.builder({ dicPath: "node_modules/kuromoji/dict" }).build((err: Error | null, tokenizer: any) => {
  if (err) throw err;
  const ruby = (text: string) =>
    tokenizer.tokenize(text).flatMap((t: any) => toRubySegments(t.surface_form, t.reading));

  const lines = demoSong.lyrics.split("\n").map((text) => ({
    text,
    tokens: text.trim()
      ? tokenizer.tokenize(text).map((t: any) => ({
          surface: t.surface_form,
          base: t.basic_form === "*" ? t.surface_form : t.basic_form,
          pos: t.pos,
          segs: toRubySegments(t.surface_form, t.reading),
        }))
      : [],
  }));

  const song = {
    id: demoSong.id,
    title: demoSong.title,
    artist: demoSong.artist,
    level: demoSong.level,
    createdAt: 0,
    lines,
    status: "ready",
    summary: demoSong.summary,
    isDemo: true,
    grammar: demoSong.grammar,
    explanations: demoSong.explanations,
    vocab: demoSong.vocab.map((v) => ({
      ...v,
      id: `${demoSong.id}:${v.word}`,
      songId: demoSong.id,
      examples: v.examples.map((ex) => ({ ...ex, segs: ruby(ex.ja) })),
    })),
  };

  for (const v of song.vocab) {
    for (const n of v.lines) {
      const line = lines[n]?.text ?? "";
      if (!line.includes(v.formInSong)) throw new Error(`"${v.formInSong}" not in line ${n}: ${line}`);
    }
  }

  writeFileSync("src/lib/demo-song.json", JSON.stringify(song) + "\n");
  console.log(`demo: ${lines.length} lines, ${song.vocab.length} words`);
});
