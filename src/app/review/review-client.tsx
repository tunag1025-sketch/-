"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { Icon, IconCircle } from "@/components/Icon";
import { LyricLineView } from "@/components/LyricLineView";
import { CircleLink, Headline } from "@/components/PageHeader";
import { Spinner } from "@/components/Spinner";
import { Stat } from "@/components/Stat";
import { VocabDetail, WordHeading } from "@/components/VocabDetail";
import { fetchExplanation } from "@/lib/api-client";
import { buildQueue, EXTRA_NEW, remainingNew, reviewHref } from "@/lib/review";
import { graduates, intervalLabel, newCard } from "@/lib/srs";
import { streak } from "@/lib/stats";
import { useStore } from "@/lib/store";
import type { Grade, Song, VocabItem } from "@/lib/types";
import { useLineExplanation } from "@/lib/use-line-explanation";

// 답마다 색을 달리한다: 다시(빨강) · 이해(파랑) · 완벽(보라)
const GRADES: { grade: Grade; label: string; tone: string }[] = [
  { grade: "again", label: "다시", tone: "var(--danger)" },
  { grade: "good", label: "이해", tone: "var(--blue)" },
  { grade: "perfect", label: "완벽", tone: "var(--violet)" },
];

export function ReviewClient() {
  const params = useSearchParams();
  const songId = params.get("song") ?? undefined;
  const extra = Math.max(0, Number(params.get("extra")) || 0);
  return (
    <HydrationGate>
      <ReviewSession key={`${songId}:${extra}`} songId={songId} extra={extra} />
    </HydrationGate>
  );
}

