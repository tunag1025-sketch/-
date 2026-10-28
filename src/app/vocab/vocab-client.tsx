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
import { buildDeck, cardKey, cardOf, kanjiKey, uniqueVocab } from "@/lib/cards";
import { uniqueGrammar } from "@/lib/grammar";
import { useKanjiTable } from "@/lib/kanji";
import { KANJI_NEW_PER_SESSION, kanjiDeck } from "@/lib/kanji-deck";
import { kataToHira } from "@/lib/furigana";
import { buildQueue, KANJI_HREF, reviewHref, todayLimits } from "@/lib/review";
import { isDue, memoryOf, progressOf } from "@/lib/srs";
import { useStore } from "@/lib/store";
import type { VocabItem } from "@/lib/types";
import { GrammarList, KanjiList, SearchBox, SongChips, type Status, StatusTabs } from "./notebook";

type View = "word" | "grammar" | "kanji";
const VIEWS: [View, string][] = [
  ["word", "단어"],
  ["grammar", "문법"],
  ["kanji", "한자"],
];

export function VocabClient() {
  const params = useSearchParams();
  // ?word= 로 열면 그 단어 카드를 펼쳐 두고, ?view=grammar|kanji 면 그 목록으로 연다
  const word = params.get("word") ?? undefined;
  const view = VIEWS.find(([v]) => v === params.get("view"))?.[0] ?? "word";
  return (
    <HydrationGate>
      <VocabBook openWord={word} initialView={view} />
    </HydrationGate>
  );
}

/** 단어장: 단어 · 문법 · 한자를 바꿔 가며 본다. 오른쪽 위 학습 버튼은 지금 보는 것을 학습한다. */
function VocabBook({ openWord, initialView }: { openWord?: string; initialView: View }) {
  const songs = useStore((s) => s.songs);
  const order = useStore((s) => s.order);
  const cards = useStore((s) => s.cards);
  const newLog = useStore((s) => s.newLog);
  const dailyNew = useStore((s) => s.settings.dailyNew);
  const dailyReview = useStore((s) => s.settings.dailyReview);
  const [view, setView] = useState<View>(initialView);
  const [now] = useState(Date.now);
  const kanjiInfo = useKanjiTable();
  const words = useMemo(() => uniqueVocab(songs, order), [songs, order]);
  const grammar = useMemo(() => uniqueGrammar(songs, order).map((g) => g.key), [songs, order]);
  const kanji = useMemo(
    () => (kanjiInfo ? kanjiDeck(songs, order, kanjiInfo).map((k) => kanjiKey(k.char)) : null),
    [kanjiInfo, songs, order],
  );
  // 문형은 단어 학습에 섞여 나오니 단어와 같은 목록으로 학습한다
  const today = useMemo(() => {
    const limits = todayLimits({ settings: { dailyNew, dailyReview }, newLog, cards }, now);
    const words = buildQueue(songs, order, cards, now, limits).queue.length;
    return {
      word: words,
      grammar: words,
      kanji: kanji ? buildDeck(kanji, cards, now, KANJI_NEW_PER_SESSION).queue.length : 0,
    };
  }, [songs, order, cards, now, dailyNew, dailyReview, newLog, kanji]);
  const sizes: Record<View, number | null> = { word: words.length, grammar: grammar.length, kanji: kanji?.length ?? null };
  const href = { word: reviewHref(), grammar: reviewHref(), kanji: KANJI_HREF }[view];
  const n = today[view];

  return (
    <div className="space-y-5 pt-5">
      <div className="flex items-end justify-between gap-3">
        <Headline className="text-[30px]" first="노래에서 모은" second="나의 단어장" />
        {(sizes[view] ?? 0) > 0 && (
          // 오늘 할 게 있으면 바로 학습, 없으면 학습 설정으로
          <Link
            href={n ? href : "/study"}
            aria-label={n ? `${VIEWS.find(([v]) => v === view)![1]} 학습하기, 오늘 ${n}개` : "학습 설정"}
            className={`press mb-1 flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[15px] font-bold ${
              n ? "btn-primary" : "btn-ghost"
            }`}
          >
            <Icon name="cards" className="size-[17px]" />
            학습
            {n > 0 && <span className="num">{n}</span>}
          </Link>
        )}
      </div>

      <div className="seg" role="tablist" aria-label="단어장 보기">
        {VIEWS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={view === key}
            onClick={() => setView(key)}
            className="seg-item press"
          >
            {label}
            {sizes[key] !== null && <span className="num text-[13px] font-medium text-ink-3">{sizes[key]}</span>}
          </button>
        ))}
      </div>

      {view === "word" ? <WordList openWord={openWord} /> : view === "grammar" ? <GrammarList /> : <KanjiList info={kanjiInfo} />}
    </div>
  );
}

function WordList({ openWord }: { openWord?: string }) {
  const songs = useStore((s) => s.songs);
  const order = useStore((s) => s.order);
  const cards = useStore((s) => s.cards);
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
  const counts: Record<Status, number> = {
    all: all.length,
    none: all.length - memory.long - memory.short,
    short: memory.short,
    long: memory.long,
  };

  return (
    <>
      <StatusTabs status={status} onChange={setStatus} counts={counts} />
      <SearchBox id="vocab-search" value={query} onChange={setQuery} placeholder="단어, 읽는 법, 뜻으로 찾기" />
      <SongChips ids={songsWithVocab} songs={songs} value={songFilter} onChange={setSongFilter} />

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
    </>
  );
}

