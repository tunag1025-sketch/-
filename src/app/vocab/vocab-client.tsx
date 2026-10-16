"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/Badge";
import { HydrationGate } from "@/components/HydrationGate";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { VocabDetail } from "@/components/VocabDetail";
import { useStore } from "@/lib/store";
import { kataToHira } from "@/lib/furigana";

export function VocabClient() {
  return (
    <HydrationGate>
      <VocabList />
    </HydrationGate>
  );
}

function VocabList() {
  const songs = useStore((s) => s.songs);
  const order = useStore((s) => s.order);
  const cards = useStore((s) => s.cards);
  const [query, setQuery] = useState("");
  const [songFilter, setSongFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const all = useMemo(
    () => order.flatMap((id) => (songs[id]?.status === "ready" ? songs[id].vocab : [])),
    [songs, order],
  );
  const q = kataToHira(query.trim().toLowerCase());
  const items = all.filter(
    (v) =>
      (songFilter === "all" || v.songId === songFilter) &&
      (!q || v.word.includes(q) || v.reading.includes(q) || v.meaning.toLowerCase().includes(q)),
  );
  const open = openId ? all.find((v) => v.id === openId) : undefined;
  const songsWithVocab = order.filter((id) => songs[id]?.vocab.length);

  return (
    <div className="space-y-4 pt-6">
      <header className="flex items-end justify-between">
        <h1 className="text-2xl font-bold">단어장</h1>
        <span className="text-sm text-ink-3">
          {all.length}개 · 외운 단어 {all.filter((v) => cards[v.id]?.suspended).length}개
        </span>
      </header>

      <div className="relative">
        <Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="단어, 읽기, 뜻으로 찾기"
          className="font-jp input pl-10"
        />
      </div>

      {songsWithVocab.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {[["all", "전체"] as const, ...songsWithVocab.map((id) => [id, songs[id].title] as const)].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSongFilter(id)}
              className={`font-jp shrink-0 rounded-full border px-3.5 py-1.5 text-sm ${
                songFilter === id ? "border-accent bg-accent-soft font-semibold text-accent" : "border-line bg-surface text-ink-2"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink-3">
          {all.length === 0 ? "노래를 추가하면 여기에 단어가 모여요." : "찾는 단어가 없어요."}
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
          {items.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => setOpenId(v.id)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-2"
              >
                <div className="font-jp min-w-0 flex-1">
                  <div className="text-xs text-ink-3">{v.reading}</div>
                  <div className="text-lg font-bold">{v.word}</div>
                </div>
                <div className="min-w-0 flex-[1.4]">
                  <div className="text-[15px] text-ink-2">{v.meaning}</div>
                  <div className="font-jp truncate text-xs text-ink-3">♪ {songs[v.songId]?.title}</div>
                </div>
                <div className="shrink-0">
                  {cards[v.id]?.suspended ? (
                    <Icon name="check" className="size-5 text-good" />
                  ) : (
                    v.jlpt !== "기타" && <Badge tone="accent">{v.jlpt}</Badge>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={!!open} onClose={() => setOpenId(null)} title={open ? songs[open.songId]?.title : undefined}>
        {open && <VocabDetail item={open} song={songs[open.songId]} />}
      </Sheet>
    </div>
  );
}