function ReviewSession({ songId, extra }: { songId?: string; extra: number }) {
  const songs = useStore((s) => s.songs);
  const grade = useStore((s) => s.grade);

  // 시작할 때의 목록을 고정한다. "다시"를 누른 카드는 뒤에 다시 붙인다.
  const [queue, setQueue] = useState(() => {
    const { songs, order, cards, newLog, settings } = useStore.getState();
    const now = Date.now();
    const newLimit = remainingNew(settings.dailyNew + extra, newLog, now);
    return buildQueue(songs, order, cards, now, { songId, newLimit }).queue.map((v) => v.id);
  });
  const [pos, setPos] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [learnedCount, setLearnedCount] = useState(0);
  const [toast, setToast] = useState<{ n: number; text: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const currentId = queue[pos];
  const findItem = (id: string | undefined) => {
    const song = id ? songs[id.split(":")[0]] : undefined;
    const item = song?.vocab.find((v) => v.id === id);
    return song && item ? { song, item } : undefined;
  };
  const current = findItem(currentId);
  const next = findItem(queue[pos + 1]);
  const exitHref = songId ? `/songs/${songId}` : "/";

  function advance(done: boolean, learned: boolean) {
    if (done) setDoneCount((n) => n + 1);
    if (learned) {
      setLearnedCount((n) => n + 1);
      setToast((t) => ({ n: (t?.n ?? 0) + 1, text: `${current!.item.word} · 외운 단어로 옮겼어요` }));
      // "다시"로 뒤에 붙여 둔 같은 카드도 뺀다.
      setQueue((q) => q.filter((id, i) => i <= pos || id !== currentId));
    }
    setPos((p) => p + 1);
    window.scrollTo({ top: 0 });
  }

  function answer(g: Grade) {
    const wasLearned = useStore.getState().cards[currentId]?.learned === true;
    grade(currentId, g);
    const nowLearned = useStore.getState().cards[currentId]?.learned === true;
    if (g === "again") setQueue((q) => [...q, currentId]);
    advance(g !== "again", nowLearned && !wasLearned);
  }

  return (
    <>
      {current ? (
        <ReviewCard
          key={`${currentId}:${pos}`}
          song={current.song}
          item={current.item}
          next={next}
          pos={pos}
          total={queue.length}
          exitHref={exitHref}
          onAnswer={answer}
          onLearned={() => advance(true, true)}
        />
      ) : (
        <Finished
          total={doneCount}
          learned={learnedCount}
          songTitle={songId ? songs[songId]?.title : undefined}
          songId={songId}
          extra={extra}
          empty={queue.length === 0}
          exitHref={exitHref}
        />
      )}
      {toast && (
        <div className="pt-safe pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4" role="status">
          <p
            key={toast.n}
            className="font-jp mt-3 flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[14px] font-semibold text-bg shadow-lg"
          >
            <Icon name="check" className="size-4" />
            {toast.text}
          </p>
        </div>
      )}
    </>
  );
}

function ReviewCard({
  song,
  item,
  next,
  pos,
  total,
  exitHref,
  onAnswer,
  onLearned,
}: {
  song: Song;
  item: VocabItem;
  next?: { song: Song; item: VocabItem };
  pos: number;
  total: number;
  exitHref: string;
  onAnswer: (g: Grade) => void;
  onLearned: () => void;
}) {
  const card = useStore((s) => s.cards[item.id]);
  const furigana = useStore((s) => s.settings.furigana);
  const [revealed, setRevealed] = useState(false);
  const [now] = useState(Date.now);
  const state = card ?? newCard(now);
  const contextLine = song.lines[item.lines[0]] ? item.lines[0] : undefined;
  // 앞면을 보는 동안 이 줄의 해석을 미리 받아 둔다.
  const meaning = useLineExplanation(song, contextLine);

  // 다음 카드의 해석도 미리.
  const nextLine = next?.item.lines[0];
  useEffect(() => {
    if (next && nextLine !== undefined && next.song.lines[nextLine]) {
      fetchExplanation(next.song, nextLine).catch(() => {});
    }
  }, [next, nextLine]);

  return (
    <div className={revealed ? "pb-56" : "pb-24"}>
      <header className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div>
          <CircleLink href={exitHref} icon="close" label="복습 그만하기" />
        </div>
        <span className="text-[16px] font-semibold">복습</span>
        <span className="num text-right text-[14px] font-semibold text-ink-3">
          {pos + 1}/{total}
        </span>
      </header>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-[image:var(--grad-text)] transition-all"
          style={{ width: `${(pos / total) * 100}%` }}
        />
      </div>

      <article className="iris-card mt-5 px-5 pt-5 pb-8">
        <p className="font-jp flex items-center gap-1.5 truncate text-[13px] font-medium text-ink-3">
          <Icon name="music" className="size-3.5 shrink-0" />
          {song.title}
        </p>
        {contextLine !== undefined && (
          <div className="iris mt-3 rounded-2xl px-4 py-2">
            <p className="text-[17px] leading-[2.3]">
              <LyricLineView
                line={song.lines[contextLine]}
                index={contextLine}
                vocab={[item]}
                focusId={item.id}
                furigana={furigana}
              />
            </p>
            {revealed && (
              <div className="mb-1.5 border-t border-surface pt-2 text-[15px] leading-relaxed">
                {meaning.explanation ? (
                  <p className="font-medium text-ink-2">{meaning.explanation.translation}</p>
                ) : meaning.error ? (
                  <p className="text-ink-3">
                    해석을 불러오지 못했어요.{" "}
                    <button type="button" onClick={meaning.retry} className="font-semibold text-blue">
                      다시 시도
                    </button>
                  </p>
                ) : (
                  <p className="flex items-center gap-2 text-ink-3">
                    <Spinner className="size-3.5" /> 이 줄의 해석을 불러오는 중…
                  </p>
                )}
              </div>
            )}
          </div>
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
          <VocabDetail item={item} showHeading={false} onLearned={onLearned} />
        </div>
      )}

      <div className="pb-safe fixed inset-x-0 bottom-0 z-30">
        <div className="mx-auto max-w-xl px-4 pb-4">
          {revealed ? (
            <div className="rounded-[28px] border border-line bg-surface px-4 pt-4 pb-3 shadow-[0_-8px_30px_rgb(31_59_120/0.10)]">
              <p className="text-center text-[15px] font-semibold">이 단어, 어땠어요?</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {GRADES.map((g) => (
                  <button
                    key={g.grade}
                    type="button"
                    onClick={() => onAnswer(g.grade)}
                    className="press flex flex-col items-center gap-0.5 rounded-2xl py-3"
                    style={{ color: g.tone, background: `color-mix(in srgb, ${g.tone} 10%, var(--surface))` }}
                  >
                    <span className="text-[16px] font-semibold">{g.label}</span>
                    <span className="num text-[12px] font-medium">
                      {graduates(state, g.grade, now) ? "외운 단어로" : intervalLabel(state, g.grade, now)}
                    </span>
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
  learned,
  songTitle,
  songId,
  extra,
  empty,
  exitHref,
}: {
  total: number;
  learned: number;
  songTitle?: string;
  songId?: string;
  extra: number;
  empty: boolean;
  exitHref: string;
}) {
  const reviewLog = useStore((s) => s.reviewLog);
  const dailyNew = useStore((s) => s.settings.dailyNew);
  const [now] = useState(Date.now);
  const days = streak(reviewLog, now);
  // 오늘 몫을 다 배웠어도 아직 안 배운 단어가 남았으면 더 학습할 수 있게 한다.
  const [freshLeft] = useState(() => {
    const { songs, order, cards } = useStore.getState();
    return buildQueue(songs, order, cards, now, { songId, newLimit: 0 }).freshTotal;
  });
  const more = Math.min(EXTRA_NEW, freshLeft);
  const exitLabel = exitHref === "/" ? "홈으로" : "노래로";

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
          ? freshLeft > 0
            ? `오늘 배울 새 단어 ${dailyNew}개를 다 배웠어요.`
            : "노래를 추가하거나 다음 복습 시간이 되면 단어가 생겨요."
          : `${songTitle ? `'${songTitle}' ` : ""}단어를 모두 복습했어요.`}
      </p>
      {!empty && (
        <div className="card mt-7 grid w-full grid-cols-3 py-5">
          <Stat className="text-[34px]" value={total} label="복습한 단어" />
          <Stat className="text-[34px]" value={learned} label="새로 외운 단어" />
          <Stat className="text-[34px]" value={days} label="일 연속" />
        </div>
      )}
      <div className="mt-7 grid w-full grid-cols-2 gap-2.5">
        {more > 0 ? (
          <>
            <Link href={exitHref} className="btn-ghost press py-3.5 text-[15px] font-semibold">
              {exitLabel}
            </Link>
            <Link
              href={reviewHref(songId, extra + EXTRA_NEW)}
              replace
              className="btn-primary press py-3.5 text-[15px] font-semibold"
            >
              새 단어 {more}개 더
            </Link>
          </>
        ) : (
          <>
            <Link href="/vocab" className="btn-ghost press py-3.5 text-[15px] font-semibold">
              단어장 보기
            </Link>
            <Link
              href={empty ? "/songs/new" : exitHref}
              className="btn-primary press py-3.5 text-[15px] font-semibold"
            >
              {empty ? "노래 추가하기" : exitLabel}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
