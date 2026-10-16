"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { Icon, IconCircle } from "@/components/Icon";
import { LyricLineView } from "@/components/LyricLineView";
import { CircleLink, Headline } from "@/components/PageHeader";
import { Spinner } from "@/components/Spinner";
import { SpeakButton } from "@/components/SpeakButton";
import { VocabDetail, WordHeading } from "@/components/VocabDetail";
import { fetchExplanation } from "@/lib/api-client";
import { cardKey, cardOf, uniqueVocab } from "@/lib/cards";
import { speak } from "@/lib/speech";
import { buildQueue, EXTRA_NEW, remainingNew, reviewHref } from "@/lib/review";
import { PREVIEW } from "@/lib/preview";
import { blankAnswer, canAsk, makeChoices, pickQuizType, QUIZ_TYPES, type QuizType, readingMatches } from "@/lib/quiz";
import { graduates, intervalLabel, memoryOf, newCard } from "@/lib/srs";
import { streak } from "@/lib/stats";
import { useStore } from "@/lib/store";
import type { Grade, Song, VocabItem } from "@/lib/types";
import { useLineExplanation } from "@/lib/use-line-explanation";

// 답마다 색을 달리한다: 다시(빨강) · 이해(파랑) · 완벽(보라)
const GRADES: { grade: Grade; label: string; tone: string }[] = [
  { grade: "again", label: "다시", tone: "bg-danger-soft text-danger" },
  { grade: "good", label: "이해", tone: "bg-blue-soft text-blue" },
  { grade: "perfect", label: "완벽", tone: "bg-violet-soft text-violet" },
];

/**
 * 화면 미리보기에서 주소로 고르는 상태: 첫 문제 유형(quiz), 답을 본 상태(reveal=1 맞힘 / wrong 틀림),
 * 학습을 마친 화면(done)
 */
type Look = { quiz?: QuizType; reveal?: "right" | "wrong"; done: boolean };

function previewLook(params: URLSearchParams): Look | undefined {
  if (!PREVIEW) return undefined;
  const quiz = QUIZ_TYPES.find((t) => t.type === params.get("quiz"))?.type;
  const reveal = params.get("reveal");
  return { quiz, reveal: reveal === "wrong" ? "wrong" : reveal ? "right" : undefined, done: params.has("done") };
}

export function ReviewClient() {
  const params = useSearchParams();
  const songId = params.get("song") ?? undefined;
  const extra = Math.max(0, Number(params.get("extra")) || 0);
  const look = previewLook(params);
  return (
    <HydrationGate>
      <ReviewSession key={`${songId}:${extra}`} songId={songId} extra={extra} look={look} />
    </HydrationGate>
  );
}

