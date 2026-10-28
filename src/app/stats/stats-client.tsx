"use client";

import { useMemo, useState } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { Icon } from "@/components/Icon";
import { MemoryBar } from "@/components/MemoryBar";
import { TopBar } from "@/components/PageHeader";
import { cardKey, isWordKey, kanjiKey, uniqueVocab } from "@/lib/cards";
import { uniqueGrammar } from "@/lib/grammar";
import { useKanjiTable } from "@/lib/kanji";
import { kanjiDeck } from "@/lib/kanji-deck";
import { memoryOf } from "@/lib/srs";
import {
  accuracy,
  dayKey,
  longestStreak,
  monthWeeks,
  reviewForecast,
  streak,
  studyDays,
} from "@/lib/stats";
import { useStore } from "@/lib/store";
import type { CardState } from "@/lib/types";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function StatsClient() {
  return (
    <HydrationGate>
      <Stats />
    </HydrationGate>
  );
}

/** 학습 통계: 요약 숫자 · 복습 예보 · 학습 달력 · 기억 상태 */
function Stats() {
  const cards = useStore((s) => s.cards);
  const reviewLog = useStore((s) => s.reviewLog);
  const [now] = useState(Date.now);
  const right = useMemo(() => accuracy(cards), [cards]);
  const total = Object.values(reviewLog).reduce((n, c) => n + c, 0);
  const long = Object.values(cards).filter((c) => c.learned).length;

  return (
    <div className="space-y-6 pb-4">
      <TopBar backHref="/" title="학습 통계" />

      <section className="grid grid-cols-2 gap-2.5" aria-label="요약">
        <Tile label="연속 학습" value={streak(reviewLog, now)} unit="일" sub={`최장 ${longestStreak(reviewLog)}일`} />
        <Tile
          label="정답률"
          value={right.rate}
          unit="%"
          sub={right.rate === null ? "아직 답한 기록이 없어요" : `이해·완벽 ${right.right}번 · 다시 ${right.wrong}번`}
        />
        <Tile label="공부한 날" value={studyDays(reviewLog)} unit="일" sub={`지금까지 ${total}번 답했어요`} />
        <Tile label="장기기억" value={long} unit="개" sub="단어 · 문형 · 한자 모두" />
      </section>

      <Forecast cards={cards} now={now} />
      <Calendar now={now} />
      <MemorySection />
    </div>
  );
}

function Tile({ label, value, unit, sub }: { label: string; value: number | null; unit: string; sub: string }) {
  return (
    <div className="card p-4">
      <p className="text-[13px] font-semibold text-ink-2">{label}</p>
      <p className="mt-1.5 flex items-baseline gap-0.5">
        {/* 큰 숫자는 고정폭이 아닌 숫자 모양으로 */}
        <span className="text-[30px] leading-none font-semibold tracking-[-0.03em] [font-family:var(--font-display)]">
          {value ?? "–"}
        </span>
        {value !== null && <span className="text-[15px] font-bold text-ink-2">{unit}</span>}
      </p>
      <p className="mt-1.5 text-[12px] leading-snug break-keep text-ink-3">{sub}</p>
    </div>
  );
}

const dayLabel = (ts: number, i: number) => (i === 0 ? "오늘" : i === 1 ? "내일" : WEEKDAYS[new Date(ts).getDay()]);
const dateText = (ts: number) => {
  const d = new Date(ts);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
};

