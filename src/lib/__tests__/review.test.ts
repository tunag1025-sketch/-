import { describe, expect, it } from "vitest";
import { buildQueue, clampDailyNew, remainingNew } from "../review";
import { newCard } from "../srs";
import { dayKey } from "../stats";
import type { CardState, Song, VocabItem } from "../types";

const now = 1_700_000_000_000;

function song(id: string, words: string[]): Song {
  const vocab = words.map(
    (word) => ({ id: `${id}:${word}`, songId: id, word, lines: [], examples: [] }) as unknown as VocabItem,
  );
  return { id, title: id, artist: "", level: "N4", createdAt: 0, lines: [], status: "ready", vocab, grammar: [] };
}

const songs = { a: song("a", ["一", "二", "三"]), b: song("b", ["四", "五"]) };
const order = ["a", "b"];

describe("buildQueue", () => {
  it("puts due cards first, then new cards up to the limit", () => {
    const cards: Record<string, CardState> = { 四: { ...newCard(now - 10), due: now - 5 } };
    const { queue, dueCount, newCount, freshTotal } = buildQueue(songs, order, cards, now, { newLimit: 2 });
    expect(queue.map((v) => v.word)).toEqual(["四", "一", "二"]);
    expect([dueCount, newCount, freshTotal]).toEqual([1, 2, 4]);
  });

  it("leaves out learned words and words not yet due", () => {
    const cards: Record<string, CardState> = {
      一: { ...newCard(now), learned: true },
      二: { ...newCard(now), due: now + 1000 },
    };
    const { queue } = buildQueue(songs, order, cards, now, { newLimit: 10 });
    expect(queue.map((v) => v.word)).toEqual(["三", "四", "五"]);
  });

  it("can limit the queue to one song", () => {
    const { queue } = buildQueue(songs, order, {}, now, { songId: "b", newLimit: 10 });
    expect(queue.map((v) => v.word)).toEqual(["四", "五"]);
  });

  it("asks a word that appears in two songs only once", () => {
    const both = { ...songs, c: song("c", ["二", "六"]) };
    const { queue, freshTotal } = buildQueue(both, ["c", ...order], {}, now, { newLimit: 10 });
    expect(queue.map((v) => v.id)).toEqual(["c:二", "c:六", "a:一", "a:三", "b:四", "b:五"]);
    expect(freshTotal).toBe(6);
  });

  it("does not teach again a word already studied in another song", () => {
    const both = { ...songs, c: song("c", ["二", "六"]) };
    const cards: Record<string, CardState> = { 二: { ...newCard(now), due: now + 1000, reps: 1, correct: 1 } };
    const { queue, newCount } = buildQueue(both, ["c", ...order], cards, now, { songId: "c", newLimit: 10 });
    expect(queue.map((v) => v.word)).toEqual(["六"]);
    expect(newCount).toBe(1);
  });
});

describe("remainingNew", () => {
  it("subtracts the new words already studied today", () => {
    expect(remainingNew(20, { [dayKey(now)]: 15 }, now)).toBe(5);
    expect(remainingNew(10, { [dayKey(now)]: 15 }, now)).toBe(0);
    expect(remainingNew(10, {}, now)).toBe(10);
  });
});

describe("clampDailyNew", () => {
  it("keeps typed amounts inside 1–300", () => {
    expect(clampDailyNew("15")).toBe(15);
    expect(clampDailyNew("0")).toBe(1);
    expect(clampDailyNew("999")).toBe(300);
    expect(clampDailyNew("12.6")).toBe(13);
    expect(clampDailyNew("")).toBeNull();
    expect(clampDailyNew("abc")).toBeNull();
  });
});
