// 데모 노래에 후리가나를 붙여 src/lib/demo-song.json 으로 저장한다.
// 실행: node scripts/build-demo.ts
import { writeFileSync } from "node:fs";
import { demoSong } from "./demo-source.ts";
import { buildSongs } from "./song-builder.ts";

const [song] = await buildSongs([demoSong], { isDemo: true });
writeFileSync("src/lib/demo-song.json", JSON.stringify(song) + "\n");
console.log(`demo: ${(song as { lines: unknown[] }).lines.length} lines, ${(song as { vocab: unknown[] }).vocab.length} words`);
