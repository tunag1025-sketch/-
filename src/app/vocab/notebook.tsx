"use client";

import { useMemo, useState } from "react";
import { Icon, IconCircle } from "@/components/Icon";
import { LyricLineRange, patternRange } from "@/components/LyricLineView";
import { Sheet } from "@/components/Sheet";
import { MemoryMark } from "@/components/VocabRow";
import { grammarKey, kanjiKey } from "@/lib/cards";
import { kataToHira } from "@/lib/furigana";
import { type GrammarItem, uniqueGrammar } from "@/lib/grammar";
import { gradeLabel, type KanjiInfo } from "@/lib/kanji";
import { type KanjiCard, kanjiDeck } from "@/lib/kanji-deck";
import { type Memory, memoryOf } from "@/lib/srs";
import { useStore } from "@/lib/store";
import type { Song } from "@/lib/types";
import { useLineExplanation } from "@/lib/use-line-explanation";

export type Status = "all" | Memory;
const STATUSES: [Status, string][] = [
  ["all", "전체"],
  ["none", "학습 전"],
  ["short", "단기기억"],
  ["long", "장기기억"],
];

/** 기억 상태 탭: 전체 · 학습 전 · 단기기억 · 장기기억 (숫자 포함) */
export function StatusTabs({
  status,
  onChange,
  counts,
}: {
  status: Status;
  onChange: (s: Status) => void;
  counts: Record<Status, number>;
}) {
  return (
    <div className="seg rounded-[18px]" role="tablist" aria-label="기억 상태">
      {STATUSES.map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={status === key}
          onClick={() => onChange(key)}
          className="seg-item press flex-col gap-0 rounded-[14px] py-1.5 text-[13px] leading-tight"
        >
          {label}
          <span className="num text-[15px]">{counts[key]}</span>
        </button>
      ))}
    </div>
  );
}

/** 상태별 개수 */
export function countByMemory(keys: string[], memory: (key: string) => Memory): Record<Status, number> {
  const counts: Record<Status, number> = { all: keys.length, none: 0, short: 0, long: 0 };
  for (const k of keys) counts[memory(k)]++;
  return counts;
}

export function SearchBox({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Icon name="search" className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-ink-3" />
      <label htmlFor={id} className="sr-only">
        찾기
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="font-jp input h-12 rounded-full py-0 pl-11"
      />
    </div>
  );
}

