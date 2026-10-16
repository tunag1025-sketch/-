"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { ArrowDot, Icon } from "@/components/Icon";
import { LyricLineView } from "@/components/LyricLineView";
import { CircleLink } from "@/components/PageHeader";
import { VocabDetail, WordHeading } from "@/components/VocabDetail";
import { buildQueue } from "@/lib/review";
import { intervalLabel, newCard } from "@/lib/srs";
import { streak } from "@/lib/stats";
import { useStore } from "@/lib/store";
import type { Grade } from "@/lib/types";

const GRADES: { grade: Grade; label: string; className: string }[] = [
  { grade: "again", label: "다시", className: "bg-danger-soft text-danger" },
  { grade: "hard", label: "어려움", className: "bg-lav text-on-lav" },
  { grade: "good", label: "알맞음", className: "bg-blue text-on-blue" },
  { grade: "easy", label: "쉬움", className: "bg-lime text-on-lime" },
];

export function ReviewClient() {
  const songId = useSearchParams().get("song") ?? undefined;
  return (
    <HydrationGate>
      <ReviewSession songId={songId} />
    </HydrationGate>
  );
}

function ReviewSession({ songId }: { songId?: string }) {
  const songs = useStore((s) => s.songs);
  const cards = useStore((s) => s.cards);
  const grade = useStore((s) => s.grade);
  const furigana = useStore((s) => s.settings.furigana);

  // 세션을 시작할 때의 목록을 고정한다. "다시"를 누른 카드는 뒤에 다시 붙인다.
  const [queue, setQueue] = useState(() => {
    const { songs, order, cards } = useStore.getState();
    return buildQueue(songs, order, cards, Date.now(), { songId }).queue.map((v) => v.id);
  });
  const [pos, setPos] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [now] = useState(Date.now);

  const songTitle = songId ? songs[songId]?.title : undefined;
  const currentId = queue[pos];
  const [sid] = currentId?.split(":") ?? [];
  const song = sid ? songs[sid] : undefined;
  const item = song?.vocab.find((v) => v.id === currentId);
  const exitHref = songId ? `/songs/${songId}` : "/";

  if (!currentId || !item || !song) {
    return <Finished total={doneCount} songTitle={songTitle} empty={queue.length === 0} exitHref={exitHref} />;
  }

  const card = cards[item.id] ?? newCard(now);
  const contextLine = item.lines[0];

  function answer(g: Grade) {
    grade(item!.id, g);
    if (g === "again") setQueue((q) => [...q, currentId]);
    else setDoneCount((n) => n + 1);
    setPos((p) => p + 1);
    setRevealed(false);
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="pt-3">
      <header className="flex items-center gap-3">
        <CircleLink href={exitHref} icon="close" label="복습 그만하기" />
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
          <div className="h-full rounded-full bg-blue transition-all" style={{ width: `${(pos / queue.length) * 100}%` }} />
        </div>
        <span className="num w-14 text-right text-[14px] font-semibold text-ink-3">
          {pos + 1}/{queue.length}
        </span>
      </header>

      <article className="mt-5 rounded-[32px] bg-surface px-5 pt-5 pb-8">
        <p className="font-jp flex items-center gap-1.5 truncate text-[13px] font-medium text-ink-3">
          <Icon name="music" className="size-3.5 shrink-0" />
          {song.title}
        </p>
        {contextLine !== undefined && song.lines[contextLine] && (
          <p className="mt-3 rounded-2xl bg-muted px-4 py-2 text-[17px] leading-[2.3]">
            <LyricLineView
              line={song.lines[contextLine]}
              index={contextLine}
              vocab={[item]}
              focusId={item.id}
              furigana={furigana}
            />
          </p>
        )}
        <div className="mt-8 text-center">
          {revealed ? (
            <WordHeading item={item} />
          ) : (
            <>
              <div className="font-jp text-[44px] leading-tight font-bold">{item.word}</div>
              <p className="mt-2 text-[14px] text-ink-3">읽는 법과 뜻을 떠올려 보세요</p>
            </>
          )}
        </div>
      </article>

      {revealed && (
        <div className="mt-3 rounded-[32px] bg-surface px-5 py-5">
          <VocabDetail item={item} showHeading={false} />
        </div>
      )}

      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 bg-bg/90 backdrop-blur-md">
        <div className="mx-auto max-w-xl px-4 pt-3 pb-3">
          {revealed ? (
            <div className="grid grid-cols-4 gap-2">
              {GRADES.map((g) => (
                <button
                  key={g.grade}
                  type="button"
                  onClick={() => answer(g.grade)}
                  className={`press rounded-[20px] px-1 py-3 text-center ${g.className}`}
                >
                  <div className="text-[15px] font-bold">{g.label}</div>
                  <div className="num mt-0.5 text-[12px] font-medium opacity-75">{intervalLabel(card, g.grade, now)}</div>
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="press flex w-full items-center justify-between rounded-full bg-solid py-2 pr-2 pl-6 text-[16px] font-semibold text-on-solid"
            >
              뜻 보기
              <ArrowDot />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Finished({
  total,
  songTitle,
  empty,
  exitHref,
}: {
  total: number;
  songTitle?: string;
  empty: boolean;
  exitHref: string;
}) {
  const reviewLog = useStore((s) => s.reviewLog);
  const [now] = useState(Date.now);
  const days = streak(reviewLog, now);

  return (
    <div className="pt-16">
      <span
        className={`mx-auto grid size-20 place-items-center rounded-full ${empty ? "bg-surface text-ink-3" : "bg-lime text-on-lime"}`}
      >
        <Icon name={empty ? "cards" : "check"} className="size-9" />
      </span>
      <h1 className="mt-5 text-center text-[24px] font-bold">{empty ? "지금 복습할 단어가 없어요" : "오늘 복습 끝!"}</h1>
      <p className="mt-1.5 text-center text-[15px] text-ink-3">
        {empty
          ? "노래를 추가하거나 다음 복습 시간이 되면 카드가 생겨요."
          : `${songTitle ? `'${songTitle}' ` : ""}단어를 모두 복습했어요.`}
      </p>
      {!empty && (
        <div className="mt-7 grid grid-cols-2 gap-3">
          <div className="rounded-[28px] bg-blue px-4 py-4 text-on-blue">
            <p className="text-[13px] opacity-80">복습한 단어</p>
            <p className="num mt-1.5 text-[36px] leading-none font-semibold">{total}</p>
          </div>
          <div className="rounded-[28px] bg-surface px-4 py-4">
            <p className="text-[13px] text-ink-3">연속 학습</p>
            <p className="num mt-1.5 text-[36px] leading-none font-semibold">
              {days}
              <span className="ml-0.5 text-[16px] font-medium">일</span>
            </p>
          </div>
        </div>
      )}
      <Link
        href={exitHref}
        className="press mt-7 flex items-center justify-between rounded-full bg-solid py-2 pr-2 pl-6 text-[16px] font-semibold text-on-solid"
      >
        {exitHref === "/" ? "홈으로" : "노래로 돌아가기"}
        <ArrowDot />
      </Link>
    </div>
  );
}
