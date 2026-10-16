"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { Icon, IconCircle } from "@/components/Icon";
import { Headline } from "@/components/PageHeader";
import { Sheet } from "@/components/Sheet";
import { VocabDetail } from "@/components/VocabDetail";
import { VocabRow } from "@/components/VocabRow";
import { kataToHira } from "@/lib/furigana";
import { buildQueue, remainingNew, reviewHref } from "@/lib/review";
import { type Memory, memoryOf, progressOf } from "@/lib/srs";
import { useStore } from "@/lib/store";

export function VocabClient() {
  return (
    <HydrationGate>
      <VocabList />
    </HydrationGate>
  );
}

type Status = "all" | Memory;
const STATUSES: [Status, string][] = [
  ["all", "전체"],
  ["none", "학습 전"],
  ["short", "단기기억"],
  ["long", "장기기억"],
];

function VocabList() {
  const songs = useStore((s) => s.songs);
  const order = useStore((s) => s.order);
  const cards = useStore((s) => s.cards);
  const newLog = useStore((s) => s.newLog);
  const dailyNew = useStore((s) => s.settings.dailyNew);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("all");
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
      (status === "all" || memoryOf(cards[v.id]) === status) &&
      (songFilter === "all" || v.songId === songFilter) &&
      (!q || v.word.includes(q) || v.reading.includes(q) || v.meaning.toLowerCase().includes(q)),
  );
  const open = openId ? all.find((v) => v.id === openId) : undefined;
  const songsWithVocab = order.filter((id) => songs[id]?.vocab.length);
  const memory = progressOf(all, cards);
  const today = useMemo(
    () => buildQueue(songs, order, cards, now, { newLimit: remainingNew(dailyNew, newLog, now) }).queue.length,
    [songs, order, cards, now, dailyNew, newLog],
  );
  const counts: Record<Status, number> = {
    all: all.length,
    none: all.length - memory.long - memory.short,
    short: memory.short,
    long: memory.long,
  };

  return (
    <div className="space-y-5 pt-5">
      <Headline first="노래에서 모은" second="나의 단어장" />

      {all.length > 0 && (
        <Link href={today ? reviewHref() : "/study"} className="card press flex items-center gap-3 px-4 py-3.5">
          <IconCircle name="cards" className="size-11" />
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-semibold">모은 단어로 학습하기</p>
            <p className="text-[13px] text-ink-3">
              {today ? (
                <>
                  장기기억 단어는 빼고 · 오늘 <span className="num">{today}</span>개
                </>
              ) : (
                "오늘 학습할 단어를 다 했어요"
              )}
            </p>
          </div>
          <Icon name="chevron" className="size-5 shrink-0 text-ink-3" />
        </Link>
      )}

      <div className="grid grid-cols-4 rounded-full bg-muted p-1" role="tablist" aria-label="단어 상태">
        {STATUSES.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={status === key}
            onClick={() => setStatus(key)}
            className="press flex flex-col items-center rounded-full py-1.5 text-[13px] leading-tight font-semibold text-ink-3 aria-selected:bg-surface aria-selected:text-ink aria-selected:shadow-sm"
          >
            {label}
            <span className="num text-[12px] font-medium">{counts[key]}</span>
          </button>
        ))}
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
          <IconCircle name={all.length === 0 ? "book" : "search"} tone="muted" className="size-16" />
          <p className="mt-3 text-[14px] text-ink-3">
            {all.length === 0
              ? "노래를 추가하면 여기에 단어가 모여요."
              : q || songFilter !== "all"
                ? "찾는 단어가 없어요."
                : status === "long"
                  ? "아직 장기기억 단어가 없어요. 완벽을 3번 연달아 고르면 여기로 와요."
                  : status === "short"
                    ? "아직 단기기억 단어가 없어요. 학습에서 이해나 완벽을 고르면 여기로 와요."
                    : status === "none"
                      ? "모든 단어를 한 번 이상 맞혔어요!"
                      : "단어가 없어요."}
          </p>
        </div>
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {items.map((v) => (
            <VocabRow
              key={v.id}
              item={v}
              memory={memoryOf(cards[v.id])}
              sub={songFilter === "all" && songsWithVocab.length > 1 ? songs[v.songId]?.title : undefined}
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