export function SongChips({
  ids,
  songs,
  value,
  onChange,
}: {
  ids: string[];
  songs: Record<string, Song>;
  value: string;
  onChange: (id: string) => void;
}) {
  if (ids.length < 2) return null;
  return (
    <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 [scrollbar-width:none]">
      {[["all", "모든 노래"] as const, ...ids.map((id) => [id, songs[id].title] as const)].map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-pressed={value === id}
          className={`chip press h-8 shrink-0 ${id === "all" ? "" : "font-jp"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Empty({ icon, text }: { icon: "book" | "search"; text: string }) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <IconCircle name={icon} tone="muted" className="size-16" />
      <p className="mt-3 text-[14px] text-ink-3">{text}</p>
    </div>
  );
}

function LearnedToggle({ cardKey: key, known }: { cardKey: string; known: string }) {
  const learned = useStore((s) => s.cards[key]?.learned ?? false);
  const setLearned = useStore((s) => s.setLearned);
  return (
    <button
      type="button"
      onClick={() => setLearned(key, !learned, { countNew: false })}
      aria-pressed={learned}
      className="press btn-ghost flex h-[52px] w-full items-center justify-center gap-1.5 px-4 text-[15px] font-semibold aria-pressed:border-blue aria-pressed:bg-blue-soft"
    >
      {learned ? (
        <>
          <Icon name="check" className="size-4" /> 장기기억 · 다시 학습하기
        </>
      ) : (
        `${known} · 장기기억으로 옮기기`
      )}
    </button>
  );
}

const PILL = "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold";

function MemoryPill({ memory, fresh }: { memory: Memory; fresh: string }) {
  if (memory === "long")
    return (
      <span className={`${PILL} bg-btn text-white`}>
        <Icon name="check" className="size-3" strokeWidth={2.5} /> 장기기억
      </span>
    );
  if (memory === "short") return <span className={`${PILL} bg-[color:var(--short-term)]/30 text-blue`}>단기기억</span>;
  return <span className={`${PILL} bg-muted text-ink-2`}>{fresh}</span>;
}

// ───────── 문법장 ─────────

/** 모은 문형 목록: 문형 · 뜻 · 나온 노래 · 기억 상태. 누르면 설명과 가사 속 쓰임. */
export function GrammarList() {
  const songs = useStore((s) => s.songs);
  const order = useStore((s) => s.order);
  const cards = useStore((s) => s.cards);
  const [status, setStatus] = useState<Status>("all");
  const [query, setQuery] = useState("");
  const [songFilter, setSongFilter] = useState("all");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const all = useMemo(() => uniqueGrammar(songs, order), [songs, order]);
  // 문형마다 나온 노래들
  const songsOf = useMemo(() => {
    const map = new Map<string, Song[]>();
    for (const id of order) {
      const song = songs[id];
      if (song?.status !== "ready") continue;
      for (const g of song.grammar) {
        const key = grammarKey(g.pattern);
        const list = map.get(key) ?? [];
        if (!list.includes(song)) list.push(song);
        map.set(key, list);
      }
    }
    return map;
  }, [songs, order]);
  const memory = (key: string) => memoryOf(cards[key]);
  const counts = countByMemory(
    all.map((g) => g.key),
    memory,
  );
  const songIds = order.filter((id) => songs[id]?.status === "ready" && songs[id].grammar.length > 0);
  const base = songFilter === "all" ? all : uniqueGrammar(songs, order, songFilter);
  const q = kataToHira(query.trim().toLowerCase());
  const items = base.filter(
    (g) =>
      (status === "all" || memory(g.key) === status) &&
      (!q || kataToHira(g.pattern).includes(q) || g.meaning.toLowerCase().includes(q)),
  );
  const open = openKey ? all.find((g) => g.key === openKey) : undefined;

  return (
    <>
      <StatusTabs status={status} onChange={setStatus} counts={counts} />
      <SearchBox id="grammar-search" value={query} onChange={setQuery} placeholder="문형이나 뜻으로 찾기" />
      <SongChips ids={songIds} songs={songs} value={songFilter} onChange={setSongFilter} />
      {items.length === 0 ? (
        <Empty
          icon={all.length === 0 ? "book" : "search"}
          text={
            all.length === 0
              ? "노래를 추가하면 가사 속 문법이 여기에 모여요."
              : q || songFilter !== "all"
                ? "찾는 문법이 없어요."
                : "이 상태의 문법이 없어요."
          }
        />
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {items.map((g) => {
            const list = songsOf.get(g.key) ?? [g.song];
            const more = list.length - 1;
            return (
              <li key={g.key}>
                <button
                  type="button"
                  onClick={() => setOpenKey(g.key)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-jp text-[18px] font-bold text-blue">{g.pattern}</span>
                      <span className="text-[15px] font-medium">{g.meaning}</span>
                    </p>
                    <p className="font-jp mt-0.5 truncate text-[12px] text-ink-3">
                      {list[0].title}
                      {more > 0 && <span className="font-sans"> 외 {more}곡</span>}
                    </p>
                  </div>
                  <MemoryMark memory={memory(g.key)} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet open={!!open} onClose={() => setOpenKey(null)} title="문법" icon="book">
        {open && <GrammarDetail item={open} songs={songsOf.get(open.key) ?? [open.song]} />}
      </Sheet>
    </>
  );
}

/** 가사 한 줄 (문형 밑줄) + 그 줄의 해석 */
function GrammarLine({ song, item }: { song: Song; item: GrammarItem }) {
  const furigana = useStore((s) => s.settings.furigana);
  const point = song.grammar.find((g) => grammarKey(g.pattern) === item.key) ?? item;
  const line = song.lines[point.line];
  const { explanation } = useLineExplanation(song, line ? point.line : undefined);
  if (!line) return null;
  return (
    <li className="iris rounded-[20px] px-4 pt-2 pb-3">
      <p className="font-jp flex items-center gap-1 text-[12px] font-medium text-ink-3">
        <Icon name="music" className="size-3" />
        {song.title}
      </p>
      <p className="font-jp lyric text-[18px] leading-[2.3]">
        <LyricLineRange line={line} range={patternRange(point.pattern, line.text)} furigana={furigana} />
      </p>
      {explanation && <p className="mt-0.5 text-[14px] leading-normal text-ink-2">{explanation.translation}</p>}
    </li>
  );
}

function GrammarDetail({ item, songs }: { item: GrammarItem; songs: Song[] }) {
  const memory = useStore((s) => memoryOf(s.cards[item.key]));
  return (
    <div className="space-y-7">
      <div>
        <p className="font-jp text-[34px] leading-tight font-bold text-blue">{item.pattern}</p>
        <p className="mt-2 text-[22px] leading-[1.35] font-bold">{item.meaning}</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <span className={`${PILL} bg-muted text-ink-2`}>문법</span>
          <MemoryPill memory={memory} fresh="학습 전" />
        </div>
        {item.explanation && <p className="mt-3 text-[15px] leading-[1.65] text-ink-2">{item.explanation}</p>}
      </div>
      <section>
        <h3 className="mb-2.5 text-[13px] font-semibold text-ink-3">노래 속에서</h3>
        <ul className="space-y-2">
          {songs.slice(0, 4).map((s) => (
            <GrammarLine key={s.id} song={s} item={item} />
          ))}
        </ul>
      </section>
      <LearnedToggle cardKey={item.key} known="이미 아는 문법이에요" />
    </div>
  );
}

// ───────── 한자 ─────────

/** 모은 단어 속 한자: 글자 칸 모음. 누르면 훈음·읽기와 그 한자가 든 내 단어. */
export function KanjiList({ info }: { info: ((char: string) => KanjiInfo) | null }) {
  const songs = useStore((s) => s.songs);
  const order = useStore((s) => s.order);
  const cards = useStore((s) => s.cards);
  const [status, setStatus] = useState<Status>("all");
  const [query, setQuery] = useState("");
  const [openChar, setOpenChar] = useState<string | null>(null);
  const all = useMemo(() => (info ? kanjiDeck(songs, order, info) : []), [songs, order, info]);
  const memory = (char: string) => memoryOf(cards[kanjiKey(char)]);
  const counts = countByMemory(
    all.map((k) => k.char),
    memory,
  );
  const q = kataToHira(query.trim().toLowerCase());
  const items = all.filter(
    (k) =>
      (status === "all" || memory(k.char) === status) &&
      (!q ||
        k.char === q ||
        k.hun.includes(q) ||
        [...k.on, ...k.kun].some((r) => kataToHira(r.replace(/[()]/g, "")).includes(q))),
  );
  const open = openChar ? all.find((k) => k.char === openChar) : undefined;

  if (!info) return <div className="h-40 animate-pulse rounded-3xl bg-muted" />;

  return (
    <>
      <StatusTabs status={status} onChange={setStatus} counts={counts} />
      <SearchBox id="kanji-search" value={query} onChange={setQuery} placeholder="한자, 훈음, 읽는 법으로 찾기" />
      {items.length === 0 ? (
        <Empty
          icon={all.length === 0 ? "book" : "search"}
          text={
            all.length === 0 ? "한자가 들어간 단어를 모으면 여기에 한자가 모여요." : q ? "찾는 한자가 없어요." : "이 상태의 한자가 없어요."
          }
        />
      ) : (
        <ul className="grid grid-cols-4 gap-2">
          {items.map((k) => {
            const m = memory(k.char);
            return (
              <li key={k.char}>
                <button
                  type="button"
                  onClick={() => setOpenChar(k.char)}
                  className="press relative flex w-full flex-col items-center rounded-[18px] border border-line bg-surface px-1 pt-3 pb-2.5"
                  aria-label={`${k.char} ${k.hun}`}
                >
                  <span
                    className={`absolute top-2 right-2 size-2 rounded-full ${
                      m === "long" ? "bg-btn" : m === "short" ? "border-2 border-[color:var(--short-term)]" : ""
                    }`}
                    aria-hidden
                  />
                  <span className="font-jp text-[30px] leading-none font-bold">{k.char}</span>
                  <span className="mt-1.5 w-full truncate text-center text-[12px] font-medium text-ink-2">{k.hun}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet open={!!open} onClose={() => setOpenChar(null)} title="한자" icon="book">
        {open && <KanjiDetail kanji={open} />}
      </Sheet>
    </>
  );
}

function KanjiDetail({ kanji }: { kanji: KanjiCard }) {
  const key = kanjiKey(kanji.char);
  const memory = useStore((s) => memoryOf(s.cards[key]));
  return (
    <div className="space-y-7">
      <div className="flex items-center gap-4">
        <span className="font-jp grid size-24 shrink-0 place-items-center rounded-[26px] bg-muted text-[60px] leading-none font-bold">
          {kanji.char}
        </span>
        <div className="min-w-0">
          <p className="text-[24px] font-bold">{kanji.hun}</p>
          <p className="mt-1 text-[13px] text-ink-3">
            {kanji.strokes > 0 && (
              <>
                <span className="num">{kanji.strokes}</span>획 ·{" "}
              </>
            )}
            {gradeLabel(kanji.grade)}
          </p>
          <div className="mt-2">
            <MemoryPill memory={memory} fresh="학습 전" />
          </div>
        </div>
      </div>
      {(kanji.on.length > 0 || kanji.kun.length > 0) && (
        <dl className="grid grid-cols-[40px_1fr] gap-y-1 rounded-[20px] border border-line px-4 py-3 text-[15px]">
          {kanji.on.length > 0 && (
            <>
              <dt className="font-semibold text-ink-3">음독</dt>
              <dd className="font-jp text-ink-2">{kanji.on.join("・")}</dd>
            </>
          )}
          {kanji.kun.length > 0 && (
            <>
              <dt className="font-semibold text-ink-3">훈독</dt>
              <dd className="font-jp text-ink-2">{kanji.kun.join("・")}</dd>
            </>
          )}
        </dl>
      )}
      <section>
        <h3 className="mb-2.5 text-[13px] font-semibold text-ink-3">내 단어장에서 이 한자가 들어간 단어</h3>
        <ul className="divide-y divide-line rounded-[20px] border border-line px-4">
          {kanji.words.map((v) => (
            <li key={v.id} className="flex items-baseline gap-3 py-2.5">
              <span className="font-jp shrink-0 text-[18px] font-bold">{v.word}</span>
              <span className="font-jp shrink-0 text-[13px] text-ink-3">{v.reading}</span>
              <span className="min-w-0 flex-1 truncate text-right text-[14px] text-ink-2">{v.meaning}</span>
            </li>
          ))}
        </ul>
      </section>
      <LearnedToggle cardKey={key} known="이미 아는 한자예요" />
    </div>
  );
}
