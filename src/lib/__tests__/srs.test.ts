import { describe, expect, it } from "vitest";
import { intervalLabel, isDue, newCard, schedule } from "../srs";

const DAY = 86_400_000;
const now = 1_700_000_000_000;

describe("schedule", () => {
  it("grows intervals on repeated good answers", () => {
    let card = schedule(newCard(now), "good", now);
    expect(card.interval).toBe(1);
    card = schedule(card, "good", card.due);
    expect(card.interval).toBe(3);
    card = schedule(card, "good", card.due);
    expect(card.interval).toBe(Math.round(3 * 2.5));
  });

  it("resets on again and shows the card again in a minute", () => {
    const learned = schedule(schedule(newCard(now), "good", now), "good", now + DAY);
    const lapsed = schedule(learned, "again", now + 4 * DAY);
    expect(lapsed.reps).toBe(0);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.due).toBe(now + 4 * DAY + 60_000);
    expect(lapsed.ease).toBeCloseTo(2.3);
  });

  it("never lets ease drop below 1.3", () => {
    let card = newCard(now);
    for (let i = 0; i < 20; i++) card = schedule(card, "again", now);
    expect(card.ease).toBe(1.3);
  });

  it("labels intervals in Korean units", () => {
    expect(intervalLabel(newCard(now), "again", now)).toBe("1분");
    expect(intervalLabel(newCard(now), "easy", now)).toBe("4일");
  });
});

describe("isDue", () => {
  it("treats unseen cards as due and skips suspended ones", () => {
    expect(isDue(undefined, now)).toBe(true);
    expect(isDue({ ...newCard(now), suspended: true }, now)).toBe(false);
  });
});
