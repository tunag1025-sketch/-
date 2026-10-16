import { describe, expect, it } from "vitest";
import { graduates, intervalLabel, isDue, isLearned, memoryOf, newCard, progressOf, schedule } from "../srs";
import type { CardState, Grade } from "../types";

const DAY = 86_400_000;
const now = 1_700_000_000_000;

function run(grades: Grade[]): CardState {
  let card = newCard(now);
  for (const g of grades) card = schedule(card, g, card.due);
  return card;
}

describe("schedule", () => {
  it("grows intervals on repeated 이해", () => {
    let card = schedule(newCard(now), "good", now);
    expect(card.interval).toBe(1);
    card = schedule(card, "good", card.due);
    expect(card.interval).toBe(3);
    card = schedule(card, "good", card.due);
    expect(card.interval).toBe(Math.round(3 * 2.5));
  });

  it("resets on 다시 and shows the card again in a minute", () => {
    const seen = run(["good", "good"]);
    const lapsed = schedule(seen, "again", now + 4 * DAY);
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
    expect(intervalLabel(newCard(now), "good", now)).toBe("1일");
    expect(intervalLabel(newCard(now), "perfect", now)).toBe("4일");
  });
});

describe("learned words", () => {
  it("moves a word to 외운 단어 after three 완벽 in a row", () => {
    expect(isLearned(run(["perfect", "perfect"]))).toBe(false);
    const card = run(["perfect", "perfect", "perfect"]);
    expect(isLearned(card)).toBe(true);
    expect(card.learnedAt).toBeDefined();
  });

  it("counts 완벽 only when consecutive", () => {
    expect(run(["perfect", "perfect", "again", "perfect"]).perfect).toBe(1);
    expect(isLearned(run(["perfect", "good", "perfect"]))).toBe(false);
  });

  it("moves a word once the next review is three weeks away", () => {
    const card = run(["good", "good", "good", "good", "good"]);
    expect(card.interval).toBeGreaterThanOrEqual(21);
    expect(isLearned(card)).toBe(true);
    expect(isLearned(run(["good", "good", "good"]))).toBe(false);
  });

  it("tells ahead which answer graduates the word", () => {
    const card = run(["perfect", "perfect"]);
    expect(graduates(card, "perfect", card.due)).toBe(true);
    expect(graduates(card, "again", card.due)).toBe(false);
    const early = run(["good"]);
    expect(graduates(early, "good", early.due)).toBe(false);
  });
});

describe("isDue", () => {
  it("treats unseen cards as due and skips learned ones", () => {
    expect(isDue(undefined, now)).toBe(true);
    expect(isDue({ ...newCard(now), learned: true }, now)).toBe(false);
  });
});

describe("memory levels", () => {
  it("puts a word in short-term memory after one 이해 or 완벽, long-term once learned", () => {
    expect(memoryOf(undefined)).toBe("none");
    expect(memoryOf(run(["again"]))).toBe("none");
    expect(memoryOf(run(["good"]))).toBe("short");
    // 한 번 맞힌 단어는 다시를 눌러도 단기기억에 남는다.
    expect(memoryOf(run(["good", "again"]))).toBe("short");
    expect(memoryOf(run(["perfect", "perfect", "perfect"]))).toBe("long");
  });

  it("counts progress by level", () => {
    const cards = { a: run(["good"]), b: run(["perfect", "perfect", "perfect"]), c: run(["again"]) };
    expect(progressOf([{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }], cards)).toEqual({ total: 4, long: 1, short: 1 });
  });
});
