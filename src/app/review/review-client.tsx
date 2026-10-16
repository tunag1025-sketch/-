"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { Icon, IconCircle } from "@/components/Icon";
import { LyricLineView } from "@/components/LyricLineView";
import { CircleLink, Headline } from "@/components/PageHeader";
import { Stat } from "@/components/Stat";
import { VocabDetail, WordHeading } from "@/components/VocabDetail";
import { buildQueue } from "@/lib/review";
import { intervalLabel, newCard } from "@/lib/srs";
import { streak } from "@/lib/stats";
import { useStore } from "@/lib/store";
import type { Grade } from "@/lib/types";

// 답마다 색을 달리한다: 다시(빨강) · 어려움(회색) · 알맞음(파랑) · 쉬움(보라)
const GRADES: { grade: Grade; label: string; tone: string }[] = [
  { grade: "again", label: "다시", tone: "var(--danger)" },
  { grade: "hard", label: "어려움", tone: "var(--ink-2)" },
  { grade: "good", label: "알맞음", tone: "var(--blue)" },
  { grade: "easy", label: "쉬움", tone: "var(--violet)" },
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
    <div className={revealed ? "pb-56" : "pb-24"}>
      <header className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div>
          <CircleLink href={exitHref} icon="close" label="복습 그만하기" />
        </div>
        <span className="text-[16px] font-semibold">복습</span>
        <span className="num text-right text-[14px] font-semibold text-ink-3">
          {pos + 1}/{queue.length}
        </span>
      </header>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-[image:var(--grad-text)] transition-all"
          style={{ width: `${(pos / queue.length) * 100}%` }}
        />
      </div>

      <article className="iris-card relative mt-5 overflow-hidden px-5 pt-5 pb-8">
        <p className="font-jp flex items-center gap-1.5 truncate text-[13px] font-medium text-ink-3">
          <Icon name="music" className="size-3.5 shrink-0" />
          {song.title}
        </p>
        {contextLine !== undefined && song.lines[contextLine] && (
          <p className="iris mt-3 rounded-2xl px-4 py-2 text-[17px] leading-[2.3]">
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
        <div className="card mt-3 px-5 py-5">
          <VocabDetail item={item} showHeading={false} />
        </div>
      )}

      <div className="pb-safe fixed inset-x-0 bottom-0 z-30">
        <div className="mx-auto max-w-xl px-4 pb-4">
          {revealed ? (
            <div className="rounded-[28px] border border-line bg-surface px-4 pt-4 pb-3 shadow-[0_-8px_30px_rgb(31_59_120/0.10)]">
              <p className="text-center text-[15px] font-semibold">
                이 단어, 어땠어요?
              </p>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {GRADES.map((g) => (
                  <button
                    key={g.grade}
                    type="button"
                    onClick={() => answer(g.grade)}
                    className="press flex flex-col items-center gap-0.5 rounded-2xl py-3"
                    style={{ color: g.tone, background: `color-mix(in srgb, ${g.tone} 10%, var(--surface))` }}
                  >
                    <span className="text-[15px] font-semibold">{g.label}</span>
                    <span className="num text-[12px] font-medium">{intervalLabel(card, g.grade, now)}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="btn-primary press flex w-full items-center justify-center py-4 text-[16px] font-semibold"
            >
              뜻 보기
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
    <div className="flex flex-col items-center pt-14 text-center">
      {empty ? (
        <IconCircle name="cards" className="size-20" />
      ) : (
        <IconCircle name="check" tone="solid" className="size-20" />
      )}
      <Headline
        className="mt-6 text-[28px]"
        first={empty ? "지금은" : "오늘 복습"}
        second={empty ? "쉬어도 돼요" : "완료했어요!"}
      />
      <p className="mt-2 text-[15px] text-ink-3">
        {empty
          ? "노래를 추가하거나 다음 복습 시간이 되면 카드가 생겨요."
          : `${songTitle ? `'${songTitle}' ` : ""}단어를 모두 복습했어요.`}
      </p>
      {!empty && (
        <div className="card mt-7 grid w-full grid-cols-2 py-5">
          <Stat className="text-[34px]" value={total} label="복습한 단어" />
          <Stat className="text-[34px]" value={days} label="일 연속" />
        </div>
      )}
      <div className="mt-7 grid w-full grid-cols-2 gap-2.5">
        <Link href="/vocab" className="btn-ghost press py-3.5 text-[15px] font-semibold">
          단어장 보기
        </Link>
        {empty ? (
          <Link href="/songs/new" className="btn-primary press py-3.5 text-[15px] font-semibold">
            노래 추가하기
          </Link>
        ) : (
          <Link href={exitHref} className="btn-primary press py-3.5 text-[15px] font-semibold">
            {exitHref === "/" ? "홈으로" : "노래로"}
          </Link>
        )}
      </div>
    </div>
  );
}
