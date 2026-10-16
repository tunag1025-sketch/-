import { describe, expect, it } from "vitest";
import { buildQueue, remainingNew } from "../review";
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
    const cards: Record<string, CardState> = { "b:四": { ...newCard(now - 10), due: now - 5 } };
    const { queue, dueCount, newCount, freshTotal } = buildQueue(songs, order, cards, now, { newLimit: 2 });
    expect(queue.map((v) => v.word)).toEqual(["四", "一", "二"]);
    expect([dueCount, newCount, freshTotal]).toEqual([1, 2, 4]);
  });

  it("leaves out learned words and words not yet due", () => {
    const cards: Record<string, CardState> = {
      "a:一": { ...newCard(now), learned: true },
      "a:二": { ...newCard(now), due: now + 1000 },
    };
    const { queue } = buildQueue(songs, order, cards, now, { newLimit: 10 });
    expect(queue.map((v) => v.word)).toEqual(["三", "四", "五"]);
  });

  it("can limit the queue to one song", () => {
    const { queue } = buildQueue(songs, order, {}, now, { songId: "b", newLimit: 10 });
    expect(queue.map((v) => v.word)).toEqual(["四", "五"]);
  });
});

describe("remainingNew", () => {
  it("subtracts the new words already studied today", () => {
    expect(remainingNew(20, { [dayKey(now)]: 15 }, now)).toBe(5);
    expect(remainingNew(10, { [dayKey(now)]: 15 }, now)).toBe(0);
    expect(remainingNew(10, {}, now)).toBe(10);
  });
});
