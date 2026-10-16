import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../data";
import { allRefs, applyEntities, changedRefs, chunkEntities, type SyncState, toEntity } from "../sync-core";
import type { CardState, Song } from "../types";

const song = (id: string, updatedAt: number, extra: Partial<Song> = {}): Song => ({
  id,
  title: id,
  artist: "",
  level: "N4",
  createdAt: updatedAt,
  updatedAt,
  lines: [],
  status: "ready",
  vocab: [],
  grammar: [],
  ...extra,
});
const card = (updatedAt: number): CardState => ({ due: 0, interval: 1, ease: 2.5, reps: 1, lapses: 0, updatedAt });

const base: SyncState = {
  songs: {},
  order: [],
  cards: {},
  explanations: {},
  reviewLog: {},
  newLog: {},
  settings: DEFAULT_SETTINGS,
  deleted: {},
  settingsUpdatedAt: 0,
};

describe("sync refs", () => {
  it("lists everything except the demo song (word cards go up even from the demo song)", () => {
    const state: SyncState = {
      ...base,
      songs: { a: song("a", 1), demo: song("demo", 1, { isDemo: true }) },
      cards: { 一: card(1), 二: card(1) },
      reviewLog: { "2026-10-16": 3 },
      deleted: { z: 5 },
    };
    expect(allRefs(state).sort()).toEqual([
      "card|一",
      "card|二",
      "day|r:2026-10-16",
      "settings|settings",
      "song|a",
      "song|z",
    ]);
  });

  it("finds what changed between two states", () => {
    const prev: SyncState = { ...base, songs: { a: song("a", 1), b: song("b", 1) }, cards: { 一: card(1) } };
    const next: SyncState = {
      ...prev,
      songs: { a: prev.songs.a },
      cards: { 一: card(2) },
      reviewLog: { d: 1 },
      deleted: { b: 3 },
    };
    expect(changedRefs(next, prev).sort()).toEqual(["card|一", "day|r:d", "song|b"]);
    expect(toEntity(next, "song|b")).toEqual({ kind: "song", key: "b", data: null, updatedAt: 3, deleted: true });
  });
});

describe("applyEntities", () => {
  it("keeps the newer side", () => {
    const state: SyncState = { ...base, songs: { a: song("a", 5, { title: "local" }) }, cards: { 一: card(9) } };
    const next = applyEntities(state, [
      { kind: "song", key: "a", data: song("a", 4, { title: "old" }), updatedAt: 4 },
      { kind: "song", key: "b", data: song("b", 2), updatedAt: 2 },
      { kind: "card", key: "一", data: card(3), updatedAt: 3 },
      { kind: "day", key: "r:d", data: { count: 4 }, updatedAt: 0 },
      { kind: "settings", key: "settings", data: { ...DEFAULT_SETTINGS, dailyNew: 30 }, updatedAt: 7 },
    ]);
    expect(next.songs.a.title).toBe("local");
    expect(next.songs.b).toBeDefined();
    expect(next.cards["一"].updatedAt).toBe(9);
    expect(next.reviewLog.d).toBe(4);
    expect(next.settings.dailyNew).toBe(30);
    expect(next.order).toEqual(["a", "b"]);
  });

  it("removes a song deleted elsewhere with its explanations but keeps word cards", () => {
    const state: SyncState = { ...base, songs: { a: song("a", 5) }, cards: { 一: card(5) }, explanations: { "a:0": { translation: "", breakdown: [], notes: "" } } };
    const next = applyEntities(state, [{ kind: "song", key: "a", data: null, updatedAt: 6, deleted: true }]);
    expect(next.songs.a).toBeUndefined();
    expect(next.cards["一"]).toBeDefined();
    expect(next.explanations).toEqual({});
  });

  it("folds old per-song cards from the server into the word card, whatever the order", () => {
    const mature = { ...card(5), interval: 12, correct: 4 };
    const fresh = { ...card(9), interval: 0, correct: 0 };
    const merged = { ...mature, updatedAt: 9 };
    const entities = [
      { kind: "card" as const, key: "aaaa1111:一", data: mature, updatedAt: 5 },
      { kind: "card" as const, key: "bbbb2222:一", data: fresh, updatedAt: 9 },
      { kind: "card" as const, key: "一", data: merged, updatedAt: 9 },
    ];
    for (const list of [entities, [...entities].reverse()]) {
      const next = applyEntities(base, list);
      expect(Object.keys(next.cards)).toEqual(["一"]);
      expect(next.cards["一"].interval).toBe(12);
    }
  });

  it("does not let an old copy bring back a deleted song", () => {
    const state: SyncState = { ...base, deleted: { a: 10 } };
    const next = applyEntities(state, [{ kind: "song", key: "a", data: song("a", 4), updatedAt: 4 }]);
    expect(next.songs.a).toBeUndefined();
  });
});

describe("chunkEntities", () => {
  it("splits big uploads", () => {
    const big = Array.from({ length: 10 }, (_, i) => ({ kind: "expl" as const, key: `a:${i}`, data: "x".repeat(400), updatedAt: 0 }));
    const chunks = chunkEntities(big, 1000);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.flat()).toHaveLength(10);
  });
});
