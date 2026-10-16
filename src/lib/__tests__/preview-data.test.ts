import { describe, expect, it } from "vitest";
import { cardKey, uniqueVocab } from "../cards";
import { makePreviewState, previewApi } from "../preview-data";
import { buildQueue, remainingNew } from "../review";
import { progressOf } from "../srs";
import { streak } from "../stats";

const now = new Date(2026, 9, 16, 15).getTime();
const state = makePreviewState(now);

describe("preview sample data", () => {
  it("has ready songs plus one being analyzed and one that failed, newest first", () => {
    expect(state.order[0]).toBe("pv-new");
    expect(Object.values(state.songs).map((s) => s.status).sort()).toEqual(["analyzing", "error", "ready", "ready", "ready"]);
    const created = state.order.map((id) => state.songs[id].createdAt);
    expect([...created].sort((a, b) => b - a)).toEqual(created);
  });

  it("only keeps cards for words that appear in the songs", () => {
    const words = new Set(uniqueVocab(state.songs, state.order).map(cardKey));
    for (const key of Object.keys(state.cards)) expect(words.has(key), key).toBe(true);
  });

  it("explains lines that exist and points vocab at real lines", () => {
    for (const key of Object.keys(state.explanations)) {
      const [id, line] = key.split(":");
      expect(state.songs[id].lines[Number(line)].text.trim(), key).not.toBe("");
    }
    for (const song of Object.values(state.songs)) {
      for (const v of song.vocab) for (const n of v.lines) expect(song.lines[n].text).toContain(v.formInSong);
    }
  });

  it("shows a mix of progress and something to study today", () => {
    const all = uniqueVocab(state.songs, state.order);
    const p = progressOf(all, state.cards);
    expect(p.long).toBeGreaterThan(0);
    expect(p.short).toBeGreaterThan(0);
    expect(p.total - p.long - p.short).toBeGreaterThan(0);
    const { dueCount, newCount } = buildQueue(state.songs, state.order, state.cards, now, {
      newLimit: remainingNew(state.settings.dailyNew, state.newLog, now),
    });
    expect(dueCount).toBe(5);
    expect(newCount).toBeGreaterThan(0);
    expect(streak(state.reviewLog, now)).toBe(5);
  });
});

describe("preview API", () => {
  const call = async (path: string, method = "GET", guest = false) =>
    (await previewApi(new URL(path, "http://x"), method, guest)).json();

  it("answers as a signed-in admin, or as a guest", async () => {
    expect((await call("/api/me")).user.role).toBe("admin");
    expect((await call("/api/me", "GET", true)).user).toBeNull();
  });

  it("finds sample songs and keeps invites for the tab", async () => {
    expect((await call("/api/songs/search?q=utango")).results.length).toBeGreaterThan(2);
    const { code } = await call("/api/invites", "POST");
    expect((await call("/api/invites")).invites.map((i: { code: string }) => i.code)).toContain(code);
  });

  it("never pulls anything from sync", async () => {
    expect(await call("/api/sync?since=0")).toEqual({ entities: [], cursor: 0, more: false });
  });
});
