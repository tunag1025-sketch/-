// 화면 미리보기용 샘플 노래에 후리가나를 붙여 src/lib/preview-songs.json 으로 저장한다.
// 실행: node scripts/build-preview.ts
import { writeFileSync } from "node:fs";
import { previewSongs } from "./preview-source.ts";
import { buildSongs } from "./song-builder.ts";

const songs = await buildSongs(previewSongs);
writeFileSync("src/lib/preview-songs.json", JSON.stringify(songs) + "\n");
console.log(`preview: ${songs.length} songs`);
