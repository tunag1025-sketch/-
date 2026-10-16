"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { Icon, IconCircle } from "@/components/Icon";
import { Headline } from "@/components/PageHeader";
import { Sheet } from "@/components/Sheet";
import { VocabDetail } from "@/components/VocabDetail";
import { VocabRow } from "@/components/VocabRow";
import { cardKey, cardOf, uniqueVocab } from "@/lib/cards";
import { kataToHira } from "@/lib/furigana";
import { buildQueue, remainingNew, reviewHref } from "@/lib/review";
import { isDue, type Memory, memoryOf, progressOf } from "@/lib/srs";
import { useStore } from "@/lib/store";
import type { VocabItem } from "@/lib/types";

export function VocabClient() {
  // ?word= 로 열면 그 단어 카드를 펼쳐 둔다
  const word = useSearchParams().get("word") ?? undefined;
  return (
    <HydrationGate>
      <VocabList openWord={word} />
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

function VocabList({ openWord }: { openWord?: string }) {
  const songs = useStore((s) => s.songs);
  const order = useStore((s) => s.order);
  const cards = useStore((s) => s.cards);
  const newLog = useStore((s) => s.newLog);
  const dailyNew = useStore((s) => s.settings.dailyNew);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [songFilter, setSongFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(() =>
    openWord ? (uniqueVocab(useStore.getState().songs, useStore.getState().order).find((v) => v.word === openWord)?.id ?? null) : null,
  );
  const [now] = useState(Date.now);

  // 여러 노래에 나오는 단어는 한 번만 (카드도 하나를 같이 쓴다)
  const all = useMemo(() => uniqueVocab(songs, order), [songs, order]);
  // 단어마다 나오는 노래 수
  const songCount = useMemo(() => {
    const count = new Map<string, number>();
    for (const id of order) {
      if (songs[id]?.status !== "ready") continue;
      for (const v of songs[id].vocab) count.set(cardKey(v), (count.get(cardKey(v)) ?? 0) + 1);
    }
    return count;
  }, [songs, order]);
  const songLabel = (v: VocabItem) => {
    const more = (songCount.get(cardKey(v)) ?? 1) - 1;
    return `${songs[v.songId]?.title ?? ""}${more > 0 ? ` 외 ${more}곡` : ""}`;
  };
  const q = kataToHira(query.trim().toLowerCase());
  const base = songFilter === "all" ? all : (songs[songFilter]?.vocab ?? []);
  const items = base.filter(
    (v) =>
      (status === "all" || memoryOf(cardOf(cards, v)) === status) &&
      (!q || v.word.includes(q) || v.reading.includes(q) || v.meaning.toLowerCase().includes(q)),
  );
  const open = openId ? base.find((v) => v.id === openId) : undefined;
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
      <div className="flex items-end justify-between gap-3">
        <Headline className="text-[30px]" first="노래에서 모은" second="나의 단어장" />
        {all.length > 0 && (
          // 오늘 할 게 있으면 모은 단어로 바로 학습, 없으면 학습 설정으로
          <Link
            href={today ? reviewHref() : "/study"}
            aria-label={today ? `모은 단어로 학습하기, 오늘 ${today}개` : "학습 설정"}
            className={`press mb-1 flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[15px] font-bold ${
              today ? "btn-primary" : "btn-ghost"
            }`}
          >
            <Icon name="cards" className="size-[17px]" />
            학습
            {today > 0 && <span className="num">{today}</span>}
          </Link>
        )}
      </div>

      <div className="seg rounded-[18px]" role="tablist" aria-label="단어 상태">
        {STATUSES.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={status === key}
            onClick={() => setStatus(key)}
            className="seg-item press flex-col gap-0 rounded-[14px] py-1.5 text-[13px] leading-tight"
          >
            {label}
            <span className="num text-[15px]">{counts[key]}</span>
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
          className="font-jp input h-12 rounded-full py-0 pl-11"
        />
      </div>

      {songsWithVocab.length > 1 && (
        <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 [scrollbar-width:none]">
          {[["all", "모든 노래"] as const, ...songsWithVocab.map((id) => [id, songs[id].title] as const)].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSongFilter(id)}
              aria-pressed={songFilter === id}
              className={`chip press h-8 shrink-0 ${id === "all" ? "" : "font-jp"}`}
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
          {items.map((v) => {
            const card = cardOf(cards, v);
            return (
              <VocabRow
                key={v.id}
                item={v}
                memory={memoryOf(card)}
                meta={songFilter === "all" && songsWithVocab.length > 1 ? songLabel(v) : undefined}
                dueToday={!!card && isDue(card, now)}
                onClick={() => setOpenId(v.id)}
              />
            );
          })}
        </ul>
      )}

      <Sheet open={!!open} onClose={() => setOpenId(null)} title={open ? songs[open.songId]?.title : undefined} icon="music">
        {open && <VocabDetail item={open} song={songs[open.songId]} />}
      </Sheet>
    </div>
  );
}

