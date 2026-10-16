"use client";

import { create } from "zustand";
import { PREVIEW, resetPreviewData } from "./preview";
import { pickData, useStore } from "./store";
import {
  allRefs,
  applyEntities,
  changedRefs,
  chunkEntities,
  type Entity,
  type Ref,
  ref,
  type SyncState,
  toEntity,
} from "./sync-core";

const META_KEY = "utango-sync";
/** 2: 카드를 단어마다 하나로 합친 뒤 (합친 카드를 한 번 모두 올린다) */
const META_VERSION = 2;
type Meta = { userId: string; cursor: number; dirty: Ref[]; v?: number };

export type SyncStatus = "off" | "syncing" | "synced" | "offline" | "error";
export const useSyncStatus = create<{ status: SyncStatus; lastSynced: number | null }>(() => ({
  status: "off",
  lastSynced: null,
}));

let meta: Meta | null = null;
let unsubscribe: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let interval: ReturnType<typeof setInterval> | null = null;
let running: Promise<void> | null = null;
let applying = false;

function loadMeta(): Meta | null {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) ?? "null");
  } catch {
    return null;
  }
}
function saveMeta() {
  try {
    if (meta) localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // 저장 공간이 꽉 차도 동기화는 다음에 다시 한다.
  }
}

function toSync(s: ReturnType<typeof useStore.getState>): SyncState {
  return { ...pickData(s), settingsUpdatedAt: s.settingsUpdatedAt };
}

function markDirty(refs: Ref[]) {
  if (!meta) return;
  const set = new Set(meta.dirty);
  for (const r of refs) set.add(r);
  meta.dirty = [...set];
  saveMeta();
}

class HttpError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}

async function push() {
  if (!meta?.dirty.length) return;
  const refs = meta.dirty;
  meta.dirty = [];
  saveMeta();
  const state = toSync(useStore.getState());
  const entities = refs.map((r) => toEntity(state, r)).filter((e): e is Entity => e !== null);
  try {
    for (const chunk of chunkEntities(entities)) {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entities: chunk }),
      });
      if (!res.ok) throw new HttpError(res.status);
    }
  } catch (err) {
    markDirty(refs);
    throw err;
  }
}

async function pull() {
  for (let page = 0; page < 100 && meta; page++) {
    const res = await fetch(`/api/sync?since=${meta.cursor}`, { cache: "no-store" });
    if (!res.ok) throw new HttpError(res.status);
    const data = (await res.json()) as { entities: Entity[]; cursor: number; more: boolean };
    if (data.entities.length) {
      applying = true;
      try {
        useStore.setState(applyEntities(toSync(useStore.getState()), data.entities));
      } finally {
        applying = false;
      }
    }
    meta.cursor = data.cursor;
    saveMeta();
    if (!data.more) break;
  }
}

/** 올릴 것을 올리고 새로 바뀐 것을 받는다. 동시에 두 번 돌지 않는다. */
export function syncNow(): Promise<void> {
  if (!meta) return Promise.resolve();
  running ??= (async () => {
    useSyncStatus.setState({ status: "syncing" });
    try {
      await push();
      await pull();
      useSyncStatus.setState({ status: "synced", lastSynced: Date.now() });
    } catch (err) {
      useSyncStatus.setState({ status: err instanceof HttpError ? "error" : "offline" });
    } finally {
      running = null;
    }
  })();
  return running;
}

function schedulePush() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), 1500);
}

const onVisible = () => {
  if (document.visibilityState === "visible") void syncNow();
  // 앱을 닫거나 다른 앱으로 갈 때 남은 것을 바로 올린다.
  else if (meta?.dirty.length) void syncNow();
};
const onOnline = () => void syncNow();

/** 로그인한 사용자의 동기화를 켠다. 이 기기에서 처음이면 지금 데이터를 모두 올리고 전부 받는다. */
export function startSync(userId: string) {
  stopSync();
  meta = loadMeta();
  if (!meta || meta.userId !== userId) {
    meta = { userId, cursor: 0, dirty: allRefs(toSync(useStore.getState())), v: META_VERSION };
    saveMeta();
  } else if ((meta.v ?? 1) < META_VERSION) {
    // 이 기기에서 단어 열쇠로 바꾼 카드를 서버에도 올린다.
    meta.v = META_VERSION;
    markDirty(Object.keys(useStore.getState().cards).map((key) => ref("card", key)));
  }
  unsubscribe = useStore.subscribe((state, prev) => {
    if (applying) return;
    const refs = changedRefs(toSync(state), toSync(prev));
    if (refs.length) {
      markDirty(refs);
      schedulePush();
    }
  });
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("online", onOnline);
  interval = setInterval(() => document.visibilityState === "visible" && void syncNow(), 60_000);
  void syncNow();
}

export function stopSync() {
  unsubscribe?.();
  unsubscribe = null;
  if (timer) clearTimeout(timer);
  if (interval) clearInterval(interval);
  timer = interval = null;
  document.removeEventListener("visibilitychange", onVisible);
  window.removeEventListener("online", onOnline);
  meta = null;
  useSyncStatus.setState({ status: "off" });
}

/** 아직 못 올린 변경이 있는지 */
export const hasPending = () => (meta?.dirty.length ?? 0) > 0;

/** 로그아웃 전: 남은 것을 올린다. 다 올렸으면 true. */
export async function flush(): Promise<boolean> {
  await syncNow();
  return !hasPending() && useSyncStatus.getState().status === "synced";
}

/** 로그아웃한 뒤 이 기기의 학습 데이터를 지운다 (다음 사람이 이어 쓰지 않게). */
export function clearLocalData() {
  stopSync();
  // 미리보기에서는 샘플 데이터만 지운다.
  if (PREVIEW) return resetPreviewData();
  try {
    localStorage.removeItem(META_KEY);
    localStorage.removeItem("utango-v1");
  } catch {
    // 무시
  }
}
