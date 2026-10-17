"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { Icon } from "@/components/Icon";
import { LyricLineView } from "@/components/LyricLineView";
import { Spinner } from "@/components/Spinner";
import { SpeakButton } from "@/components/SpeakButton";
import { VocabDetail, WordHeading } from "@/components/VocabDetail";
import { fetchExplanation } from "@/lib/api-client";
import { cardKey, cardOf, uniqueVocab } from "@/lib/cards";
import { uniqueGrammar } from "@/lib/grammar";
import { speak } from "@/lib/speech";
import {
  buildQueue,
  EXTRA_NEW,
  mixQueue,
  type QueueEntry,
  remainingNew,
  reviewHref,
  WEAK_LIMIT,
  weakWords,
} from "@/lib/review";
import { PREVIEW } from "@/lib/preview";
import { blankAnswer, canAsk, makeChoices, pickQuizType, QUIZ_TYPES, type QuizType, readingMatches } from "@/lib/quiz";
import { memoryOf, newCard } from "@/lib/srs";
import { useStore } from "@/lib/store";
import type { Grade, Song, VocabItem } from "@/lib/types";
import { useLineExplanation } from "@/lib/use-line-explanation";
import { GrammarCard } from "./grammar-card";
import { KanjiSession } from "./kanji-session";
import { BottomBar, Finished, GradeSheet, SessionHeader, Toast, useStudySession, WrongSheet } from "./parts";

/**
 * 화면 미리보기에서 주소로 고르는 상태: 첫 문제 유형(quiz, grammar면 문형 카드),
 * 답을 본 상태(reveal=1 맞힘 / wrong 틀림), 학습을 마친 화면(done)
 */
type Look = { quiz?: QuizType; grammar: boolean; reveal?: "right" | "wrong"; done: boolean };

function previewLook(params: URLSearchParams): Look | undefined {
  if (!PREVIEW) return undefined;
  const quiz = QUIZ_TYPES.find((t) => t.type === params.get("quiz"))?.type;
  const reveal = params.get("reveal");
  return {
    quiz,
    grammar: params.get("quiz") === "grammar",
    reveal: reveal === "wrong" ? "wrong" : reveal ? "right" : undefined,
    done: params.has("done"),
  };
}

export function ReviewClient() {
  const params = useSearchParams();
  const songId = params.get("song") ?? undefined;
  const extra = Math.max(0, Number(params.get("extra")) || 0);
  const kind = params.get("kind");
  const look = previewLook(params);
  return (
    <HydrationGate>
      {kind === "kanji" ? (
        <KanjiSession />
      ) : (
        <ReviewSession
          key={`${kind}:${songId}:${extra}`}
          songId={songId}
          extra={extra}
          weak={kind === "weak"}
          look={look}
        />
      )}
    </HydrationGate>
  );
}

