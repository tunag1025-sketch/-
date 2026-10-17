"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { Icon, IconCircle } from "@/components/Icon";
import { MemoryBar, MemoryLegend } from "@/components/MemoryBar";
import { Headline } from "@/components/PageHeader";
import { QueueSplit } from "@/components/QueueSplit";
import { SongCover } from "@/components/SongCover";
import { Spinner } from "@/components/Spinner";
import { useAccount } from "@/lib/account";
import { useInFlight } from "@/lib/api-client";
import { buildDeck, kanjiKey, uniqueVocab } from "@/lib/cards";
import { kanjiIn, useKanjiTable } from "@/lib/kanji";
import { useNeedsOnboarding } from "@/lib/onboarding";
import { KANJI_NEW_PER_SESSION, kanjiDeck } from "@/lib/kanji-deck";
import { buildQueue, EXTRA_NEW, KANJI_HREF, remainingNew, reviewHref } from "@/lib/review";
import { progressOf } from "@/lib/srs";
import { dayKey, greeting, lastDays, streak } from "@/lib/stats";
import { useStore } from "@/lib/store";
import type { CardState, Song, VocabItem } from "@/lib/types";
import { useAiStatus } from "@/lib/use-ai-status";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
type Filter = "all" | "studying" | "short" | "long";

/** 노래의 단계: 모든 단어가 장기기억이면 long, 모두 단기기억 이상이면 short */
function songLevel(p: { total: number; long: number; short: number }): Exclude<Filter, "all"> {
  if (p.total > 0 && p.long === p.total) return "long";
  if (p.total > 0 && p.long + p.short === p.total) return "short";
  return "studying";
}

export function HomeClient() {
  return (
    <HydrationGate>
      <FirstRun>
        <Home />
      </FirstRun>
    </HydrationGate>
  );
}

