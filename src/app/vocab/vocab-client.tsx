"use client";

import { useMemo, useState } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { Icon } from "@/components/Icon";
import { PageTitle } from "@/components/PageHeader";
import { Sheet } from "@/components/Sheet";
import { VocabDetail } from "@/components/VocabDetail";
import { VocabRow } from "@/components/VocabRow";
import { kataToHira } from "@/lib/furigana";
import { isDue, isLearned } from "@/lib/srs";
import { useStore } from "@/lib/store";

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
  const [now] = useState(Date.now);

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
  const learned = all.filter((v) => isLearned(cards[v.id])).length;
  const due = all.filter((v) => cards[v.id] && isDue(cards[v.id], now)).length;

  return (
    <div className="space-y-5">
      <PageTitle title="단어장" sub="노래에서 모은 단어" />

      <div className="grid grid-cols-3 gap-2.5">
        <Stat label="전체" value={all.length} tone="bg-surface" />
        <Stat label="외운 단어" value={learned} tone="bg-lav text-on-lav" />
        <Stat label="복습 대기" value={due} tone="bg-surface" />
      </div>

      <div className="relative">
        <Icon name="search" className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-ink-3" />
        <label htmlFor="vocab-search" className="sr-only">
          단어 찾기
        </label>
        <input
          id="vocab-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="단어, 읽는 법, 뜻으로 찾기"
          className="font-jp input rounded-full bg-surface pl-11"
        />
      </div>

      {songsWithVocab.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {[["all", "전체"] as const, ...songsWithVocab.map((id) => [id, songs[id].title] as const)].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSongFilter(id)}
              aria-pressed={songFilter === id}
              className={`press font-jp shrink-0 rounded-full px-4 py-2.5 text-[14px] font-semibold ${
                songFilter === id ? "bg-lime text-on-lime" : "bg-surface text-ink-2"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <p className="py-16 text-center text-[14px] text-ink-3">
          {all.length === 0 ? "노래를 추가하면 여기에 단어가 모여요." : "찾는 단어가 없어요."}
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[28px] bg-surface">
          {items.map((v) => (
            <VocabRow
              key={v.id}
              item={v}
              suspended={cards[v.id]?.suspended}
              sub={songFilter === "all" ? songs[v.songId]?.title : undefined}
              onClick={() => setOpenId(v.id)}
            />
          ))}
        </ul>
      )}

      <Sheet open={!!open} onClose={() => setOpenId(null)} title={open ? songs[open.songId]?.title : undefined}>
        {open && <VocabDetail item={open} song={songs[open.songId]} />}
      </Sheet>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-[22px] px-3.5 py-3 ${tone}`}>
      <p className="num text-[26px] leading-none font-semibold">{value}</p>
      <p className="mt-1.5 text-[12px] font-medium opacity-70">{label}</p>
    </div>
  );
}
