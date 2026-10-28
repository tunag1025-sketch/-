/** 기기 시간대 기준 날짜 키 (YYYY-MM-DD) */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

const DAY = 86_400_000;

/** 오늘부터 거꾸로 n일 (오래된 날이 앞) */
export function lastDays(log: Record<string, number>, now: number, n: number) {
  return Array.from({ length: n }, (_, i) => {
    const ts = now - (n - 1 - i) * DAY;
    return { ts, key: dayKey(ts), count: log[dayKey(ts)] ?? 0 };
  });
}

/** 연속 학습일. 오늘 아직 안 했으면 어제까지의 연속을 센다. */
export function streak(log: Record<string, number>, now: number): number {
  let ts = (log[dayKey(now)] ?? 0) > 0 ? now : now - DAY;
  let n = 0;
  while ((log[dayKey(ts)] ?? 0) > 0) {
    n++;
    ts -= DAY;
  }
  return n;
}

export function greeting(now: number): string {
  const h = new Date(now).getHours();
  if (h >= 5 && h < 11) return "좋은 아침이에요";
  if (h >= 11 && h < 17) return "좋은 오후예요";
  if (h >= 17 && h < 22) return "좋은 저녁이에요";
  return "늦은 밤이에요";
}

/** 가장 길게 이어진 연속 학습일 */
export function longestStreak(log: Record<string, number>): number {
  const days = Object.keys(log)
    .filter((k) => log[k] > 0)
    .sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const k of days) {
    const [y, m, d] = k.split("-").map(Number);
    const t = Date.UTC(y, m - 1, d) / DAY;
    run = prev !== null && t - prev === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}

/** 공부한 날 수 */
export const studyDays = (log: Record<string, number>) => Object.values(log).filter((n) => n > 0).length;

/** 그날이 끝나는 시각 (기기 시간대) */
function endOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/**
 * 앞으로 days일 동안 날마다 복습할 카드 수. 오늘 칸에는 이미 기한이 지난 카드도 들어간다.
 * 장기기억 카드는 빼고, include로 어떤 카드를 셀지 고른다 (단어·문형만 등).
 */
export function reviewForecast(
  cards: Record<string, { due: number; learned?: boolean }>,
  now: number,
  days = 7,
  include: (key: string) => boolean = () => true,
): { ts: number; key: string; count: number }[] {
  const out = Array.from({ length: days }, (_, i) => {
    const ts = now + i * DAY;
    return { ts, key: dayKey(ts), end: endOfDay(ts), count: 0 };
  });
  for (const [key, card] of Object.entries(cards)) {
    if (card.learned || !include(key)) continue;
    const slot = out.find((d) => card.due <= d.end);
    if (slot) slot.count++;
  }
  return out.map(({ ts, key, count }) => ({ ts, key, count }));
}

/** 지금까지 답한 것 중 '이해'·'완벽'을 고른 비율 (카드마다 센 맞힌 수와 '다시' 수로) */
export function accuracy(cards: Record<string, { correct?: number; reps: number; lapses: number }>): {
  right: number;
  wrong: number;
  rate: number | null;
} {
  let right = 0;
  let wrong = 0;
  for (const c of Object.values(cards)) {
    right += c.correct ?? c.reps;
    wrong += c.lapses;
  }
  return { right, wrong, rate: right + wrong ? Math.round((right / (right + wrong)) * 100) : null };
}

/** 달력 한 달: 일요일부터 시작하는 주들. 그 달이 아닌 칸은 null */
export function monthWeeks(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: first.getDay() }, () => null),
    ...Array.from({ length: days }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}