/** 처음 연 사람은 홈 대신 첫 안내로 보낸다. */
function FirstRun({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const first = useNeedsOnboarding();
  useEffect(() => {
    if (first) router.replace("/onboarding");
  }, [first, router]);
  return first ? null : children;
}

function Home() {
  const songs = useStore((s) => s.songs);
  const order = useStore((s) => s.order);
  const cards = useStore((s) => s.cards);
  const reviewLog = useStore((s) => s.reviewLog);
  const newLog = useStore((s) => s.newLog);
  const dailyNew = useStore((s) => s.settings.dailyNew);
  const ai = useAiStatus();
  const accountEnabled = useAccount((s) => s.enabled);
  const user = useAccount((s) => s.user);
  const [now] = useState(Date.now);
  const [filter, setFilter] = useState<Filter>("all");

  const { queue, dueCount, newCount, freshTotal } = useMemo(
    () => buildQueue(songs, order, cards, now, { newLimit: remainingNew(dailyNew, newLog, now) }),
    [songs, order, cards, now, dailyNew, newLog],
  );
  const extra = Math.max(0, (newLog[dayKey(now)] ?? 0) - dailyNew) + EXTRA_NEW;
  // 여러 노래에 나오는 단어는 하나로 센다.
  const allVocab = useMemo(() => uniqueVocab(songs, order), [songs, order]);
  const memory = progressOf(allVocab, cards);
  const week = lastDays(reviewLog, now, 7);
  const days = streak(reviewLog, now);
  const weekTotal = week.reduce((n, d) => n + d.count, 0);

  const visible = order.filter((id) => {
    const song = songs[id];
    if (!song) return false;
    if (filter === "all") return true;
    const level = song.status === "ready" ? songLevel(progressOf(song.vocab, cards)) : "studying";
    return level === filter;
  });

  return (
    <div className="space-y-8 pt-4">
      <header className="space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-medium text-ink-3">{greeting(now)}</p>
          <div className="flex items-center gap-2">
            <span className="flex h-[34px] items-center gap-1 rounded-full border border-line bg-surface px-3 text-[13px] font-semibold">
              <Icon name="flame" className="size-4 text-pink" />
              <span>
                <span className="num">{days}</span>일 연속
              </span>
            </span>
            <Link
              href="/settings"
              aria-label="설정"
              className="press grid size-9 place-items-center overflow-hidden rounded-full border border-line bg-surface text-ink-2"
            >
              {user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" className="size-full rounded-full object-cover" />
              ) : (
                <Icon name="user" className="size-[18px]" />
              )}
            </Link>
          </div>
        </div>
        <Headline className="text-[30px]" first="좋아하는 노래로" second="일본어 공부해요" />
      </header>

      <section className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-semibold text-ink-2">오늘 학습할 단어</p>
          <Link href="/study" className="-my-1 flex items-center py-1 text-[13px] font-medium text-ink-3">
            하루 새 단어 <span className="num mx-0.5">{dailyNew}</span>개 <Icon name="chevron" className="size-4" />
          </Link>
        </div>
        <div className="mt-2.5 flex items-end justify-between gap-3">
          <p className="flex items-baseline gap-1">
            <span className="num text-[64px] leading-none font-medium tracking-[-0.04em]">{queue.length}</span>
            <span className="text-[18px] font-bold text-ink-2">개</span>
          </p>
          {queue.length > 0 && <QueueSplit due={dueCount} fresh={newCount} />}
        </div>
        <p className="mt-3.5 text-[15px] font-medium text-ink-2">
          {queue.length
            ? "노래 속 단어를 학습할 시간이에요."
            : freshTotal
              ? "오늘 배울 새 단어를 다 배웠어요."
              : "오늘 학습은 모두 끝났어요."}
        </p>
        <Link
          href={queue.length ? reviewHref() : freshTotal ? reviewHref(undefined, extra) : "/songs/new"}
          className="btn-primary press mt-5 flex h-[54px] items-center justify-center text-[16px] font-bold"
        >
          {queue.length
            ? "학습 시작"
            : freshTotal
              ? `새 단어 ${Math.min(EXTRA_NEW, freshTotal)}개 더 학습하기`
              : "새 노래 추가하기"}
        </Link>
      </section>

      <KanjiCard vocab={allVocab} cards={cards} now={now} />

      {accountEnabled && !user && (
        <Link
          href="/login"
          className="press flex items-center gap-3 rounded-3xl bg-muted px-4 py-3 text-[14px] leading-relaxed text-ink-2"
        >
          <IconCircle name="user" tone="plain" className="size-10" />
          <span className="min-w-0 flex-1">로그인하면 AI 단어장을 만들고 여러 기기에서 이어서 공부할 수 있어요.</span>
          <Icon name="chevron" className="size-5 shrink-0 text-ink-3" />
        </Link>
      )}

      {ai === false && (
        <p className="flex items-center gap-3 rounded-3xl bg-muted px-4 py-3 text-[14px] leading-relaxed text-ink-2">
          <IconCircle name="info" tone="plain" className="size-10" />
          서버에 AI 키가 없어서 지금은 후리가나 가사와 데모곡만 쓸 수 있어요.
        </p>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-bold">나의 기록</h2>
          <Link href="/vocab" className="flex items-center text-[14px] font-medium text-ink-3">
            단어장 <Icon name="chevron" className="size-4" />
          </Link>
        </div>
        <div className="card p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[13px] font-medium text-ink-3">모은 단어</p>
              <p className="mt-1 flex items-baseline gap-[3px]">
                <span className="num text-[36px] leading-none font-medium">{allVocab.length}</span>
                <span className="text-[15px] font-semibold text-ink-2">개</span>
              </p>
            </div>
            {allVocab.length > 0 && (
              <p className="text-[13px] text-ink-3">
                <span className="num">{memory.long + memory.short}</span>개 기억하고 있어요
              </p>
            )}
          </div>
          {allVocab.length > 0 && (
            <>
              <MemoryBar total={memory.total} long={memory.long} short={memory.short} className="mt-3.5 h-2" />
              <MemoryLegend
                className="mt-2.5"
                counts={{ long: memory.long, short: memory.short, none: memory.total - memory.long - memory.short }}
              />
            </>
          )}
          <div className="mt-[18px] border-t border-line pt-4">
            <div className="mb-3 flex items-baseline justify-between">
              <p className="text-[13px] font-semibold text-ink-2">이번 주</p>
              <p className="text-[13px] text-ink-3">
                <b className="num font-semibold text-ink">{weekTotal}</b>번 답했어요
              </p>
            </div>
            <ol className="grid grid-cols-7 text-center" aria-label="최근 7일 학습 기록">
              {week.map((d, i) => {
                const date = new Date(d.ts);
                const today = i === week.length - 1;
                return (
                  <li
                    key={d.key}
                    className="flex flex-col items-center gap-1.5"
                    aria-label={`${date.getMonth() + 1}월 ${date.getDate()}일 ${d.count}개 학습`}
                  >
                    <span className={`text-[12px] ${today ? "font-bold text-blue" : "font-medium text-ink-3"}`}>
                      {today ? "오늘" : WEEKDAYS[date.getDay()]}
                    </span>
                    <span
                      className={`num grid size-[34px] place-items-center rounded-full text-[13px] ${
                        today
                          ? "bg-btn font-semibold text-white"
                          : d.count
                            ? "bg-blue-soft font-semibold text-blue"
                            : "font-medium text-ink-3"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline gap-1.5">
          <h2 className="text-[20px] font-bold">내 노래</h2>
          <span className="num text-[15px] font-medium text-ink-3">{order.length}</span>
        </div>
        {order.length > 0 && (
          <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 [scrollbar-width:none]">
            {(
              [
                ["all", "전체"],
                ["studying", "공부 중"],
                ["short", "단기기억"],
                ["long", "장기기억"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className="chip press shrink-0"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {order.length === 0 ? (
          <div className="card flex flex-col items-center px-5 py-9 text-center">
            <IconCircle name="music" className="size-16" />
            <p className="mt-3 font-semibold">첫 노래를 추가해 보세요</p>
            <p className="text-[14px] text-ink-3">가사를 붙여넣으면 단어장이 만들어져요</p>
          </div>
        ) : visible.length === 0 ? (
          <p className="py-8 text-center text-[14px] text-ink-3">
            {filter === "long"
              ? "아직 모든 단어가 장기기억인 노래가 없어요."
              : filter === "short"
                ? "아직 모든 단어를 한 번씩 맞힌 노래가 없어요."
                : "공부 중인 노래가 없어요."}
          </p>
        ) : (
          <ul className="card divide-y divide-line overflow-hidden">
            {visible.map((id) => (
              <SongRow key={id} song={songs[id]} cards={cards} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** 오늘 볼 한자 카드. 한자가 든 단어를 모았을 때만 보인다. */
function KanjiCard({ vocab, cards, now }: { vocab: VocabItem[]; cards: Record<string, CardState>; now: number }) {
  const songs = useStore((s) => s.songs);
  const order = useStore((s) => s.order);
  const info = useKanjiTable();
  const hasKanji = useMemo(() => vocab.some((v) => kanjiIn(v.word).length > 0), [vocab]);
  const deck = useMemo(() => {
    if (!info) return null;
    const keys = kanjiDeck(songs, order, info).map((k) => kanjiKey(k.char));
    return { total: keys.length, ...buildDeck(keys, cards, now, KANJI_NEW_PER_SESSION) };
  }, [info, songs, order, cards, now]);
  // 표를 못 받았거나 훈음 있는 한자가 없으면 감춘다
  if (!hasKanji || (deck && deck.total === 0)) return null;
  const today = deck?.queue.length ?? 0;
  // 기한이 된 한자 먼저, 그다음 새 한자
  const glyphs = deck?.queue.slice(0, 6).map((key) => key.slice(key.indexOf(":") + 1)) ?? [];

  return (
    <section className="card p-5" aria-busy={!deck}>
      <div className="flex items-center gap-3.5">
        <span className="font-jp grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-soft text-[22px] font-bold text-blue">
          字
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-bold">한자 카드</h2>
          <p className="truncate text-[13px] text-ink-3">
            {!deck ? (
              "한자 표를 불러오는 중…"
            ) : (
              <>
                {today > 0 ? (
                  <>
                    오늘 <span className="num">{today}</span>자 ·{" "}
                  </>
                ) : (
                  "오늘 볼 한자를 다 봤어요 · "
                )}
                모은 한자 <span className="num">{deck.total}</span>자
              </>
            )}
          </p>
        </div>
        <Link
          href={today > 0 ? KANJI_HREF : "/vocab?view=kanji"}
          className={`press flex h-10 shrink-0 items-center rounded-full px-4 text-[15px] font-bold ${
            today > 0 ? "btn-primary" : "btn-ghost"
          }`}
        >
          {today > 0 ? "학습" : "보기"}
        </Link>
      </div>
      {glyphs.length > 0 && (
        <ul className="mt-4 flex gap-1.5" aria-label="오늘 볼 한자">
          {glyphs.map((c) => (
            <li key={c} className="font-jp grid size-11 place-items-center rounded-[14px] bg-muted text-[20px] font-bold">
              {c}
            </li>
          ))}
          {today > glyphs.length && (
            <li className="num grid h-11 place-items-center px-1.5 text-[13px] font-semibold text-ink-3">
              +{today - glyphs.length}
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

function SongRow({ song, cards }: { song: Song; cards: Record<string, CardState> }) {
  const inFlight = useInFlight((s) => s.ids.has(song.id));
  const { total, long, short } = progressOf(song.vocab, cards);
  return (
    <li>
      <Link href={`/songs/${song.id}`} className="flex items-center gap-3.5 px-4 py-3.5 transition-colors active:bg-muted">
        <SongCover song={song} className="size-14 rounded-[18px]" />
        <div className="min-w-0 flex-1">
          <div className="font-jp truncate text-[16px] font-bold">{song.title}</div>
          <div className="mt-0.5 truncate text-[13px] text-ink-3">
            {song.artist || "아티스트 미상"} · {song.level}
          </div>
          {song.status === "ready" && total > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <MemoryBar total={total} long={long} short={short} className="h-[5px] flex-1" />
              <span className="num text-[12px] font-semibold text-ink-3">
                {long + short}/{total}
              </span>
            </div>
          )}
          {song.status === "analyzing" && (
            <span className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-blue">
              {inFlight && <Spinner className="size-3" />}
              {inFlight ? "단어장 만드는 중" : "멈춤 · 눌러서 다시 시도"}
            </span>
          )}
          {song.status === "error" && (
            <span className="mt-1.5 inline-flex h-6 items-center rounded-full bg-danger-soft px-2.5 text-[12px] font-semibold text-danger">
              만들기 실패 · 다시 시도
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}
