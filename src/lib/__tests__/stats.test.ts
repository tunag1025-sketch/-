import { describe, expect, it } from "vitest";
import { accuracy, dayKey, lastDays, longestStreak, monthWeeks, reviewForecast, streak, studyDays } from "../stats";

const DAY = 86_400_000;
const now = new Date(2026, 9, 16, 12).getTime();

describe("stats", () => {
  it("counts consecutive days, allowing today to be empty", () => {
    const log = { [dayKey(now - DAY)]: 3, [dayKey(now - 2 * DAY)]: 5, [dayKey(now - 4 * DAY)]: 1 };
    expect(streak(log, now)).toBe(2);
    expect(streak({ ...log, [dayKey(now)]: 2 }, now)).toBe(3);
    expect(streak({}, now)).toBe(0);
  });

  it("lists the last n days oldest first", () => {
    const days = lastDays({ [dayKey(now)]: 4 }, now, 7);
    expect(days).toHaveLength(7);
    expect(days[6]).toMatchObject({ key: "2026-10-16", count: 4 });
    expect(days[0].key).toBe("2026-10-10");
  });

  it("finds the longest run of study days and counts study days", () => {
    const log = { "2026-09-29": 2, "2026-09-30": 1, "2026-10-01": 4, "2026-10-03": 1, "2026-10-04": 0 };
    expect(longestStreak(log)).toBe(3); // 달을 넘어가도 이어진다
    expect(studyDays(log)).toBe(4);
    expect(longestStreak({})).toBe(0);
  });

  it("forecasts reviews per day, putting overdue cards on today and skipping learned cards", () => {
    const cards = {
      a: { due: now - 3 * DAY },
      b: { due: now + 60_000 },
      c: { due: now + DAY },
      d: { due: now + 2 * DAY, learned: true },
      "한자:夜": { due: now + DAY },
      e: { due: now + 30 * DAY },
    };
    const f = reviewForecast(cards, now, 3, (k) => !k.startsWith("한자:"));
    expect(f.map((d) => d.count)).toEqual([2, 1, 0]);
    expect(f[1].key).toBe(dayKey(now + DAY));
  });

  it("works out the share of right answers", () => {
    expect(accuracy({ a: { correct: 6, reps: 2, lapses: 2 }, b: { reps: 2, lapses: 0 } })).toEqual({
      right: 8,
      wrong: 2,
      rate: 80,
    });
    expect(accuracy({}).rate).toBeNull();
  });

  it("lays out a month from Sunday", () => {
    const weeks = monthWeeks(2026, 9); // 2026년 10월: 1일이 목요일
    expect(weeks[0].slice(0, 4)).toEqual([null, null, null, null]);
    expect(weeks[0][4]?.getDate()).toBe(1);
    expect(weeks.flat().filter(Boolean)).toHaveLength(31);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });
});
