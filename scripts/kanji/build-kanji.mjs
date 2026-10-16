// 한자 정보 데이터(public/kanji.json)를 만든다.
//   node scripts/kanji/build-kanji.mjs <kanji-meta.json> <hanja.txt> <hanjaeum.json>
// 출처
//   kanji-meta.json : npm kanji-data (KANJIDIC2 기반, EDRDG · CC BY-SA 4.0) — 상용 여부·학년·획수·음독·훈독
//   hanja.txt       : libhangul data/hanja/hanja.txt (Choe Hwanjin · BSD-3) — 한국 한자 훈음
//   hanjaeum.json   : npm hanja (MIT) — 본음(두음법칙 전) 확인용
// 일본 신자체는 shinjitai.json으로 구자체를 찾아 훈음을 붙이고, overrides.json으로 대표 훈음을 바로잡는다.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const [metaPath, hanjaTxt, eumPath] = process.argv.slice(2);
const meta = JSON.parse(readFileSync(metaPath, "utf8"));
const eum = JSON.parse(readFileSync(eumPath, "utf8"));
const kyuji = JSON.parse(readFileSync(join(here, "shinjitai.json"), "utf8"));
const overrides = JSON.parse(readFileSync(join(here, "overrides.json"), "utf8"));

const hun = {};
for (const line of readFileSync(hanjaTxt, "utf8").split("\n")) {
  if (line.startsWith("#")) continue;
  const [, ch, mean] = line.split(":");
  if (ch && [...ch].length === 1 && mean && !hun[ch]) hun[ch] = mean.split(", ")[0].trim();
}

// 두음법칙으로 바뀐 음(늙을 노)을 본음(늙을 로)으로 돌린다.
const S = 0xac00;
const split = (c) => {
  const n = c.charCodeAt(0) - S;
  return [Math.floor(n / 588), Math.floor((n % 588) / 28), n % 28];
};
const join3 = (i, v, f) => String.fromCharCode(S + i * 588 + v * 28 + f);
const Y = new Set([2, 6, 7, 12, 17, 20]); // ㅑ ㅕ ㅖ ㅛ ㅠ ㅣ
function dueum(c) {
  const [i, v, f] = split(c);
  if (i === 5) return join3(Y.has(v) ? 11 : 2, v, f); // ㄹ → ㅇ/ㄴ
  if (i === 2 && Y.has(v)) return join3(11, v, f); // ㄴ → ㅇ
  return c;
}
function fixSound(text, ch) {
  const m = /^(.*\S)\s(\S)$/.exec(text);
  const right = eum[ch];
  if (!m || !right || right === m[2] || /[^가-힣]/.test(right) || dueum(right) !== m[2]) return text;
  return `${m[1]} ${right}`;
}

const out = {};
for (const [ch, v] of Object.entries(meta)) {
  const g = v.grade;
  if (!(g >= 1 && g <= 10)) continue; // 상용한자(1~6학년·중학 이상) + 인명용
  // 인명용의 구자체(神 같은 호환 한자)는 보통 글자로 맞춰 찾는다.
  const base = ch.normalize("NFKC");
  const old = kyuji[ch] ?? kyuji[base] ?? base;
  let h = overrides[ch] ?? overrides[base] ?? hun[old] ?? hun[ch] ?? hun[base] ?? "";
  if (!overrides[ch] && h) h = fixSound(h, old);
  if (/同字|俗字|古字/.test(h)) h = "";
  out[ch] = [h, g, v.stroke_count ?? 0, v.on_readings.join("・"), v.kun_readings.join("・")];
}

writeFileSync(
  join(here, "../../public/kanji.json"),
  JSON.stringify({
    _source: "KANJIDIC2 (EDRDG, CC BY-SA 4.0) via kanji-data; 훈음: libhangul hanja.txt (BSD-3)",
    k: out,
  }),
);
const missing = Object.entries(out).filter(([, v]) => !v[0]).map(([k]) => k);
console.log(`kanji: ${Object.keys(out).length}, 훈음 없음: ${missing.length}`);
console.log(missing.join(""));
