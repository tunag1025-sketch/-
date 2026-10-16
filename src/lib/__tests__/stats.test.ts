import { describe, expect, it } from "vitest";
import { dayKey, lastDays, streak } from "../stats";

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
});
