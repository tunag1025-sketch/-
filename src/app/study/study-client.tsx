"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { Icon } from "@/components/Icon";
import { Headline } from "@/components/PageHeader";
import { SongCover } from "@/components/SongCover";
import {
  buildQueue,
  clampDailyNew,
  DAILY_NEW_MAX,
  DAILY_NEW_MIN,
  DAILY_NEW_OPTIONS,
  EXTRA_NEW,
  remainingNew,
  reviewHref,
} from "@/lib/review";
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
  const songId = ready.includes(scope) ? scope : undefined;
  const current = songId ? plan.bySong[songId] : plan.all;
  const total = current.queue.length;
  const extra = Math.max(0, newToday - dailyNew) + EXTRA_NEW;

  return (
    <div className="space-y-7 pt-5">
      <Headline className="text-[30px]" first="어떤 단어로" second="학습할까요?" />

      <section className="iris-card p-5" aria-live="polite">
        <p className="font-jp truncate text-[13px] font-medium text-ink-3">
          {songId ? songs[songId].title : "모은 단어 전체"}
        </p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <p className="flex items-baseline gap-1">
            <span className="num text-[48px] leading-none font-medium">{total}</span>
            <span className="text-[16px] font-semibold text-ink-2">개</span>
          </p>
          <dl className="space-y-1 text-right text-[13px]">
            <div className="flex justify-end gap-2">
              <dt className="text-ink-3">다시 볼 단어</dt>
              <dd className="num w-6 font-semibold">{current.dueCount}</dd>
            </div>
            <div className="flex justify-end gap-2">
              <dt className="text-ink-3">새 단어</dt>
              <dd className="num w-6 font-semibold">{current.newCount}</dd>
            </div>
          </dl>
        </div>
        {total > 0 ? (
          <Link
            href={reviewHref(songId)}
            className="btn-primary press mt-5 flex items-center justify-center py-3.5 text-[15px] font-semibold"
          >
            학습 시작
          </Link>
        ) : current.freshTotal > 0 ? (
          <>
            <p className="mt-3 text-[14px] text-ink-2">오늘 배울 새 단어를 다 배웠어요.</p>
            <Link
              href={reviewHref(songId, extra)}
              className="btn-primary press mt-4 flex items-center justify-center py-3.5 text-[15px] font-semibold"
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
        <h2 className="mb-3 text-[19px] font-semibold">범위</h2>
        <ul className="space-y-2" role="radiogroup" aria-label="학습 범위">
          <ScopeRow
            selected={!songId}
            onSelect={() => setScope("all")}
            icon={
              <span className="grid size-[52px] shrink-0 place-items-center rounded-[18px] bg-blue-soft text-blue">
                <Icon name="cards" className="size-6" />
              </span>
            }
            title="모은 단어 전체"
            sub={`노래 ${ready.length}곡 · 장기기억 단어는 빼고`}
            count={plan.all.queue.length}
          />
          {ready.map((id) => (
            <ScopeRow
              key={id}
              selected={songId === id}
              onSelect={() => setScope(id)}
              icon={<SongCover song={songs[id]} className="size-[52px] rounded-[18px] text-[22px]" />}
              title={songs[id].title}
              sub={songs[id].artist || "아티스트 미상"}
              count={plan.bySong[id].queue.length}
              jp
            />
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-[19px] font-semibold">하루 학습량</h2>
        <p className="mt-1 mb-3 text-[14px] text-ink-3">하루에 새로 배울 단어 수예요. 다시 볼 단어는 이와 상관없이 모두 나와요.</p>
        <DailyAmount value={dailyNew} onChange={(n) => setSettings({ dailyNew: n })} />
        <p className="mt-3 text-[13px] text-ink-3">
          오늘 새로 배운 단어 <span className="num font-semibold text-ink-2">{newToday}</span>개 · 남은 몫{" "}
          <span className="num font-semibold text-ink-2">{newLimit}</span>개
        </p>
      </section>

      <section>
        <button
          type="button"
          role="switch"
          aria-checked={autoSpeak}
          onClick={() => setSettings({ autoSpeak: !autoSpeak })}
          className="press flex w-full items-center gap-3 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[19px] font-semibold">뜻 볼 때 발음 듣기</span>
            <span className="mt-1 block text-[14px] text-ink-3">뜻을 보거나 답을 고르면 단어를 읽어 줘요.</span>
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
      </section>

      <section>
        <h2 className="text-[19px] font-semibold">문제 유형</h2>
        <p className="mt-1 mb-3 text-[14px] text-ink-3">고른 유형이 섞여서 나와요. 처음 보는 단어는 뜻 떠올리기로 나와요.</p>
        <ul className="space-y-2">
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
                  className={`press flex w-full items-center gap-3 rounded-[20px] border bg-surface px-4 py-3 text-left ${
                    on ? "border-blue" : "border-line"
                  }`}
                >
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-full border-2 ${
                      on ? "border-blue bg-blue text-white" : "border-line"
                    }`}
                  >
                    {on && <Icon name="check" className="size-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold">{label}</span>
                    <span className="block text-[13px] text-ink-3">{hint}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
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
        className={`press flex w-full items-center gap-3.5 rounded-[22px] border bg-surface p-3 text-left shadow-[var(--shadow)] ${
          selected ? "border-blue ring-2 ring-blue-soft" : "border-line"
        }`}
      >
        {icon}
        <div className="min-w-0 flex-1">
          <div className={`truncate text-[16px] font-bold ${jp ? "font-jp" : ""}`}>{title}</div>
          <div className="truncate text-[13px] text-ink-3">{sub}</div>
        </div>
        <span className={`shrink-0 text-[13px] font-semibold ${count ? "text-blue" : "text-ink-3"}`}>
          오늘 <span className="num">{count}</span>개
        </span>
      </button>
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
      <div className="grid grid-cols-5 gap-2">
        {DAILY_NEW_OPTIONS.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={!custom && value === n}
            onClick={() => {
              setCustom(false);
              setDraft(String(n));
              onChange(n);
            }}
            className="chip press justify-center gap-0 px-0"
          >
            <span className="num">{n}</span>개
          </button>
        ))}
        <button
          type="button"
          aria-pressed={custom}
          onClick={() => setCustom(true)}
          className="chip press justify-center px-0"
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
