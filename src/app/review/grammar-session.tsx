"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { LyricLineRange, patternRange } from "@/components/LyricLineView";
import { SpeakButton } from "@/components/SpeakButton";
import { Spinner } from "@/components/Spinner";
import { buildDeck, grammarKey } from "@/lib/cards";
import { GRAMMAR_NEW_PER_SESSION, type GrammarItem, patternCore, uniqueGrammar } from "@/lib/grammar";
import { grammarHref } from "@/lib/review";
import { memoryOf, newCard } from "@/lib/srs";
import { useStore } from "@/lib/store";
import type { Grade } from "@/lib/types";
import { useLineExplanation } from "@/lib/use-line-explanation";
import { BottomBar, Finished, GradeSheet, SessionHeader, Toast, useStudySession, WrongSheet } from "./parts";

/** 노래에서 나온 문형을 간격 반복으로 복습한다. songId를 주면 그 노래 문형만. */
export function GrammarSession({ songId }: { songId?: string }) {
  const songs = useStore((s) => s.songs);
  const order = useStore((s) => s.order);
  // 보기로 쓸 문형: 모은 문형 전체
  const pool = useMemo(() => uniqueGrammar(songs, order), [songs, order]);
  const [{ initial, items }] = useState(() => {
    const { songs, order, cards } = useStore.getState();
    const list = uniqueGrammar(songs, order, songId);
    const { queue } = buildDeck(
      list.map((g) => g.key),
      cards,
      Date.now(),
      GRAMMAR_NEW_PER_SESSION,
    );
    return { initial: queue, items: Object.fromEntries(list.map((g) => [g.key, g])) as Record<string, GrammarItem> };
  });
  const session = useStudySession({
    initial,
    keyOf: (key) => key,
    nameOf: (key) => items[key]?.pattern ?? "",
    countNew: false,
  });
  const current = session.current ? items[session.current] : undefined;
  const exitHref = songId ? `/songs/${songId}` : "/study";

  const finished = !current;
  const [now] = useState(Date.now);
  const freshLeft = useMemo(() => {
    if (!finished) return 0;
    const { songs, order, cards } = useStore.getState();
    const keys = uniqueGrammar(songs, order, songId).map((g) => g.key);
    return buildDeck(keys, cards, now, 0).freshTotal;
  }, [finished, songId, now]);

  return (
    <>
      {current ? (
        <GrammarCard
          key={`${session.current}:${session.pos}`}
          item={current}
          pool={pool}
          pos={session.pos}
          total={session.queue.length}
          isNew={session.fresh.has(session.current)}
          exitHref={exitHref}
          onAnswer={session.answer}
          onLearned={session.markedLearned}
        />
      ) : (
        <Finished
          unit="문법"
          total={session.stats.done}
          learned={session.stats.learned}
          short={session.stats.short}
          songTitle={songId ? songs[songId]?.title : undefined}
          empty={session.queue.length === 0}
          emptyText={
            pool.length === 0
              ? "노래를 추가하면 가사 속 문법이 모여요."
              : "지금 복습할 문법이 없어요. 다시 볼 때가 되면 생겨요."
          }
          studiedNew={session.fresh.size > 0}
          exitHref={exitHref}
          more={
            freshLeft > 0
              ? { href: grammarHref(songId), label: `새 문법 ${Math.min(GRAMMAR_NEW_PER_SESSION, freshLeft)}개 더` }
              : null
          }
        />
      )}
      <Toast toast={session.toast} />
    </>
  );
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Quiz = { type: "recall" } | { type: "blank"; answer: string; choices: string[] };

/** 다시 보는 문형은 가사 빈칸에서 고르기, 처음 보는 문형은 뜻 떠올리기 */
function makeQuiz(item: GrammarItem, pool: GrammarItem[], isNew: boolean): Quiz {
  const line = item.song.lines[item.line];
  const range = line ? patternRange(item.pattern, line.text) : null;
  if (isNew || !line || !range) return { type: "recall" };
  const answer = line.text.slice(range[0], range[1]);
  const others = [
    ...new Set(pool.filter((g) => g.key !== item.key).map((g) => patternCore(g.pattern))),
  ].filter((c) => c && c !== answer && !/[가-힣]/.test(c));
  if (others.length < 3) return { type: "recall" };
  return { type: "blank", answer, choices: shuffle([answer, ...shuffle(others).slice(0, 3)]) };
}

function GrammarCard({
  item,
  pool,
  pos,
  total,
  isNew,
  exitHref,
  onAnswer,
  onLearned,
}: {
  item: GrammarItem;
  pool: GrammarItem[];
  pos: number;
  total: number;
  isNew: boolean;
  exitHref: string;
  onAnswer: (g: Grade) => void;
  onLearned: () => void;
}) {
  const card = useStore((s) => s.cards[item.key]);
  const setLearned = useStore((s) => s.setLearned);
  const furigana = useStore((s) => s.settings.furigana);
  const [now] = useState(Date.now);
  const [quiz] = useState(() => makeQuiz(item, pool, isNew));
  const [flipped, setFlipped] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const line = item.song.lines[item.line];
  const range = line ? patternRange(item.pattern, line.text) : null;
  const meaning = useLineExplanation(item.song, line ? item.line : undefined);
  const revealed = quiz.type === "recall" ? flipped : picked !== null;
  const correct = quiz.type === "blank" && picked !== null ? picked === quiz.answer : null;
  const memory = memoryOf(card);
  // 같은 문형이 나오는 다른 노래
  const alsoIn = useMemo(() => {
    const { songs, order } = useStore.getState();
    return order
      .map((id) => songs[id])
      .filter((s) => s && s.id !== item.song.id && s.grammar.some((g) => grammarKey(g.pattern) === item.key));
  }, [item]);

  return (
    <div className={revealed ? "pb-60" : "pb-28"}>
      <SessionHeader exitHref={exitHref} title={isNew ? "새 문법 학습" : "문법 복습"} pos={pos} total={total} />

      <article className={`card mt-5 rounded-[28px] p-5 ${revealed ? "" : "pb-9"}`}>
        <p className="font-jp flex items-center gap-1.5 truncate text-[13px] font-medium text-ink-3">
          <Icon name="music" className="size-3.5 shrink-0" />
          {item.song.title}
        </p>
        {line && (
          <div className={`iris mt-3 rounded-[18px] px-4 ${revealed ? "pt-1 pb-3" : "py-1"}`}>
            <p className={`font-jp lyric leading-[2.3] ${quiz.type === "blank" && !revealed ? "text-center text-[20px]" : "text-[18px]"}`}>
              <LyricLineRange line={line} range={range} furigana={furigana} blank={quiz.type === "blank" && !revealed} />
            </p>
            {revealed && (
              <div className="border-t border-surface pt-2 text-[15px] leading-normal">
                {meaning.explanation ? (
                  <div className="flex items-start gap-2">
                    <p className="min-w-0 flex-1 font-medium text-ink-2">{meaning.explanation.translation}</p>
                    <SpeakButton text={line.text} label="가사 줄 듣기" className="-my-0.5 size-[30px]" tone="none" />
                  </div>
                ) : meaning.error ? (
                  <p className="text-ink-3">해석을 불러오지 못했어요.</p>
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
              <p className="font-jp text-[32px] leading-tight font-bold text-blue">{item.pattern}</p>
              <p className="mt-2 text-[22px] leading-[1.35] font-bold">{item.meaning}</p>
              <p className="mt-1.5 text-[13px] text-ink-3">
                문법 · {memory === "long" ? "장기기억" : memory === "short" ? "단기기억" : "새 문법"}
              </p>
            </div>
            {item.explanation && (
              <p className="mt-4 border-t border-line pt-3.5 text-[14px] leading-[1.6] text-pretty text-ink-2">
                {item.explanation}
              </p>
            )}
            {alsoIn.length > 0 && (
              <p className="mt-3 text-[13px] leading-relaxed text-ink-3">
                <span className="font-jp font-semibold text-ink-2">{alsoIn.map((s) => `「${s.title}」`).join(" ")}</span>
                에도 나와요.
              </p>
            )}
          </>
        ) : quiz.type === "blank" ? (
          <div className="mt-6 text-center">
            <p className="text-[14px] font-medium text-ink-3">빈칸에 들어갈 문형은?</p>
            <p className="mt-2 text-[18px] font-bold">{item.meaning}</p>
          </div>
        ) : (
          <div className="mt-10 text-center">
            <p className="font-jp text-[44px] leading-tight font-bold text-blue">{item.pattern}</p>
            <p className="mt-2 text-[15px] text-ink-3">이 문형의 뜻을 떠올려 보세요</p>
          </div>
        )}
      </article>

      {quiz.type === "blank" && (
        <div className="mt-3 grid grid-cols-2 gap-2.5" role="group" aria-label="보기">
          {quiz.choices.map((c) => {
            const look = picked === null ? "idle" : c === quiz.answer ? "right" : c === picked ? "wrong" : "dim";
            return (
              <button
                key={c}
                type="button"
                disabled={picked !== null}
                onClick={() => setPicked(c)}
                className={`press font-jp flex items-center justify-center gap-1.5 rounded-[22px] px-3 text-[20px] font-bold transition-colors ${
                  picked === null ? "h-[76px]" : "h-16"
                } ${
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

      {revealed && memory !== "long" && (
        <button
          type="button"
          onClick={() => {
            setLearned(item.key, true, { countNew: false });
            onLearned();
          }}
          className="press btn-ghost mt-3 flex h-[52px] w-full items-center justify-center text-[15px] font-semibold"
        >
          이미 아는 문법이에요 · 장기기억으로 옮기기
        </button>
      )}

      {revealed && correct === false ? (
        <WrongSheet text="틀린 문법은 잠시 뒤에 다시 나와요." onNext={() => onAnswer("again")} />
      ) : revealed ? (
        <GradeSheet state={card ?? newCard(now)} now={now} title="이 문법, 어땠어요?" onAnswer={onAnswer} />
      ) : quiz.type === "recall" ? (
        <BottomBar>
          <button
            type="button"
            onClick={() => setFlipped(true)}
            className="btn-primary press flex h-14 w-full items-center justify-center text-[16px] font-bold"
          >
            뜻 보기
          </button>
        </BottomBar>
      ) : null}
    </div>
  );
}
