"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { Spinner } from "@/components/Spinner";
import { buildDeck, kanjiKey } from "@/lib/cards";
import { gradeLabel, type KanjiInfo, useKanjiTable } from "@/lib/kanji";
import { KANJI_NEW_PER_SESSION, type KanjiCard, kanjiDeck } from "@/lib/kanji-deck";
import { KANJI_HREF } from "@/lib/review";
import { memoryOf, newCard } from "@/lib/srs";
import { useStore } from "@/lib/store";
import type { Grade } from "@/lib/types";
import { BottomBar, Finished, GradeSheet, SessionHeader, Toast, useStudySession, WrongSheet } from "./parts";

/** 모은 단어 속 한자를 훈음·읽는 법으로 복습한다. 한자 표를 받은 뒤에 시작한다. */
export function KanjiSession() {
  const table = useKanjiTable();
  if (!table) {
    return (
      <p className="flex items-center justify-center gap-2 pt-32 text-ink-3">
        <Spinner /> 한자 표를 불러오는 중…
      </p>
    );
  }
  return <KanjiDeckSession info={table} />;
}

function KanjiDeckSession({ info }: { info: (char: string) => KanjiInfo }) {
  const songs = useStore((s) => s.songs);
  const order = useStore((s) => s.order);
  // 보기로 쓸 훈음: 모은 한자 전체
  const pool = useMemo(() => kanjiDeck(songs, order, info), [songs, order, info]);
  const [{ initial, byKey }] = useState(() => {
    const { cards } = useStore.getState();
    const { queue } = buildDeck(
      pool.map((k) => kanjiKey(k.char)),
      cards,
      Date.now(),
      KANJI_NEW_PER_SESSION,
    );
    return { initial: queue, byKey: Object.fromEntries(pool.map((k) => [kanjiKey(k.char), k])) as Record<string, KanjiCard> };
  });
  const session = useStudySession({
    initial,
    keyOf: (key) => key,
    nameOf: (key) => byKey[key]?.char ?? "",
    countNew: false,
  });
  const current = session.current ? byKey[session.current] : undefined;
  const finished = !current;
  const [now] = useState(Date.now);
  const freshLeft = useMemo(
    () =>
      finished
        ? buildDeck(
            pool.map((k) => kanjiKey(k.char)),
            useStore.getState().cards,
            now,
            0,
          ).freshTotal
        : 0,
    [finished, pool, now],
  );

  return (
    <>
      {current ? (
        <KanjiQuizCard
          key={`${session.current}:${session.pos}`}
          kanji={current}
          pool={pool}
          pos={session.pos}
          total={session.queue.length}
          isNew={session.fresh.has(session.current)}
          onAnswer={session.answer}
          onLearned={session.markedLearned}
        />
      ) : (
        <Finished
          unit="한자"
          total={session.stats.done}
          learned={session.stats.learned}
          short={session.stats.short}
          empty={session.queue.length === 0}
          emptyText={
            pool.length === 0
              ? "한자가 들어간 단어를 모으면 여기서 복습할 수 있어요."
              : "지금 복습할 한자가 없어요. 다시 볼 때가 되면 생겨요."
          }
          studiedNew={session.fresh.size > 0}
          exitHref="/study"
          more={
            freshLeft > 0
              ? { href: KANJI_HREF, label: `새 한자 ${Math.min(KANJI_NEW_PER_SESSION, freshLeft)}개 더` }
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

type Quiz = { type: "recall" } | { type: "choice"; answer: string; choices: string[] };

/** 다시 보는 한자는 훈음 고르기, 처음 보는 한자는 떠올리기 */
function makeQuiz(kanji: KanjiCard, pool: KanjiCard[], isNew: boolean): Quiz {
  const others = [...new Set(pool.filter((k) => k.char !== kanji.char).map((k) => k.hun))].filter(
    (h) => h && h !== kanji.hun,
  );
  if (isNew || others.length < 3) return { type: "recall" };
  return { type: "choice", answer: kanji.hun, choices: shuffle([kanji.hun, ...shuffle(others).slice(0, 3)]) };
}

function KanjiQuizCard({
  kanji,
  pool,
  pos,
  total,
  isNew,
  onAnswer,
  onLearned,
}: {
  kanji: KanjiCard;
  pool: KanjiCard[];
  pos: number;
  total: number;
  isNew: boolean;
  onAnswer: (g: Grade) => void;
  onLearned: () => void;
}) {
  const key = kanjiKey(kanji.char);
  const card = useStore((s) => s.cards[key]);
  const setLearned = useStore((s) => s.setLearned);
  const [now] = useState(Date.now);
  const [quiz] = useState(() => makeQuiz(kanji, pool, isNew));
  const [flipped, setFlipped] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const revealed = quiz.type === "recall" ? flipped : picked !== null;
  const correct = quiz.type === "choice" && picked !== null ? picked === quiz.answer : null;
  const memory = memoryOf(card);

  return (
    <div className={revealed ? "pb-60" : "pb-28"}>
      <SessionHeader exitHref="/study" title={isNew ? "새 한자 학습" : "한자 복습"} pos={pos} total={total} />

      <article className={`card mt-5 rounded-[28px] p-5 text-center ${revealed ? "" : "pb-9"}`}>
        {correct !== null && (
          <p
            className={`mb-1 inline-flex h-[30px] items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold ${
              correct ? "bg-blue-soft text-blue" : "bg-danger-soft text-danger"
            }`}
            role="status"
          >
            <Icon name={correct ? "check" : "close"} className="size-4" />
            {correct ? "정답이에요" : "아쉬워요"}
          </p>
        )}
        <p className={`font-jp leading-none font-bold ${revealed ? "mt-3 text-[80px]" : "mt-8 text-[96px]"}`}>{kanji.char}</p>
        {revealed ? (
          <>
            <p className="mt-4 text-[24px] leading-[1.35] font-bold">{kanji.hun}</p>
            <p className="mt-1.5 text-[13px] text-ink-3">
              {kanji.strokes > 0 && (
                <>
                  <span className="num">{kanji.strokes}</span>획 ·{" "}
                </>
              )}
              {gradeLabel(kanji.grade)} · {memory === "long" ? "장기기억" : memory === "short" ? "단기기억" : "새 한자"}
            </p>
            {(kanji.on.length > 0 || kanji.kun.length > 0) && (
              <dl className="mx-auto mt-4 grid max-w-[18rem] grid-cols-[36px_1fr] gap-y-1 border-t border-line pt-3.5 text-left text-[15px]">
                {kanji.on.length > 0 && (
                  <>
                    <dt className="font-semibold text-ink-3">음독</dt>
                    <dd className="font-jp text-ink-2">{kanji.on.slice(0, 4).join("・")}</dd>
                  </>
                )}
                {kanji.kun.length > 0 && (
                  <>
                    <dt className="font-semibold text-ink-3">훈독</dt>
                    <dd className="font-jp text-ink-2">{kanji.kun.slice(0, 4).join("・")}</dd>
                  </>
                )}
              </dl>
            )}
          </>
        ) : quiz.type === "choice" ? (
          <p className="mt-5 text-[15px] text-ink-3">이 한자의 훈음은?</p>
        ) : (
          <p className="mt-5 text-[15px] text-ink-3">훈음과 읽는 법을 떠올려 보세요</p>
        )}
      </article>

      {quiz.type === "choice" && (
        <div className="mt-3 grid grid-cols-2 gap-2.5" role="group" aria-label="보기">
          {quiz.choices.map((c) => {
            const look = picked === null ? "idle" : c === quiz.answer ? "right" : c === picked ? "wrong" : "dim";
            return (
              <button
                key={c}
                type="button"
                disabled={picked !== null}
                onClick={() => setPicked(c)}
                className={`press flex items-center justify-center gap-1.5 rounded-[22px] px-3 text-[18px] font-bold transition-colors ${
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
                {look === "wrong" && <span className="text-[12px] font-semibold">내 답</span>}
                {look === "right" && <Icon name="check" className="size-4" strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
      )}

      {revealed && (
        <section className="card mt-3 p-5">
          <h3 className="mb-2.5 text-[13px] font-semibold text-ink-3">내 단어장에서 이 한자가 들어간 단어</h3>
          <ul className="divide-y divide-line">
            {kanji.words.slice(0, 6).map((v) => (
              <li key={v.id} className="flex items-baseline gap-3 py-2">
                <span className="font-jp shrink-0 text-[18px] font-bold">{v.word}</span>
                <span className="font-jp shrink-0 text-[13px] text-ink-3">{v.reading}</span>
                <span className="min-w-0 flex-1 truncate text-right text-[14px] text-ink-2">{v.meaning}</span>
              </li>
            ))}
          </ul>
          {memory !== "long" && (
            <button
              type="button"
              onClick={() => {
                setLearned(key, true, { countNew: false });
                onLearned();
              }}
              className="press btn-ghost mt-4 flex h-[52px] w-full items-center justify-center text-[15px] font-semibold"
            >
              이미 아는 한자예요 · 장기기억으로 옮기기
            </button>
          )}
        </section>
      )}

      {revealed && correct === false ? (
        <WrongSheet text="틀린 한자는 잠시 뒤에 다시 나와요." onNext={() => onAnswer("again")} />
      ) : revealed ? (
        <GradeSheet state={card ?? newCard(now)} now={now} title="이 한자, 어땠어요?" onAnswer={onAnswer} />
      ) : quiz.type === "recall" ? (
        <BottomBar>
          <button
            type="button"
            onClick={() => setFlipped(true)}
            className="btn-primary press flex h-14 w-full items-center justify-center text-[16px] font-bold"
          >
            답 보기
          </button>
        </BottomBar>
      ) : null}
    </div>
  );
}
