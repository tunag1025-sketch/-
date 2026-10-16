"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { Icon } from "@/components/Icon";
import { LyricLineView } from "@/components/LyricLineView";
import { VocabDetail, WordHeading } from "@/components/VocabDetail";
import { buildQueue } from "@/lib/review";
import { intervalLabel, newCard } from "@/lib/srs";
import { useStore } from "@/lib/store";
import type { Grade } from "@/lib/types";

const GRADES: { grade: Grade; label: string; className: string }[] = [
  { grade: "again", label: "다시", className: "bg-accent-soft text-accent" },
  { grade: "hard", label: "어려움", className: "bg-hard-soft text-hard" },
  { grade: "good", label: "알맞음", className: "bg-good-soft text-good" },
  { grade: "easy", label: "쉬움", className: "bg-surface-2 text-ink-2" },
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

  if (!currentId || !item || !song) {
    return <Finished total={doneCount} songTitle={songTitle} empty={queue.length === 0} />;
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
    <div className="pt-4">
      <header className="mb-4 flex items-center justify-between text-sm text-ink-3">
        <Link href={songId ? `/songs/${songId}` : "/"} className="-ml-2 rounded-full p-2 hover:bg-surface-2" aria-label="나가기">
          <Icon name="close" />
        </Link>
        <span>
          {pos + 1} / {queue.length}
        </span>
      </header>
      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(pos / queue.length) * 100}%` }} />
      </div>

      <article className="rounded-3xl border border-line bg-surface px-5 py-6">
        <p className="font-jp mb-4 text-xs font-semibold text-accent">♪ {song.title}</p>
        {contextLine !== undefined && song.lines[contextLine] && (
          <p className="mb-6 text-[18px] leading-[2.3]">
            <LyricLineView
              line={song.lines[contextLine]}
              index={contextLine}
              vocab={[item]}
              focusId={item.id}
              furigana={furigana}
            />
          </p>
        )}
        <div className="text-center">
          {revealed ? (
            <WordHeading item={item} />
          ) : (
            <div className="font-jp text-4xl font-bold">{item.word}</div>
          )}
        </div>
      </article>

      {revealed && (
        <div className="mt-4 rounded-3xl border border-line bg-surface px-5 py-5">
          <VocabDetail item={item} showHeading={false} />
        </div>
      )}

      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto max-w-xl px-4 py-3">
          {revealed ? (
            <div className="grid grid-cols-4 gap-2">
              {GRADES.map((g) => (
                <button
                  key={g.grade}
                  type="button"
                  onClick={() => answer(g.grade)}
                  className={`rounded-2xl px-1 py-3 text-center ${g.className}`}
                >
                  <div className="text-[15px] font-bold">{g.label}</div>
                  <div className="text-[11px] opacity-80">{intervalLabel(card, g.grade, now)}</div>
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="w-full rounded-2xl bg-ink px-4 py-4 text-base font-bold text-bg"
            >
              뜻 보기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Finished({ total, songTitle, empty }: { total: number; songTitle?: string; empty: boolean }) {
  return (
    <div className="pt-24 text-center">
      <div className="text-5xl">{empty ? "🎵" : "🎉"}</div>
      <h1 className="mt-4 text-xl font-bold">{empty ? "지금 복습할 단어가 없어요" : "오늘 복습 끝!"}</h1>
      <p className="mt-1 text-sm text-ink-3">
        {empty
          ? "노래를 추가하거나, 다음 복습 시간이 되면 여기에 카드가 생겨요."
          : `${songTitle ? `'${songTitle}' ` : ""}단어 ${total}개를 복습했어요.`}
      </p>
      <Link href="/" className="mt-6 inline-block rounded-full bg-accent px-6 py-3 font-semibold text-accent-ink">
        홈으로
      </Link>
    </div>
  );
}
