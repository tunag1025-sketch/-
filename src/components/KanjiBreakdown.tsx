"use client";

import { useMemo } from "react";
import { gradeLabel, gradeShort, isJoyo, useKanji } from "@/lib/kanji";
import { useStore } from "@/lib/store";
import type { VocabItem } from "@/lib/types";

/** 단어에 들어 있는 한자 하나하나: 훈음, 상용한자인지, 읽는 법, 내 단어장의 같은 한자 단어 */
export function KanjiBreakdown({ item }: { item: VocabItem }) {
  const list = useKanji(item.word);
  const songs = useStore((s) => s.songs);
  const order = useStore((s) => s.order);
  const others = useMemo(
    () =>
      order
        .flatMap((id) => (songs[id]?.status === "ready" ? songs[id].vocab : []))
        .filter((v) => v.word !== item.word),
    [songs, order, item.word],
  );

  if (list && list.length === 0) return null;
  return (
    <section>
      <h3 className="mb-2.5 text-[13px] font-semibold text-ink-3">한자</h3>
      {list === null ? (
        <div className="h-[88px] animate-pulse rounded-[20px] bg-muted" />
      ) : (
        // 한자마다 한 줄: 왼쪽 큰 글자, 오른쪽 훈음 · 획수 · 읽는 법 · 같은 한자 단어
        <ul className="divide-y divide-line rounded-[20px] border border-line">
          {list.map((k) => {
            const same = [...new Map(others.filter((v) => v.word.includes(k.char)).map((v) => [v.word, v])).values()].slice(0, 4);
            return (
              <li key={k.char} className="flex items-start gap-3.5 px-4 py-3.5">
                <span className="font-jp grid size-14 shrink-0 place-items-center rounded-2xl bg-muted text-[34px] leading-none font-bold">
                  {k.char}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <p className="text-[17px] font-bold">{k.hun || "훈음 없음"}</p>
                    <p className="text-[12px] font-medium text-ink-3" title={gradeLabel(k.grade)}>
                      {k.strokes > 0 && (
                        <>
                          <span className="num">{k.strokes}</span>획 ·{" "}
                        </>
                      )}
                      <span className={isJoyo(k.grade) ? "text-blue" : undefined}>{gradeShort(k.grade)}</span>
                    </p>
                  </div>
                  {(k.on.length > 0 || k.kun.length > 0) && (
                    <dl className="mt-1 flex flex-wrap gap-x-3.5 gap-y-0.5 text-[14px]">
                      {k.on.length > 0 && (
                        <div className="flex gap-1.5">
                          <dt className="shrink-0 font-semibold text-ink-3">음</dt>
                          <dd className="font-jp text-ink-2">{k.on.slice(0, 3).join("・")}</dd>
                        </div>
                      )}
                      {k.kun.length > 0 && (
                        <div className="flex gap-1.5">
                          <dt className="shrink-0 font-semibold text-ink-3">훈</dt>
                          <dd className="font-jp text-ink-2">{k.kun.slice(0, 3).join("・")}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                  {same.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      <span className="mr-1 text-[12px] font-semibold text-ink-3">같은 한자</span>
                      {same.map((v) => (
                        <span key={v.id} className="font-jp rounded-full bg-muted px-2 py-0.5 text-[13px] font-semibold">
                          {v.word}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
