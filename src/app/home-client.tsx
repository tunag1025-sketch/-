"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { Icon } from "@/components/Icon";
import { Spinner } from "@/components/Spinner";
import { useInFlight } from "@/lib/api-client";
import { buildQueue } from "@/lib/review";
import { isLearned } from "@/lib/srs";
import { greeting, lastDays, streak } from "@/lib/stats";
import { useStore } from "@/lib/store";
import { toneFor } from "@/lib/tone";
import type { CardState, Song } from "@/lib/types";
import { useAiStatus } from "@/lib/use-ai-status";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

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
  const weekTotal = week.reduce((n, d) => n + d.count, 0);
  const weekMax = Math.max(1, ...week.map((d) => d.count));
  const days = streak(reviewLog, now);

  return (
    <div className="space-y-7 pt-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[15px] font-medium text-ink-3">{greeting(now)}</p>
          <h1 className="mt-0.5 text-[26px] leading-[1.25] font-bold tracking-[-0.03em]">
            오늘은 어떤 노래로
            <br />
            공부해 볼까요?
          </h1>
        </div>
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-blue text-lime" aria-hidden>
          <Icon name="music" className="size-[22px]" />
        </span>
      </header>

      <Link
        href="/songs/new"
        className="press flex items-center justify-center gap-2 rounded-full bg-solid py-4 text-[15px] font-semibold text-on-solid"
      >
        <Icon name="plus" className="size-[18px]" /> 노래 추가
      </Link>

      {ai === false && (
        <p className="flex gap-2.5 rounded-2xl bg-surface px-4 py-3.5 text-[14px] leading-relaxed text-ink-2">
          <Icon name="info" className="mt-0.5 size-[18px] shrink-0 text-blue" />
          서버에 AI 키가 없어서 지금은 후리가나 가사와 데모곡만 쓸 수 있어요.
        </p>
      )}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[18px] font-bold">학습 현황</h2>
          <Link href="/vocab" className="text-[14px] font-medium text-blue">
            단어장 보기
          </Link>
        </div>

        <ol className="flex gap-1.5" aria-label="최근 7일 복습 기록">
          {week.map((d, i) => {
            const date = new Date(d.ts);
            const today = i === week.length - 1;
            return (
              <li
                key={d.key}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 ${
                  today ? "bg-lime text-on-lime" : "bg-surface"
                }`}
                aria-label={`${date.getMonth() + 1}월 ${date.getDate()}일 ${d.count}개 복습`}
              >
                <span className={`text-[11px] font-medium ${today ? "" : "text-ink-3"}`}>{WEEKDAYS[date.getDay()]}</span>
                <span className="num text-[15px] font-semibold">{date.getDate()}</span>
                <span className={`size-1 rounded-full ${d.count ? (today ? "bg-on-lime" : "bg-blue") : "bg-transparent"}`} />
              </li>
            );
          })}
        </ol>

        <Link
          href="/review"
          className="press relative block overflow-hidden rounded-[28px] bg-blue px-5 pt-4 pb-5 text-on-blue"
        >
          <span className="absolute -right-10 -bottom-16 size-48 rounded-full bg-white/10" aria-hidden />
          <span className="absolute -right-2 -bottom-24 size-48 rounded-full bg-white/10" aria-hidden />
          <div className="relative flex items-start justify-between">
            <p className="text-[14px] font-medium opacity-85">오늘 복습할 단어</p>
            <span className="grid size-9 place-items-center rounded-full bg-white/20">
              <Icon name="arrowUpRight" className="size-[18px]" />
            </span>
          </div>
          <p className="num relative mt-3 text-[56px] leading-none font-semibold">
            {queue.length}
            <span className="ml-1 text-[20px] font-medium">개</span>
          </p>
          <p className="relative mt-2 text-[13px] opacity-80">
            {queue.length ? `다시 볼 단어 ${dueCount} · 새 단어 ${newCount}` : "오늘 복습을 모두 마쳤어요"}
          </p>
        </Link>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/vocab" className="press rounded-[28px] bg-lav px-4 pt-4 pb-4 text-on-lav">
            <p className="text-[13px] font-medium opacity-75">외운 단어</p>
            <p className="num mt-2 text-[40px] leading-none font-semibold">{learned}</p>
            <p className="mt-1.5 text-[12px] opacity-70">전체 {allVocab.length}개 중</p>
          </Link>
          <div className="rounded-[28px] bg-surface px-4 pt-4 pb-4">
            <p className="flex items-center gap-1 text-[13px] font-medium text-ink-3">
              <Icon name="flame" className="size-3.5" /> 연속 학습
            </p>
            <p className="num mt-2 text-[40px] leading-none font-semibold">
              {days}
              <span className="ml-0.5 text-[16px] font-medium">일</span>
            </p>
            <div className="mt-2 flex h-6 items-end gap-1" aria-label={`이번 주 ${weekTotal}개 복습`}>
              {week.map((d, i) => (
                <span
                  key={d.key}
                  className={`flex-1 rounded-[3px] ${i === week.length - 1 ? "bg-blue" : d.count ? "bg-lav" : "bg-muted"}`}
                  style={{ height: `${Math.max(14, (d.count / weekMax) * 100)}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[18px] font-bold">
            내 노래 <span className="num ml-0.5 text-[15px] font-medium text-ink-3">{order.length}</span>
          </h2>
        </div>
        {order.length === 0 ? (
          <Link href="/songs/new" className="block rounded-[28px] bg-surface px-5 py-10 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-lime text-on-lime">
              <Icon name="plus" />
            </span>
            <p className="mt-3 font-semibold">첫 노래를 추가해 보세요</p>
            <p className="text-[14px] text-ink-3">가사를 붙여넣으면 단어장이 만들어져요</p>
          </Link>
        ) : (
          <ul className="space-y-2.5">
            {order.map((id) => songs[id] && <SongRow key={id} song={songs[id]} cards={cards} />)}
          </ul>
        )}
      </section>
    </div>
  );
}

function SongRow({ song, cards }: { song: Song; cards: Record<string, CardState> }) {
  const inFlight = useInFlight((s) => s.ids.has(song.id));
  const learned = song.vocab.filter((v) => isLearned(cards[v.id])).length;
  const total = song.vocab.length;
  return (
    <li>
      <Link href={`/songs/${song.id}`} className="press flex items-center gap-3.5 rounded-[24px] bg-surface p-3">
        <span className={`grid size-[52px] shrink-0 place-items-center rounded-[18px] ${toneFor(song.id)}`}>
          <Icon name="music" className="size-[22px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-jp truncate text-[16px] font-bold">{song.title}</div>
          <div className="truncate text-[13px] text-ink-3">
            {song.artist || "아티스트 미상"} · {song.level}
          </div>
        </div>
        <div className="w-16 shrink-0 text-right">
          {song.status === "ready" && (
            <>
              <div className="num text-[13px] font-semibold">
                {learned}
                <span className="text-ink-3">/{total}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-blue" style={{ width: `${total ? (learned / total) * 100 : 0}%` }} />
              </div>
            </>
          )}
          {song.status === "analyzing" && (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-3">
              {inFlight && <Spinner className="size-3" />}
              {inFlight ? "만드는 중" : "멈춤"}
            </span>
          )}
          {song.status === "error" && <span className="text-[12px] font-semibold text-danger">다시 시도</span>}
        </div>
      </Link>
    </li>
  );
}