/** 앞으로 7일 동안 날마다 다시 볼 단어·문형 수 (세로 막대). 막대를 누르면 그날을 짚어 준다. */
function Forecast({ cards, now }: { cards: Record<string, CardState>; now: number }) {
  // 한자 카드는 따로 학습하니 단어 학습에 나오는 단어·문형만 센다.
  const days = useMemo(
    () => reviewForecast(cards, now, 7, (k) => isWordKey(k) || k.startsWith("문법:")),
    [cards, now],
  );
  const [picked, setPicked] = useState(0);
  const max = Math.max(1, ...days.map((d) => d.count));
  const sum = days.reduce((n, d) => n + d.count, 0);
  const sel = days[picked];

  return (
    <section className="card p-5">
      <h2 className="text-[17px] font-bold">복습 예보</h2>
      <p className="mt-0.5 text-[13px] text-ink-3">
        앞으로 7일 동안 다시 볼 단어·문형 <span className="num font-semibold text-ink-2">{sum}</span>개 · 새 단어는 빼고
      </p>

      <div className="mt-5 grid grid-cols-7" role="group" aria-label="날짜별 복습 수">
        {days.map((d, i) => (
          <button
            key={d.key}
            type="button"
            onClick={() => setPicked(i)}
            onPointerEnter={(e) => e.pointerType === "mouse" && setPicked(i)}
            aria-pressed={picked === i}
            aria-label={`${dateText(d.ts)} 복습 ${d.count}개`}
            className="group flex flex-col items-center"
          >
            {/* 값은 막대 위에, 막대는 바닥선에서 자란다 */}
            <span className="flex h-[132px] w-full flex-col items-center justify-end">
              <span
                className={`num mb-1 text-[12px] ${picked === i ? "font-bold text-ink" : "font-medium text-ink-3"}`}
              >
                {d.count}
              </span>
              <span
                className={`w-6 max-w-[60%] rounded-t-[4px] bg-blue transition-opacity ${
                  picked === i ? "" : "opacity-45 group-hover:opacity-70"
                }`}
                style={{ height: `${d.count ? Math.max(4, (d.count / max) * 100) : 0}px` }}
              />
            </span>
            <span className="h-px w-full bg-line" aria-hidden />
            <span className={`mt-2 text-[12px] ${picked === i ? "font-bold text-ink" : "font-medium text-ink-3"}`}>
              {dayLabel(d.ts, i)}
            </span>
          </button>
        ))}
      </div>
      <p className="mt-4 rounded-2xl bg-muted px-4 py-2.5 text-[14px] text-ink-2" aria-live="polite">
        <span className="font-semibold text-ink">{dateText(sel.ts)}</span> ·{" "}
        {sel.count ? (
          <>
            복습 <b className="num font-semibold text-ink">{sel.count}</b>개
            {picked === 0 && " (밀린 것 포함)"}
          </>
        ) : (
          "복습할 카드가 없어요"
        )}
      </p>
    </section>
  );
}

// 하루 답한 수 → 달력 칸 진하기 (0 · 1–9 · 10–24 · 25–49 · 50+)
const LEVELS = [1, 10, 25, 50];
const levelOf = (n: number) => LEVELS.filter((t) => n >= t).length;