function ReviewSession({ songId, extra, look }: { songId?: string; extra: number; look?: Look }) {
  const songs = useStore((s) => s.songs);
  const order = useStore((s) => s.order);
  const grade = useStore((s) => s.grade);
  // 보기(오답)로 쓸 단어: 모은 단어 전체
  const pool = useMemo(() => uniqueVocab(songs, order), [songs, order]);

  // 시작할 때의 목록을 고정한다. "다시"를 누른 카드는 뒤에 다시 붙인다.
  // 처음 배우는 단어는 '학습', 다시 보는 단어는 '복습'으로 보여 준다.
  const [{ initial, fresh }] = useState(() => {
    const { songs, order, cards, newLog, settings } = useStore.getState();
    const now = Date.now();
    const newLimit = remainingNew(settings.dailyNew + extra, newLog, now);
    const { queue } = buildQueue(songs, order, cards, now, { songId, newLimit });
    if (look?.quiz) {
      // 미리보기: 고른 유형으로 낼 수 있는 단어를 맨 앞으로 (다시 보는 단어를 먼저 고른다)
      const pool = uniqueVocab(songs, order);
      const fits = (v: VocabItem) => canAsk(look.quiz!, v, songs[v.songId], pool.length);
      const first = queue.find((v) => fits(v) && cardOf(cards, v)) ?? queue.find(fits);
      if (first) queue.splice(0, queue.length, first, ...queue.filter((v) => v !== first));
    }
    return { initial: queue.map((v) => v.id), fresh: new Set(queue.filter((v) => !cardOf(cards, v)).map((v) => v.id)) };
  });
  const [queue, setQueue] = useState(initial);
  const [pos, setPos] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [learnedCount, setLearnedCount] = useState(0);
  const [shortCount, setShortCount] = useState(0);
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
      setToast((t) => ({ n: (t?.n ?? 0) + 1, text: `${current!.item.word} · 장기기억으로 옮겼어요` }));
      // "다시"로 뒤에 붙여 둔 같은 카드도 뺀다.
      setQueue((q) => q.filter((id, i) => i <= pos || id !== currentId));
    }
    setPos((p) => p + 1);
    window.scrollTo({ top: 0 });
  }

  function answer(g: Grade) {
    const key = cardKey(current!.item);
    const before = memoryOf(useStore.getState().cards[key]);
    grade(key, g);
    const after = memoryOf(useStore.getState().cards[key]);
    const wasLearned = before === "long";
    const nowLearned = after === "long";
    if (before === "none" && after === "short") setShortCount((n) => n + 1);
    if (g === "again") setQueue((q) => [...q, currentId]);
    advance(g !== "again", nowLearned && !wasLearned);
  }

  if (look?.done) {
    return (
      <Finished total={19} learned={1} short={6} extra={extra} empty={false} studiedNew exitHref={exitHref} />
    );
  }

  return (
    <>
      {current ? (
        <ReviewCard
          key={`${currentId}:${pos}`}
          song={current.song}
          item={current.item}
          pool={pool}
          look={pos === 0 ? look : undefined}
          next={next}
          pos={pos}
          total={queue.length}
          isNew={fresh.has(currentId)}
          exitHref={exitHref}
          onAnswer={answer}
          onLearned={() => advance(true, true)}
        />
      ) : (
        <Finished
          total={doneCount}
          learned={learnedCount}
          short={shortCount}
          songTitle={songId ? songs[songId]?.title : undefined}
          songId={songId}
          extra={extra}
          empty={queue.length === 0}
          studiedNew={fresh.size > 0}
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

type Quiz =
  | { type: "recall" | "reading" }
  | { type: "choice" | "blank"; answer: string; choices: string[] };

function makeQuiz(item: VocabItem, song: Song, pool: VocabItem[], enabled: QuizType[], force?: QuizType): Quiz {
  const isNew = !cardOf(useStore.getState().cards, item);
  const type =
    force && canAsk(force, item, song, pool.length) ? force : pickQuizType(enabled, item, song, pool.length, isNew);
  if (type === "choice") {
    return { type, answer: item.word, choices: makeChoices(item, item.word, pool, (v) => v.word) };
  }
  if (type === "blank") {
    const answer = blankAnswer(item, song)!;
    return { type, answer, choices: makeChoices(item, answer, pool, (v) => v.formInSong || v.word) };
  }
  return { type };
}

const QUESTION: Record<QuizType, string> = {
  recall: "읽는 법과 뜻을 떠올려 보세요",
  choice: "이 뜻의 단어는?",
  blank: "빈칸에 들어갈 말은?",
  reading: "읽는 법을 히라가나로 써 보세요",
};

function ReviewCard({
  song,
  item,
  pool,
  look,
  next,
  pos,
  total,
  isNew,
  exitHref,
  onAnswer,
  onLearned,
}: {
  song: Song;
  item: VocabItem;
  pool: VocabItem[];
  /** 화면 미리보기에서 고른 첫 문제 상태 */
  look?: Look;
  next?: { song: Song; item: VocabItem };
  pos: number;
  /** 이번에 처음 배우는 단어인지 */
  isNew: boolean;
  total: number;
  exitHref: string;
  onAnswer: (g: Grade) => void;
  onLearned: () => void;
}) {
  const card = useStore((s) => cardOf(s.cards, item));
  const furigana = useStore((s) => s.settings.furigana);
  const quizTypes = useStore((s) => s.settings.quizTypes);
  const autoSpeak = useStore((s) => s.settings.autoSpeak);
  // 뜻을 볼 때 발음을 들려준다 (iPhone은 누른 순간에 불러야 소리가 난다)
  const sayWord = () => autoSpeak && speak(item.reading || item.word);
  const [quiz] = useState(() => makeQuiz(item, song, pool, quizTypes, look?.quiz));
  const [flipped, setFlipped] = useState(quiz.type === "recall" && !!look?.reveal);
  const [picked, setPicked] = useState<string | null>(() => {
    if (!look?.reveal || quiz.type === "recall") return null;
    if (!("choices" in quiz)) return look.reveal === "right" ? item.reading : "えっと";
    return look.reveal === "right" ? quiz.answer : (quiz.choices.find((c) => c !== quiz.answer) ?? null);
  });
  const [typed, setTyped] = useState("");
  const [now] = useState(Date.now);
  const state = card ?? newCard(now);
  const contextLine = item.lines.find((n) => song.lines[n]);
  // 앞면을 보는 동안 이 줄의 해석을 미리 받아 둔다.
  const meaning = useLineExplanation(song, contextLine);

  const revealed = quiz.type === "recall" ? flipped : picked !== null;
  const correct =
    picked === null
      ? null
      : quiz.type === "reading"
        ? readingMatches(picked, item.reading)
        : "answer" in quiz && picked === quiz.answer;

  // 다음 카드의 해석도 미리.
  const nextLine = next?.item.lines[0];
  useEffect(() => {
    if (next && nextLine !== undefined && next.song.lines[nextLine]) {
      fetchExplanation(next.song, nextLine).catch(() => {});
    }
  }, [next, nextLine]);

  // 문제 유형마다 앞면에서 가사 줄을 보여 줄지(단어 고르기는 가사에 답이 있어 숨긴다)
  const showLine = contextLine !== undefined && (revealed || quiz.type === "recall" || quiz.type === "blank");

  const memory = memoryOf(card);
  const memoryLabel = memory === "long" ? "장기기억" : memory === "short" ? "단기기억" : "새 단어";
  // 맞혔는지 따지는 문제(고르기·빈칸·읽기)를 틀렸을 때
  const wrong = revealed && correct === false;

  return (
    <div className={revealed ? "pb-60" : "pb-28"}>
      <header className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div>
          <CircleLink href={exitHref} icon="close" label="학습 그만하기" />
        </div>
        <span className="text-[16px] font-semibold">{isNew ? "새 단어 학습" : "복습"}</span>
        <span className="num text-right text-[14px] font-semibold text-ink-3">
          {pos + 1}/{total}
        </span>
      </header>
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-[image:var(--grad-text)] transition-all"
          style={{ width: `${(pos / total) * 100}%` }}
        />
      </div>

      <article className={`card mt-5 rounded-[28px] p-5 ${revealed ? "" : "pb-9"}`}>
        <p className="font-jp flex items-center gap-1.5 truncate text-[13px] font-medium text-ink-3">
          <Icon name="music" className="size-3.5 shrink-0" />
          {song.title}
        </p>
        {showLine && (
          <div className={`iris mt-3 rounded-[18px] px-4 ${revealed ? "pt-1 pb-3" : "py-1"}`}>
            <p
              className={`font-jp lyric leading-[2.3] ${
                quiz.type === "blank" && !revealed ? "text-center text-[20px]" : "text-[18px]"
              }`}
            >
              <LyricLineView
                line={song.lines[contextLine]}
                index={contextLine}
                vocab={[item]}
                focusId={item.id}
                blank={quiz.type === "blank" && !revealed}
                showFocusReading={revealed}
                furigana={furigana}
              />
            </p>
            {revealed && (
              <div className="border-t border-surface pt-2 text-[15px] leading-normal">
                {meaning.explanation ? (
                  <div className="flex items-start gap-2">
                    <p className="min-w-0 flex-1 font-medium text-ink-2">{meaning.explanation.translation}</p>
                    <SpeakButton text={song.lines[contextLine].text} label="가사 줄 듣기" className="-my-0.5 size-[30px]" tone="none" />
                  </div>
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

        {revealed ? (
          <>
            <div className="mt-6 text-center">
              {correct !== null && (
                <p
                  className={`mb-3 inline-flex h-[30px] items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold ${
                    correct ? "bg-blue-soft text-blue" : "bg-danger-soft text-danger"
                  }`}
                  role="status"
                >
                  <Icon name={correct ? "check" : "close"} className="size-4" />
                  {correct ? "정답이에요" : "아쉬워요"}
                </p>
              )}
              {quiz.type === "reading" && !correct && picked && (
                <p className="font-jp -mt-1 mb-2 text-[14px] text-ink-3">내 답: {picked}</p>
              )}
              <WordHeading item={item} size={wrong ? "md" : "card"} center />
              {/* 단어 고르기는 뜻이 문제였으니 다시 쓰지 않는다 */}
              {quiz.type !== "choice" && (
                <>
                  <p className="mt-2 text-[22px] leading-[1.35] font-bold">{item.meaning}</p>
                  <p className="mt-1.5 text-[13px] text-ink-3">
                    {item.pos}
                    {item.jlpt !== "기타" && (
                      <>
                        {" · "}
                        <span className="num">{item.jlpt}</span>
                      </>
                    )}
                    {" · "}
                    {memoryLabel}
                  </p>
                </>
              )}
            </div>
            {quiz.type !== "choice" && item.note && (
              <p className="mt-4 border-t border-line pt-3.5 text-[14px] leading-[1.6] text-pretty text-ink-2">{item.note}</p>
            )}
          </>
        ) : quiz.type === "choice" ? (
          <div className="mt-7 text-center">
            <p className="text-[14px] font-medium text-ink-3">{QUESTION.choice}</p>
            <p className="mt-2 text-[32px] leading-snug font-extrabold">{item.meaning}</p>
            <p className="mt-2 text-[13px] text-ink-3">{item.pos}</p>
          </div>
        ) : quiz.type === "blank" ? (
          <div className="mt-6 text-center">
            <p className="text-[14px] font-medium text-ink-3">{QUESTION.blank}</p>
            <p className="mt-2 text-[18px] font-bold">{item.meaning}</p>
          </div>
        ) : (
          <div className="mt-12 text-center">
            <div className="font-jp text-[52px] leading-tight font-bold">{item.word}</div>
            <p className="mt-2 text-[15px] text-ink-3">{QUESTION[quiz.type]}</p>
          </div>
        )}

        {quiz.type === "reading" && !revealed && (
          <form
            className="mt-6 flex gap-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!typed.trim()) return;
              setPicked(typed.trim());
              sayWord();
            }}
          >
            <label htmlFor="reading-answer" className="sr-only">
              읽는 법
            </label>
            <input
              id="reading-answer"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              lang="ja"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              placeholder="ひらがな"
              className="font-jp input h-[54px] min-w-0 flex-1 rounded-[18px] py-0 text-center text-[18px]"
            />
            <button
              type="submit"
              disabled={!typed.trim()}
              className="btn-primary press h-[54px] w-[76px] shrink-0 rounded-[18px] text-[15px] font-bold disabled:opacity-50"
            >
              확인
            </button>
          </form>
        )}
      </article>

      {"choices" in quiz && (
        <div className="mt-3 grid grid-cols-2 gap-2.5" role="group" aria-label="보기">
          {quiz.choices.map((c) => {
            const look = picked === null ? "idle" : c === quiz.answer ? "right" : c === picked ? "wrong" : "dim";
            return (
              <button
                key={c}
                type="button"
                disabled={picked !== null}
                onClick={() => {
                  setPicked(c);
                  sayWord();
                }}
                className={`press font-jp flex items-center justify-center gap-1.5 rounded-[22px] px-3 font-bold transition-colors ${
                  picked === null ? "h-[76px]" : "h-16"
                } ${quiz.type === "blank" ? "text-[20px]" : "text-[22px]"} ${
                  look === "right"
                    ? "border-[1.5px] border-blue bg-blue-soft text-blue"
                    : look === "wrong"
                      ? "border-[1.5px] border-danger bg-danger-soft text-danger"
                      : look === "dim"
                        ? "border border-line bg-surface text-ink-3 opacity-70"
                        : "border border-line bg-surface"
                }`}
              >
                {c}
                {look === "wrong" && <span className="font-sans text-[12px] font-semibold">내 답</span>}
                {look === "right" && <Icon name="check" className="size-4" strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
      )}

      {revealed && (
        <div className="card mt-3 px-5 py-5">
          <VocabDetail item={item} summary={false} onLearned={onLearned} />
        </div>
      )}

      <div className="pb-safe fixed inset-x-0 bottom-0 z-30">
        <div className={`mx-auto max-w-xl pb-[22px] ${revealed ? "px-3" : "px-5"}`}>
          {wrong ? (
            <div className="rounded-[30px] border border-line bg-surface px-3.5 pt-4 pb-3.5 shadow-[0_-8px_30px_rgb(31_59_120/0.10)]">
              <p className="text-center text-[14px] text-ink-3">틀린 단어는 잠시 뒤에 다시 나와요.</p>
              <button
                type="button"
                onClick={() => onAnswer("again")}
                className="btn-primary press mt-3 flex h-[54px] w-full items-center justify-center text-[16px] font-bold"
              >
                다음
              </button>
            </div>
          ) : revealed ? (
            <div className="rounded-[30px] border border-line bg-surface px-3.5 pt-4 pb-3.5 shadow-[0_-8px_30px_rgb(31_59_120/0.10)]">
              <p className="text-center text-[15px] font-bold">이 단어, 어땠어요?</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {GRADES.map((g) => (
                  <button
                    key={g.grade}
                    type="button"
                    onClick={() => onAnswer(g.grade)}
                    className={`press flex h-[60px] flex-col items-center justify-center gap-px rounded-[18px] ${g.tone}`}
                  >
                    <span className="text-[16px] font-bold">{g.label}</span>
                    <span className="num text-[12px] font-medium">
                      {graduates(state, g.grade, now) ? "장기기억으로" : intervalLabel(state, g.grade, now)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : quiz.type === "recall" ? (
            <button
              type="button"
              onClick={() => {
                setFlipped(true);
                sayWord();
              }}
              className="btn-primary press flex h-14 w-full items-center justify-center text-[16px] font-bold"
            >
              뜻 보기
            </button>
          ) : quiz.type !== "reading" ? null : (
            <button
              type="button"
              onClick={() => {
                setPicked("");
                sayWord();
              }}
              className="press flex h-[52px] w-full items-center justify-center rounded-full border border-line bg-surface text-[15px] font-semibold text-ink-2"
            >
              모르겠어요
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
  short,
  songTitle,
  songId,
  extra,
  empty,
  studiedNew,
  exitHref,
}: {
  total: number;
  learned: number;
  short: number;
  /** 새 단어가 있었으면 '학습', 다시 보는 단어만 있었으면 '복습' */
  studiedNew: boolean;
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
    <div className="flex flex-col items-center pt-[72px] pb-32 text-center">
      {empty ? (
        <IconCircle name="cards" className="size-[76px]" />
      ) : (
        <span className="grid size-[76px] place-items-center rounded-full bg-btn text-white">
          <Icon name="check" className="size-9" strokeWidth={2.5} />
        </span>
      )}
      <Headline
        className="mt-6 text-[30px]"
        first={empty ? "지금은" : studiedNew ? "오늘 학습" : "오늘 복습"}
        second={empty ? "쉬어도 돼요" : "완료했어요!"}
      />
      <p className="mt-2.5 text-[15px] text-ink-3">
        {empty
          ? freshLeft > 0
            ? `오늘 배울 새 단어 ${dailyNew}개를 다 배웠어요.`
            : "노래를 추가하거나 다시 볼 때가 되면 단어가 생겨요."
          : songTitle
            ? `'${songTitle}' 단어를 모두 ${studiedNew ? "학습" : "복습"}했어요.`
            : `오늘 몫의 단어를 모두 ${studiedNew ? "학습" : "복습"}했어요.`}
      </p>
      {!empty && (
        <div className="card mt-8 w-full p-5">
          <p className="flex items-baseline justify-center gap-1">
            <span className="num text-[56px] leading-none font-medium tracking-[-0.04em]">{total}</span>
            <span className="text-[16px] font-bold text-ink-2">개 {studiedNew ? "학습" : "복습"}</span>
          </p>
          <div className="mt-[18px] grid grid-cols-3 divide-x divide-line border-t border-line pt-4">
            {(
              [
                [short, "새 단기기억", ""],
                [learned, "새 장기기억", ""],
                [days, "일 연속", "text-pink"],
              ] as const
            ).map(([n, label, tone]) => (
              <div key={label}>
                <p className={`num text-[24px] leading-none font-medium ${tone}`}>{n}</p>
                <p className="mt-1.5 text-[13px] text-ink-3">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-30">
        <div className="mx-auto grid max-w-xl grid-cols-[1fr_1.4fr] gap-2.5 px-5 pb-[30px]">
          {more > 0 ? (
            <>
              <Link href={exitHref} className={GHOST}>
                {exitLabel}
              </Link>
              <Link href={reviewHref(songId, extra + EXTRA_NEW)} replace className={PRIMARY}>
                새 단어 {more}개 더
              </Link>
            </>
          ) : (
            <>
              <Link href="/vocab" className={GHOST}>
                단어장 보기
              </Link>
              <Link href={empty ? "/songs/new" : exitHref} className={PRIMARY}>
                {empty ? "노래 추가하기" : exitLabel}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const GHOST =
  "press grid h-[54px] place-items-center rounded-full border border-line bg-surface text-[15px] font-semibold text-ink-2";
const PRIMARY = "btn-primary press grid h-[54px] place-items-center text-[15px] font-bold";
