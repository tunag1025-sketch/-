"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { Icon } from "@/components/Icon";
import { Headline } from "@/components/PageHeader";
import { QueueSplit } from "@/components/QueueSplit";
import { SongCover } from "@/components/SongCover";
import {
  buildQueue,
  clampDailyNew,
  DAILY_NEW_MAX,
  DAILY_NEW_MIN,
  DAILY_NEW_OPTIONS,
  EXTRA_NEW,
  grammarHref,
  KANJI_HREF,
  remainingNew,
  reviewHref,
  WEAK_HREF,
  WEAK_LAPSES,
  WEAK_LIMIT,
  weakWords,
} from "@/lib/review";
import { buildDeck, kanjiKey } from "@/lib/cards";
import { GRAMMAR_NEW_PER_SESSION, uniqueGrammar } from "@/lib/grammar";
import { useKanjiTable } from "@/lib/kanji";
import { KANJI_NEW_PER_SESSION, kanjiDeck } from "@/lib/kanji-deck";
import { QUIZ_TYPES } from "@/lib/quiz";
import { dayKey } from "@/lib/stats";
import { useStore } from "@/lib/store";

export function StudyClient() {
  return (
    <HydrationGate>
      <Study />
    </HydrationGate>
  );
}

/** 학습 범위(모은 단어 전체 / 노래 하나)와 하루 학습량을 고르고 시작한다. */
function Study() {
  const songs = useStore((s) => s.songs);
  const order = useStore((s) => s.order);
  const cards = useStore((s) => s.cards);
  const newLog = useStore((s) => s.newLog);
  const dailyNew = useStore((s) => s.settings.dailyNew);
  const quizTypes = useStore((s) => s.settings.quizTypes);
  const autoSpeak = useStore((s) => s.settings.autoSpeak);
  const setSettings = useStore((s) => s.setSettings);
  const [now] = useState(Date.now);
  const [scope, setScope] = useState<string>("all");

  const newToday = newLog[dayKey(now)] ?? 0;
  const newLimit = remainingNew(dailyNew, newLog, now);
  const plan = useMemo(() => {
    const ready = order.filter((id) => songs[id]?.status === "ready" && songs[id].vocab.length > 0);
    const count = (id?: string) => buildQueue(songs, order, cards, now, { songId: id, newLimit });
    return { ready, all: count(), bySong: Object.fromEntries(ready.map((id) => [id, count(id)])) };
  }, [songs, order, cards, now, newLimit]);
  const { ready } = plan;
  // 자주 틀린 단어: 기한과 상관없이 다시 본다
  const weak = useMemo(() => weakWords(songs, order, cards).slice(0, WEAK_LIMIT), [songs, order, cards]);
  const weakPlan = { queue: weak, dueCount: weak.length, newCount: 0, freshTotal: 0 };
  const isWeak = scope === "weak" && weak.length > 0;
  const songId = ready.includes(scope) ? scope : undefined;
  const current = isWeak ? weakPlan : songId ? plan.bySong[songId] : plan.all;
  const total = current.queue.length;
  const startHref = isWeak ? WEAK_HREF : reviewHref(songId);
  // 문법·한자 카드: 오늘 볼 수
  const grammar = useMemo(() => {
    const keys = uniqueGrammar(songs, order).map((g) => g.key);
    return { total: keys.length, today: buildDeck(keys, cards, now, GRAMMAR_NEW_PER_SESSION).queue.length };
  }, [songs, order, cards, now]);
  const kanjiInfo = useKanjiTable();
  const kanji = useMemo(() => {
    if (!kanjiInfo) return null;
    const keys = kanjiDeck(songs, order, kanjiInfo).map((k) => kanjiKey(k.char));
    return { total: keys.length, today: buildDeck(keys, cards, now, KANJI_NEW_PER_SESSION).queue.length };
  }, [kanjiInfo, songs, order, cards, now]);
  const extra = Math.max(0, newToday - dailyNew) + EXTRA_NEW;

  return (
    <div className="space-y-8 pt-5">
      <Headline className="text-[30px]" first="어떤 단어로" second="학습할까요?" />

      <section className="card p-5" aria-live="polite">
        <p className={`truncate text-[13px] font-semibold text-ink-2 ${songId ? "font-jp" : ""}`}>
          {isWeak ? "자주 틀린 단어" : songId ? songs[songId].title : "모은 단어 전체"}
        </p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <p className="flex items-baseline gap-1">
            <span className="num text-[52px] leading-none font-medium tracking-[-0.04em]">{total}</span>
            <span className="text-[17px] font-bold text-ink-2">개</span>
          </p>
          <QueueSplit due={current.dueCount} fresh={current.newCount} />
        </div>
        {total > 0 ? (
          <Link
            href={startHref}
            className="btn-primary press mt-5 flex h-[54px] items-center justify-center text-[16px] font-bold"
          >
            학습 시작
          </Link>
        ) : current.freshTotal > 0 ? (
          <>
            <p className="mt-3 text-[14px] text-ink-2">오늘 배울 새 단어를 다 배웠어요.</p>
            <Link
              href={reviewHref(songId, extra)}
              className="btn-primary press mt-4 flex h-[54px] items-center justify-center text-[16px] font-bold"
            >
              새 단어 {Math.min(EXTRA_NEW, current.freshTotal)}개 더 학습하기
            </Link>
          </>
        ) : (
          <p className="mt-3 text-[14px] text-ink-2">
            {ready.length ? "지금 학습할 단어가 없어요. 다시 볼 때가 되면 생겨요." : "노래를 추가하면 단어가 모여요."}
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-[20px] font-bold">범위</h2>
        <ul className="card divide-y divide-line overflow-hidden" role="radiogroup" aria-label="학습 범위">
          <ScopeRow
            selected={!songId && !isWeak}
            onSelect={() => setScope("all")}
            icon={
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-surface text-blue ring-1 ring-line">
                <Icon name="cards" className="size-[22px]" />
              </span>
            }
            title="모은 단어 전체"
            sub={`노래 ${ready.length}곡 · 장기기억 단어는 빼고`}
            count={plan.all.queue.length}
          />
          {weak.length > 0 && (
            <ScopeRow
              selected={isWeak}
              onSelect={() => setScope("weak")}
              icon={
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-danger-soft text-danger">
                  <Icon name="refresh" className="size-[22px]" />
                </span>
              }
              title="자주 틀린 단어"
              sub={`'다시'를 ${WEAK_LAPSES}번 이상 고른 단어`}
              count={weak.length}
            />
          )}
          {ready.map((id) => (
            <ScopeRow
              key={id}
              selected={songId === id}
              onSelect={() => setScope(id)}
              icon={<SongCover song={songs[id]} className="size-12 rounded-2xl" />}
              title={songs[id].title}
              sub={songs[id].artist || "아티스트 미상"}
              count={plan.bySong[id].queue.length}
              jp
            />
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-[20px] font-bold">문법 · 한자</h2>
        <ul className="card divide-y divide-line overflow-hidden">
          <DeckRow
            href={grammarHref()}
            glyph="文"
            title="문법 복습"
            sub={grammar.total ? `노래 속 문형 ${grammar.total}개` : "노래를 추가하면 문형이 모여요"}
            today={grammar.today}
          />
          <DeckRow
            href={KANJI_HREF}
            glyph="字"
            title="한자 카드"
            sub={kanji ? (kanji.total ? `모은 한자 ${kanji.total}자` : "한자가 든 단어를 모으면 생겨요") : "한자 표를 불러오는 중…"}
            today={kanji?.today ?? null}
          />
        </ul>
      </section>

      <section>
        <h2 className="text-[20px] font-bold">하루 새 단어</h2>
        <p className="mt-1 mb-3 text-[14px] leading-[1.55] text-ink-3">다시 볼 단어는 이와 상관없이 모두 나와요.</p>
        <DailyAmount value={dailyNew} onChange={(n) => setSettings({ dailyNew: n })} />
        <p className="mx-1 mt-2.5 text-[13px] text-ink-3">
          오늘 <b className="num font-semibold text-ink-2">{newToday}</b>개 배웠어요 ·{" "}
          <b className="num font-semibold text-ink-2">{newLimit}</b>개 남았어요
        </p>
      </section>

      <section>
        <h2 className="text-[20px] font-bold">문제 유형</h2>
        <p className="mt-1 mb-3 text-[14px] leading-[1.55] text-ink-3">고른 유형이 섞여서 나와요. 처음 보는 단어는 뜻 떠올리기로.</p>
        <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
          {QUIZ_TYPES.map(({ type, label, hint }) => {
            const on = quizTypes.includes(type);
            const last = on && quizTypes.length === 1;
            return (
              <li key={type}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  aria-disabled={last}
                  onClick={() => {
                    if (last) return;
                    setSettings({ quizTypes: on ? quizTypes.filter((t) => t !== type) : [...quizTypes, type] });
                  }}
                  className="flex w-full items-center gap-3 px-4 py-[13px] text-left transition-colors active:bg-muted"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold">{label}</span>
                    <span className="block text-[13px] text-ink-3">{hint}</span>
                  </span>
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-lg ${
                      on ? "bg-btn text-white" : "border-2 border-line"
                    }`}
                    aria-hidden
                  >
                    {on && <Icon name="check" className="size-3.5" strokeWidth={2.5} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <button
        type="button"
        role="switch"
        aria-checked={autoSpeak}
        onClick={() => setSettings({ autoSpeak: !autoSpeak })}
        className="press flex w-full items-center gap-3 rounded-3xl border border-line bg-surface px-4 py-3.5 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">뜻 볼 때 발음 듣기</span>
          <span className="block text-[13px] text-ink-3">뜻을 보거나 답을 고르면 읽어 줘요</span>
        </span>
        <span
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${autoSpeak ? "bg-blue" : "bg-ink-3/45"}`}
          aria-hidden
        >
          <span
            className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow-sm transition-transform ${
              autoSpeak ? "translate-x-5" : ""
            }`}
          />
        </span>
      </button>
    </div>
  );
}

function ScopeRow({
  selected,
  onSelect,
  icon,
  title,
  sub,
  count,
  jp = false,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  sub: string;
  count: number;
  jp?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        className={`flex w-full items-center gap-3.5 px-4 py-3 text-left transition-colors ${
          selected ? "bg-blue-soft" : "active:bg-muted"
        }`}
      >
        {icon}
        <div className="min-w-0 flex-1">
          <div className={`truncate text-[16px] font-bold ${jp ? "font-jp" : ""}`}>{title}</div>
          <div className="truncate text-[13px] text-ink-3">{sub}</div>
        </div>
        <span className={`shrink-0 text-[13px] font-semibold ${selected && count ? "text-blue" : "text-ink-3"}`}>
          오늘 <span className="num">{count}</span>
        </span>
        <span
          className={`grid size-[22px] shrink-0 place-items-center rounded-full ${
            selected ? "bg-btn text-white" : "border-2 border-line"
          }`}
          aria-hidden
        >
          {selected && <Icon name="check" className="size-3" strokeWidth={3} />}
        </span>
      </button>
    </li>
  );
}

/** 문법·한자 카드로 가는 줄 */
function DeckRow({
  href,
  glyph,
  title,
  sub,
  today,
}: {
  href: string;
  glyph: string;
  title: string;
  sub: string;
  today: number | null;
}) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3.5 px-4 py-3 transition-colors active:bg-muted">
        <span className="font-jp grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-soft text-[22px] font-bold text-blue">
          {glyph}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-bold">{title}</div>
          <div className="truncate text-[13px] text-ink-3">{sub}</div>
        </div>
        {today !== null && (
          <span className={`shrink-0 text-[13px] font-semibold ${today ? "text-blue" : "text-ink-3"}`}>
            오늘 <span className="num">{today}</span>
          </span>
        )}
        <Icon name="chevron" className="size-5 shrink-0 text-ink-3" />
      </Link>
    </li>
  );
}

/** 10 · 20 · 30 · 50 중에 고르거나 직접 넣는다. */
function DailyAmount({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const isPreset = (DAILY_NEW_OPTIONS as readonly number[]).includes(value);
  const [custom, setCustom] = useState(!isPreset);
  const [draft, setDraft] = useState(String(value));

  const commit = () => {
    const n = clampDailyNew(draft);
    if (n === null) return setDraft(String(value));
    setDraft(String(n));
    onChange(n);
  };

  return (
    <>
      <div className="seg grid-cols-5" role="radiogroup" aria-label="하루 새 단어 수">
        {DAILY_NEW_OPTIONS.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={!custom && value === n}
            aria-label={`${n}개`}
            onClick={() => {
              setCustom(false);
              setDraft(String(n));
              onChange(n);
            }}
            className="seg-item press num min-h-[38px] text-[15px] aria-checked:text-blue"
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          role="radio"
          aria-checked={custom}
          onClick={() => setCustom(true)}
          className="seg-item press min-h-[38px] aria-checked:text-blue"
        >
          직접
        </button>
      </div>
      {custom && (
        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            commit();
          }}
        >
          <label htmlFor="daily-new" className="text-[15px] font-medium text-ink-2">
            하루
          </label>
          <input
            id="daily-new"
            type="number"
            inputMode="numeric"
            min={DAILY_NEW_MIN}
            max={DAILY_NEW_MAX}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            className="num input w-24 py-2.5 text-center"
          />
          <span className="text-[15px] font-medium text-ink-2">개</span>
          <button type="submit" className="btn-ghost press ml-auto px-5 py-2.5 text-[14px] font-semibold">
            저장
          </button>
        </form>
      )}
    </>
  );
}
