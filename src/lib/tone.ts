/** 노래마다 고정된 파스텔 블록 색. 위에는 항상 검정 글씨를 쓴다. */
const TONES = ["bg-candy", "bg-sky", "bg-lemon", "bg-lav", "bg-peri"] as const;

export function toneFor(id: string): (typeof TONES)[number] {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}
