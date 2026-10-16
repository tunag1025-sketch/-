/** 노래마다 고정된 커버 색 (배경 + 그 위 글자색) */
const TONES = ["bg-blue text-on-blue", "bg-lime text-on-lime", "bg-lav text-on-lav", "bg-solid text-on-solid"] as const;

export function toneFor(id: string): (typeof TONES)[number] {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}
