"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { Icon, IconCircle } from "@/components/Icon";
import { Headline } from "@/components/PageHeader";
import { SongCover } from "@/components/SongCover";
import { Spinner } from "@/components/Spinner";
import { useInFlight } from "@/lib/api-client";
import { buildQueue } from "@/lib/review";
import { isLearned } from "@/lib/srs";
import { greeting, lastDays, streak } from "@/lib/stats";
import { useStore } from "@/lib/store";
import type { CardState, Song } from "@/lib/types";
import { useAiStatus } from "@/lib/use-ai-status";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
type Filter = "all" | "studying" | "done";

export function HomeClient() {
  return (
    <HydrationGate>
      <Home />
    </HydrationGate>
  );
}

function Home() {
  const songs = useStore((s) => s.songs);
  const order = useStore((s) => s.order);
  const cards = useStore((s) => s.cards);
  const reviewLog = useStore((s) => s.reviewLog);
  const ai = useAiStatus();
  const [now] = useState(Date.now);
  const [filter, setFilter] = useState<Filter>("all");

  const { queue, dueCount, newCount } = useMemo(
    () => buildQueue(songs, order, cards, now),
    [songs, order, cards, now],
  );
  const allVocab = useMemo(
    () => order.flatMap((id) => (songs[id]?.status === "ready" ? songs[id].vocab : [])),
    [songs, order],
  );
  const learned = allVocab.filter((v) => isLearned(cards[v.id])).length;
  const week = lastDays(reviewLog, now, 7);
  const days = streak(reviewLog, now);

  const progress = (song: Song) => {
    const total = song.vocab.length;
    const done = song.vocab.filter((v) => isLearned(cards[v.id])).length;
    return { total, done };
  };
  const visible = order.filter((id) => {
    const song = songs[id];
    if (!song) return false;
    if (filter === "all") return true;
    const { total, done } = progress(song);
    const finished = song.status === "ready" && total > 0 && done === total;
    return filter === "done" ? finished : !finished;
  });

  return (
    <div className="space-y-7 pt-5">
      <header>
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-medium text-ink-3">{greeting(now)}!</p>
          <span className="flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold">
            <Icon name="flame" className="size-4 text-pink" />
            <span>
              <span className="num">{days}</span>일 연속
            </span>
          </span>
        </div>
        <Headline className="mt-2 text-[31px]" first="좋아하는 노래로" second="일본어 공부해요" />
      </header>

      <section className="iris-card relative overflow-hidden p-5">
        <div
          className="iris pointer-events-none absolute inset-x-0 bottom-0 h-3/5"
          style={{ maskImage: "linear-gradient(to bottom, transparent, black)", WebkitMaskImage: "linear-gradient(to bottom, transparent, black)" }}
          aria-hidden
        />
        <div className="relative flex items-end justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium text-ink-3">오늘 복습할 단어</p>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="num text-[56px] leading-none font-medium">{queue.length}</span>
              <span className="text-[17px] font-semibold text-ink-2">개</span>
            </p>
          </div>
          {queue.length > 0 && (
            <dl className="space-y-1 text-right text-[13px]">
              <div className="flex justify-end gap-2">
                <dt className="text-ink-3">다시 볼 단어</dt>
                <dd className="num w-6 font-semibold">{dueCount}</dd>
              </div>
              <div className="flex justify-end gap-2">
                <dt className="text-ink-3">새 단어</dt>
                <dd className="num w-6 font-semibold">{newCount}</dd>
              </div>
            </dl>
          )}
        </div>
        <p className="relative mt-3 text-[15px] font-medium text-ink-2">
          {queue.length ? "노래 속 단어를 복습할 시간이에요." : "오늘 복습은 모두 끝났어요."}
        </p>
        <Link
          href={queue.length ? "/review" : "/songs/new"}
          className="btn-primary press relative mt-5 flex items-center justify-center py-3.5 text-[15px] font-semibold"
        >
          {queue.length ? "복습 시작" : "새 노래 추가하기"}
        </Link>
      </section>

      {ai === false && (
        <p className="iris flex items-center gap-3 rounded-3xl px-4 py-3 text-[14px] leading-relaxed text-ink-2">
          <IconCircle name="info" className="size-10" />
          서버에 AI 키가 없어서 지금은 후리가나 가사와 데모곡만 쓸 수 있어요.
        </p>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[19px] font-semibold">나의 기록</h2>
          <Link href="/vocab" className="flex items-center text-[14px] font-medium text-ink-3">
            단어장 <Icon name="chevron" className="size-4" />
          </Link>
        </div>
        <div className="card px-5 pt-5 pb-4">
          <div className="grid grid-cols-3">
            <Record value={days} label="일 연속" />
            <Record value={learned} label="외운 단어" />
            <Record value={allVocab.length} label="모은 단어" />
          </div>
          <ol className="mt-5 flex justify-between border-t border-line pt-4" aria-label="최근 7일 복습 기록">
            {week.map((d, i) => {
              const date = new Date(d.ts);
              const today = i === week.length - 1;
              return (
                <li
                  key={d.key}
                  className="flex flex-col items-center gap-1.5"
                  aria-label={`${date.getMonth() + 1}월 ${date.getDate()}일 ${d.count}개 복습`}
                >
                  <span className={`text-[12px] font-medium ${today ? "text-blue" : "text-ink-3"}`}>
                    {WEEKDAYS[date.getDay()]}
                  </span>
                  <span
                    className={`grid size-8 place-items-center rounded-full text-[13px] font-semibold ${
                      d.count ? "btn-primary" : today ? "border border-blue text-blue" : "bg-muted text-ink-3"
                    }`}
                  >
                    <span className="num">{date.getDate()}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[19px] font-semibold">
            내 노래 <span className="num text-[15px] font-medium text-ink-3">{order.length}</span>
          </h2>
        </div>
        {order.length > 0 && (
          <div className="mb-3 flex gap-2">
            {(
              [
                ["all", "전체"],
                ["studying", "공부 중"],
                ["done", "다 외움"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className="chip press"
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
            {filter === "done" ? "아직 다 외운 노래가 없어요." : "공부 중인 노래가 없어요."}
          </p>
        ) : (
          <ul className="space-y-2.5">
            {visible.map((id) => (
              <SongRow key={id} song={songs[id]} cards={cards} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Record({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <p className="num text-[32px] leading-none font-medium">{value}</p>
      <p className="grad-text mt-1.5 text-[13px] font-semibold">{label}</p>
    </div>
  );
}

function SongRow({ song, cards }: { song: Song; cards: Record<string, CardState> }) {
  const inFlight = useInFlight((s) => s.ids.has(song.id));
  const total = song.vocab.length;
  const done = song.vocab.filter((v) => isLearned(cards[v.id])).length;
  return (
    <li>
      <Link href={`/songs/${song.id}`} className="card press flex items-center gap-3.5 p-3">
        <SongCover id={song.id} title={song.title} />
        <div className="min-w-0 flex-1">
          <div className="font-jp truncate text-[16px] font-bold">{song.title}</div>
          <div className="truncate text-[13px] text-ink-3">
            {song.artist || "아티스트 미상"} · {song.level}
          </div>
          {song.status === "ready" && total > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-[image:var(--grad-text)]" style={{ width: `${(done / total) * 100}%` }} />
              </div>
              <span className="num text-[12px] font-semibold text-ink-3">
                {done}/{total}
              </span>
            </div>
          )}
          {song.status === "analyzing" && (
            <span className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-medium text-blue">
              {inFlight && <Spinner className="size-3" />}
              {inFlight ? "단어장 만드는 중" : "멈춤 · 눌러서 다시 시도"}
            </span>
          )}
          {song.status === "error" && (
            <span className="mt-1 inline-block text-[12px] font-semibold text-danger">단어장 만들기 실패 · 다시 시도</span>
          )}
        </div>
        <Icon name="chevron" className="size-5 shrink-0 text-ink-3" />
      </Link>
    </li>
  );
}