function ReviewSession({
  songId,
  extra,
  weak,
  look,
}: {
  songId?: string;
  extra: number;
  /** 자주 틀린 단어만 */
  weak: boolean;
  look?: Look;
}) {
  const songs = useStore((s) => s.songs);
  const order = useStore((s) => s.order);
  // 보기(오답)로 쓸 단어·문형: 모은 것 전체
  const pool = useMemo(() => uniqueVocab(songs, order), [songs, order]);
  const grammarPool = useMemo(() => uniqueGrammar(songs, order), [songs, order]);

  // 시작할 때의 목록을 고정한다. "다시"를 누른 카드는 뒤에 다시 붙인다.
  // 처음 배우는 카드는 '학습', 다시 보는 카드는 '복습'으로 보여 준다. 노래·가사 순서대로 외우지 않게 순서를 섞는다.
  const [entries] = useState<QueueEntry[]>(() => {
    const { songs, order, cards, newLog, settings } = useStore.getState();
    const now = Date.now();
    if (weak) {
      return mixQueue(
        weakWords(songs, order, cards)
          .slice(0, WEAK_LIMIT)
          .map((v) => ({ kind: "word", id: v.id, key: cardKey(v), item: v })),
      );
    }
    const newLimit = remainingNew(settings.dailyNew + extra, newLog, now);
    const queue = mixQueue(buildQueue(songs, order, cards, now, { songId, newLimit }).queue);
    // 미리보기: 고른 유형으로 낼 수 있는 카드를 맨 앞으로 (다시 보는 카드를 먼저 고른다)
    const vocabCount = uniqueVocab(songs, order).length;
    const fits = look?.grammar
      ? (e: QueueEntry) => e.kind === "grammar"
      : look?.quiz
        ? (e: QueueEntry) => e.kind === "word" && canAsk(look.quiz!, e.item, songs[e.item.songId], vocabCount)
        : null;
    if (fits) {
      const first = queue.find((e) => fits(e) && cards[e.key]) ?? queue.find(fits);
      if (first) queue.splice(0, queue.length, first, ...queue.filter((e) => e !== first));
    }
    return queue;
  });
  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);
  const session = useStudySession({
    initial: entries.map((e) => e.id),
    keyOf: (id) => byId.get(id)?.key ?? id,
    nameOf: (id) => {
      const e = byId.get(id);
      return !e ? "" : e.kind === "word" ? e.item.word : e.item.pattern;
    },
  });
  const { queue, pos, stats } = session;
  const wordOf = (e: QueueEntry | undefined) =>
    e?.kind === "word" && songs[e.item.songId] ? { song: songs[e.item.songId], item: e.item } : undefined;
  const entry = session.current ? byId.get(session.current) : undefined;
  const grammar = entry?.kind === "grammar" ? entry.item : undefined;
  const current = wordOf(entry);
  const next = wordOf(session.next ? byId.get(session.next) : undefined);
  const exitHref = songId ? `/songs/${songId}` : "/";
  // 오늘 몫을 다 배웠어도 아직 안 배운 단어가 남았으면 더 학습할 수 있게 한다.
  const finished = !current && !grammar;
  const [now] = useState(Date.now);
  const more = useMemo(() => {
    if (!finished || weak) return null;
    const { songs, order, cards } = useStore.getState();
    const left = buildQueue(songs, order, cards, now, { songId, newLimit: 0 }).freshTotal;
    return left > 0 ? { href: reviewHref(songId, extra + EXTRA_NEW), label: `새 단어 ${Math.min(EXTRA_NEW, left)}개 더` } : null;
  }, [finished, weak, songId, extra, now]);
  const dailyNew = useStore((s) => s.settings.dailyNew);

  if (look?.done) {
    return (
      <Finished
        total={19}
        learned={1}
        short={6}
        studiedNew
        empty={false}
        emptyText=""
        exitHref={exitHref}
        more={{ href: reviewHref(undefined, EXTRA_NEW), label: `새 단어 ${EXTRA_NEW}개 더` }}
      />
    );
  }

  return (
    <>
      {grammar ? (
        <GrammarCard
          key={`${session.current}:${pos}`}
          item={grammar}
          pool={grammarPool}
          pos={pos}
          total={queue.length}
          isNew={session.fresh.has(session.current)}
          exitHref={exitHref}
          onAnswer={session.answer}
          onLearned={session.markedLearned}
        />
      ) : current ? (
        <ReviewCard
          key={`${session.current}:${pos}`}
          song={current.song}
          item={current.item}
          pool={pool}
          look={pos === 0 ? look : undefined}
          next={next}
          pos={pos}
          total={queue.length}
          isNew={session.fresh.has(session.current)}
          exitHref={exitHref}
          onAnswer={session.answer}
          onLearned={session.markedLearned}
        />
      ) : (
        <Finished
          total={stats.done}
          learned={stats.learned}
          short={stats.short}
          songTitle={songId ? songs[songId]?.title : weak ? "자주 틀린 단어" : undefined}
          empty={queue.length === 0}
          emptyText={
            weak
              ? "자주 틀린 단어가 없어요. 잘하고 있어요!"
              : more
                ? `오늘 배울 새 단어 ${dailyNew}개를 다 배웠어요.`
                : "노래를 추가하거나 다시 볼 때가 되면 단어가 생겨요."
          }
          studiedNew={session.fresh.size > 0}
          exitHref={weak ? "/study" : exitHref}
          more={more}
        />
      )}
      <Toast toast={session.toast} />
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
      <SessionHeader exitHref={exitHref} title={isNew ? "새 단어 학습" : "복습"} pos={pos} total={total} />

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

      {wrong ? (
        <WrongSheet onNext={() => onAnswer("again")} />
      ) : revealed ? (
        <GradeSheet state={state} now={now} onAnswer={onAnswer} />
      ) : quiz.type === "recall" ? (
        <BottomBar>
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
        </BottomBar>
      ) : quiz.type === "reading" ? (
        <BottomBar>
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
        </BottomBar>
      ) : null}
    </div>
  );
}
