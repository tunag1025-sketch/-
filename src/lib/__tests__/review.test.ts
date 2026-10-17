import { describe, expect, it } from "vitest";
import { buildQueue, clampDailyNew, mixQueue, type QueueEntry, remainingNew } from "../review";
import { newCard } from "../srs";
import { dayKey } from "../stats";
import type { CardState, GrammarPoint, Song, VocabItem } from "../types";

const now = 1_700_000_000_000;

function song(id: string, words: string[], patterns: string[] = []): Song {
  const vocab = words.map(
    (word) => ({ id: `${id}:${word}`, songId: id, word, lines: [], examples: [] }) as unknown as VocabItem,
  );
  const grammar: GrammarPoint[] = patterns.map((pattern) => ({ pattern, meaning: "", line: 0, explanation: "" }));
  return { id, title: id, artist: "", level: "N4", createdAt: 0, lines: [], status: "ready", vocab, grammar };
}

const nameOf = (e: QueueEntry) => (e.kind === "word" ? e.item.word : e.item.pattern);

const songs = { a: song("a", ["一", "二", "三"]), b: song("b", ["四", "五"]) };
const order = ["a", "b"];

describe("buildQueue", () => {
  it("puts due cards first, then new cards up to the limit, taking one from each song in turn", () => {
    const cards: Record<string, CardState> = { 四: { ...newCard(now - 10), due: now - 5 } };
    const { queue, dueCount, newCount, freshTotal } = buildQueue(songs, order, cards, now, { newLimit: 2 });
    expect(queue.map(nameOf)).toEqual(["四", "一", "五"]);
    expect([dueCount, newCount, freshTotal]).toEqual([1, 2, 4]);
  });

  it("leaves out learned words and words not yet due", () => {
    const cards: Record<string, CardState> = {
      一: { ...newCard(now), learned: true },
      二: { ...newCard(now), due: now + 1000 },
    };
    const { queue } = buildQueue(songs, order, cards, now, { newLimit: 10 });
    expect(queue.map(nameOf)).toEqual(["三", "四", "五"]);
  });

  it("can limit the queue to one song", () => {
    const { queue } = buildQueue(songs, order, {}, now, { songId: "b", newLimit: 10 });
    expect(queue.map(nameOf)).toEqual(["四", "五"]);
  });

  it("asks a word that appears in two songs only once", () => {
    const both = { ...songs, c: song("c", ["二", "六"]) };
    const { queue, freshTotal } = buildQueue(both, ["c", ...order], {}, now, { newLimit: 10 });
    expect(queue.map((e) => e.id)).toEqual(["c:二", "a:一", "b:四", "c:六", "a:三", "b:五"]);
    expect(freshTotal).toBe(6);
  });

  it("does not teach again a word already studied in another song", () => {
    const both = { ...songs, c: song("c", ["二", "六"]) };
    const cards: Record<string, CardState> = { 二: { ...newCard(now), due: now + 1000, reps: 1, correct: 1 } };
    const { queue, newCount } = buildQueue(both, ["c", ...order], cards, now, { songId: "c", newLimit: 10 });
    expect(queue.map(nameOf)).toEqual(["六"]);
    expect(newCount).toBe(1);
  });

  it("mixes grammar points in with the words in lyric-line order, sharing the new-card limit", () => {
    const a = song("a", ["一", "二", "三"], ["〜ても", "〜て"]);
    a.vocab.forEach((v, i) => (v.lines = [i * 2])); // 一: 0줄, 二: 2줄, 三: 4줄
    a.grammar[0].line = 2; // 〜ても: 2줄 (二 다음)
    a.grammar[1].line = 5;
    const withGrammar = { a, b: song("b", ["四"], ["〜ても"]) };
    const cards: Record<string, CardState> = { "문법:〜て": { ...newCard(now - 10), due: now - 5 } };
    const { queue, dueCount, newCount, freshTotal } = buildQueue(withGrammar, order, cards, now, { newLimit: 4 });
    // 노래 a 안에서는 一 → 二 → 〜ても(2줄) → 三 순서, 노래 b의 四가 한 바퀴째에 끼어든다.
    expect(queue.map(nameOf)).toEqual(["〜て", "一", "四", "二", "〜ても"]);
    expect(queue.map((e) => e.kind)).toEqual(["grammar", "word", "word", "word", "grammar"]);
    expect(queue[0].key).toBe("문법:〜て");
    expect([dueCount, newCount, freshTotal]).toEqual([1, 4, 5]);
  });
});

describe("mixQueue", () => {
  it("shuffles without losing or repeating cards", () => {
    let seed = 1;
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const list = Array.from({ length: 30 }, (_, i) => i);
    const mixed = mixQueue(list, rand);
    expect(mixed).not.toEqual(list);
    expect([...mixed].sort((a, b) => a - b)).toEqual(list);
    expect(list[0]).toBe(0); // 원래 목록은 그대로
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
