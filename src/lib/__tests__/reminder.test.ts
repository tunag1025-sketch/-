import { describe, expect, it } from "vitest";
import { kstDay, reminderMessage } from "../reminder";

describe("daily reminder", () => {
  it("uses the Korean date", () => {
    expect(kstDay(Date.UTC(2026, 9, 16, 14, 59))).toBe("2026-10-16");
    expect(kstDay(Date.UTC(2026, 9, 16, 15, 0))).toBe("2026-10-17");
  });

  it("stays quiet after studying today and mentions waiting reviews", () => {
    expect(reminderMessage({ due: 5, studiedToday: true })).toBeNull();
    expect(reminderMessage({ due: 5, studiedToday: false })?.body).toContain("5개");
    expect(reminderMessage({ due: 0, studiedToday: false })?.url).toBe("/study");
  });
});
