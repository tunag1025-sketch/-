import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, makeBackup, mergeData, parseBackup, type UserData } from "../data";
import type { CardState, Song } from "../types";

const song = (id: string, createdAt: number, updatedAt = createdAt, title = id): Song => ({
  id,
  title,
  artist: "",
  level: "N4",
  createdAt,
  updatedAt,
  lines: [],
  status: "ready",
  vocab: [],
  grammar: [],
});
const card = (updatedAt: number, reps = 1): CardState => ({ due: 0, interval: 1, ease: 2.5, reps, lapses: 0, updatedAt });

const empty: UserData = {
  songs: {},
  order: [],
  cards: {},
  explanations: {},
  reviewLog: {},
  newLog: {},
  settings: DEFAULT_SETTINGS,
  deleted: {},
};

describe("mergeData", () => {
  it("keeps the newer song and card and adds missing ones", () => {
    const local: UserData = {
      ...empty,
      songs: { a: song("a", 1, 5, "old"), b: song("b", 2) },
      cards: { 一: card(10, 1) },
    };
    const merged = mergeData(
      local,
      { songs: { a: song("a", 1, 9, "new"), c: song("c", 3) }, cards: { 一: card(8, 5), 二: card(4) } },
      { honorDeletes: true },
    );
    expect(merged.songs.a.title).toBe("new");
    expect(Object.keys(merged.songs).sort()).toEqual(["a", "b", "c"]);
    expect(merged.order).toEqual(["c", "b", "a"]);
    expect(merged.cards["一"].reps).toBe(1);
    expect(merged.cards["二"]).toBeDefined();
  });

  it("folds cards from old backups (song:word) into one card per word", () => {
    const local: UserData = { ...empty, cards: { 一: { ...card(3, 1), interval: 1 } } };
    const merged = mergeData(
      local,
      { cards: { "a1b2c3d4:一": { ...card(2, 4), interval: 9 }, "demo-yoake:二": card(1) } },
      { honorDeletes: false },
    );
    expect(Object.keys(merged.cards).sort()).toEqual(["一", "二"]);
    expect(merged.cards["一"].interval).toBe(9);
    expect(merged.cards["一"].updatedAt).toBe(3);
  });

  it("takes the larger count per day", () => {
    const merged = mergeData({ ...empty, reviewLog: { d1: 3, d2: 1 } }, { reviewLog: { d1: 2, d3: 4 } }, { honorDeletes: true });
    expect(merged.reviewLog).toEqual({ d1: 3, d2: 1, d3: 4 });
  });

  it("does not bring back a song deleted on this device", () => {
    const local: UserData = { ...empty, deleted: { a: 10 } };
    const merged = mergeData(local, { songs: { a: song("a", 1, 5) } }, { honorDeletes: true });
    expect(merged.songs.a).toBeUndefined();
  });

  it("applies deletes from the other side but keeps word cards", () => {
    const local: UserData = {
      ...empty,
      songs: { a: song("a", 1, 5) },
      cards: { 一: card(5) },
      explanations: { "a:0": { translation: "", breakdown: [], notes: "" } },
    };
    const merged = mergeData(local, { deleted: { a: 7 } }, { honorDeletes: true });
    expect(merged.songs.a).toBeUndefined();
    expect(merged.explanations).toEqual({});
    expect(merged.cards["一"]).toBeDefined();
    expect(merged.deleted.a).toBe(7);
  });

  it("restores deleted songs when importing a backup", () => {
    const local: UserData = { ...empty, deleted: { a: 10 } };
    const merged = mergeData(local, { songs: { a: song("a", 1, 5) } }, { honorDeletes: false });
    expect(merged.songs.a).toBeDefined();
    expect(merged.deleted.a).toBeUndefined();
  });
});

describe("backup file", () => {
  it("round-trips through makeBackup and parseBackup", () => {
    const data: UserData = { ...empty, songs: { a: song("a", 1) }, cards: { 一: card(3) }, reviewLog: { d: 2 } };
    const parsed = parseBackup(makeBackup(data, 0));
    expect(parsed?.songs?.a.title).toBe("a");
    expect(parsed?.cards?.["一"].updatedAt).toBe(3);
    expect(parsed?.reviewLog).toEqual({ d: 2 });
  });

  it("rejects files that are not Utango backups", () => {
    expect(parseBackup("not json")).toBeNull();
    expect(parseBackup(JSON.stringify({ app: "other", data: {} }))).toBeNull();
  });
});