/** 한 달 학습 달력: 답한 수가 많은 날일수록 진한 파랑. 칸을 누르면 그날 기록을 보여 준다. */
function Calendar({ now }: { now: number }) {
  const reviewLog = useStore((s) => s.reviewLog);
  const newLog = useStore((s) => s.newLog);
  const today = new Date(now);
  const [month, setMonth] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [picked, setPicked] = useState<string>(dayKey(now));
  const weeks = monthWeeks(month.y, month.m);
  // 처음 기록한 달보다 앞으로는 가지 않는다.
  const first = Object.keys(reviewLog).sort()[0];
  const firstMonth = first ? Number(first.slice(0, 4)) * 12 + Number(first.slice(5, 7)) - 1 : month.y * 12 + month.m;
  const index = month.y * 12 + month.m;
  const thisMonth = today.getFullYear() * 12 + today.getMonth();
  const go = (delta: number) => {
    const n = index + delta;
    setMonth({ y: Math.floor(n / 12), m: n % 12 });
  };
  const days = weeks.flat().filter((d): d is Date => d !== null);
  const studied = days.filter((d) => (reviewLog[dayKey(d.getTime())] ?? 0) > 0).length;
  const answered = days.reduce((n, d) => n + (reviewLog[dayKey(d.getTime())] ?? 0), 0);
  const [, pm, pd] = picked.split("-").map(Number);

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-bold">학습 달력</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={index <= firstMonth}
            aria-label="지난달"
            className="press grid size-9 place-items-center rounded-full text-ink-2 disabled:opacity-30"
          >
            <Icon name="back" className="size-[18px]" />
          </button>
          <span className="num min-w-[86px] text-center text-[15px] font-semibold">
            {month.y}. {month.m + 1}
          </span>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={index >= thisMonth}
            aria-label="다음 달"
            className="press grid size-9 place-items-center rounded-full text-ink-2 disabled:opacity-30"
          >
            <Icon name="chevron" className="size-[18px]" />
          </button>
        </div>
      </div>
      <p className="mt-0.5 text-[13px] text-ink-3">
        <span className="num font-semibold text-ink-2">{studied}</span>일 공부 ·{" "}
        <span className="num font-semibold text-ink-2">{answered}</span>번 답했어요
      </p>

      <div className="mt-4 grid grid-cols-7 gap-1.5 text-center" role="grid" aria-label={`${month.y}년 ${month.m + 1}월`}>
        {WEEKDAYS.map((w) => (
          <span key={w} className="pb-1 text-[12px] font-medium text-ink-3" role="columnheader">
            {w}
          </span>
        ))}
        {weeks.flat().map((d, i) => {
          if (!d) return <span key={`x${i}`} />;
          const key = dayKey(d.getTime());
          const count = reviewLog[key] ?? 0;
          const level = levelOf(count);
          const isToday = key === dayKey(now);
          const future = d.getTime() > now && !isToday;
          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              disabled={future}
              onClick={() => setPicked(key)}
              aria-selected={picked === key}
              aria-label={`${d.getMonth() + 1}월 ${d.getDate()}일 ${count}번 답함`}
              className={`num grid aspect-square place-items-center rounded-[10px] text-[12px] font-semibold disabled:opacity-40 ${
                picked === key ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : isToday ? "ring-[1.5px] ring-blue" : ""
              }`}
              style={{ background: `var(--heat-${level})`, color: `var(--heat-ink-${level})` }}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      {/* 진하기 범례 */}
      <p className="mt-3 flex items-center justify-end gap-1 text-[11px] text-ink-3" aria-label="적음에서 많음까지">
        적음
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className="size-3 rounded-[3px]" style={{ background: `var(--heat-${l})` }} />
        ))}
        많음
      </p>
      <p className="mt-3 rounded-2xl bg-muted px-4 py-2.5 text-[14px] text-ink-2" aria-live="polite">
        <span className="font-semibold text-ink">
          {pm}월 {pd}일
        </span>{" "}
        ·{" "}
        {reviewLog[picked] ? (
          <>
            <b className="num font-semibold text-ink">{reviewLog[picked]}</b>번 답함
            {(newLog[picked] ?? 0) > 0 && (
              <>
                {" "}
                · 새 단어 <b className="num font-semibold text-ink">{newLog[picked]}</b>개
              </>
            )}
          </>
        ) : (
          "기록 없음"
        )}
      </p>
    </section>
  );
}

/** 단어 · 문형 · 한자의 기억 상태 */
function MemorySection() {
  const songs = useStore((s) => s.songs);
  const order = useStore((s) => s.order);
  const cards = useStore((s) => s.cards);
  const info = useKanjiTable();
  const rows = useMemo(() => {
    const count = (keys: string[]) => {
      let long = 0;
      let short = 0;
      for (const k of keys) {
        const m = memoryOf(cards[k]);
        if (m === "long") long++;
        else if (m === "short") short++;
      }
      return { total: keys.length, long, short };
    };
    const words = uniqueVocab(songs, order).map(cardKey);
    const grammar = uniqueGrammar(songs, order).map((g) => g.key);
    const kanji = info ? kanjiDeck(songs, order, info).map((k) => kanjiKey(k.char)) : null;
    return [
      { label: "단어", ...count(words) },
      { label: "문형", ...count(grammar) },
      ...(kanji ? [{ label: "한자", ...count(kanji) }] : []),
    ];
  }, [songs, order, cards, info]);

  return (
    <section className="card p-5">
      <h2 className="text-[17px] font-bold">기억 상태</h2>
      <ul className="mt-3 space-y-3.5">
        {rows.map((r) => (
          <li key={r.label}>
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="font-semibold text-ink-2">{r.label}</span>
              <span className="text-ink-3">
                장기 <b className="num font-semibold text-ink">{r.long}</b> · 단기{" "}
                <b className="num font-semibold text-ink">{r.short}</b> · 전체 <span className="num">{r.total}</span>
              </span>
            </div>
            <MemoryBar total={r.total} long={r.long} short={r.short} className="mt-1.5 h-2" />
          </li>
        ))}
      </ul>
    </section>
  );
}
