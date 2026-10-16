"use client";

import { useMemo, useState } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { Icon } from "@/components/Icon";
import { Mascot } from "@/components/Mascots";
import { Headline } from "@/components/PageHeader";
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
    <div className="space-y-5 pt-5">
      <div className="flex items-end justify-between gap-3">
        <Headline first="노래에서 모은" second="나의 단어장" />
        <Mascot kind="bubble" className="float size-16 shrink-0" style={{ "--tilt": "8deg" } as React.CSSProperties} />
      </div>

      <div className="card grid grid-cols-3 py-4">
        <Stat value={all.length} label="모은 단어" />
        <Stat value={learned} label="외운 단어" />
        <Stat value={due} label="복습 대기" />
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
          className="font-jp input rounded-full pl-11"
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
              className="chip press font-jp shrink-0"
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <Mascot kind={all.length === 0 ? "note" : "bubble"} className="size-16" />
          <p className="mt-3 text-[14px] text-ink-3">
            {all.length === 0 ? "노래를 추가하면 여기에 단어가 모여요." : "찾는 단어가 없어요."}
          </p>
        </div>
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
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

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <p className="num text-[28px] leading-none font-medium">{value}</p>
      <p className="grad-text mt-1.5 text-[13px] font-semibold">{label}</p>
    </div>
  );
}
