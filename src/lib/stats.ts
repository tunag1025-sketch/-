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
