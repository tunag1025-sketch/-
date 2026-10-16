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
        <div className="h-28 animate-pulse rounded-[18px] bg-muted" />
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {list.map((k) => {
            const same = [...new Map(others.filter((v) => v.word.includes(k.char)).map((v) => [v.word, v])).values()].slice(0, 3);
            return (
              <li key={k.char} className="min-w-0 rounded-[18px] border border-line p-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-jp grid size-12 shrink-0 place-items-center rounded-[14px] bg-muted text-[30px] leading-none font-bold">
                    {k.char}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-bold">{k.hun || "훈음 없음"}</p>
                    <p className="mt-0.5 truncate text-[12px] font-medium text-ink-3" title={gradeLabel(k.grade)}>
                      {k.strokes > 0 && (
                        <>
                          <span className="num">{k.strokes}</span>획 ·{" "}
                        </>
                      )}
                      <span className={isJoyo(k.grade) ? "text-blue" : undefined}>{gradeShort(k.grade)}</span>
                    </p>
                  </div>
                </div>
                {(k.on.length > 0 || k.kun.length > 0) && (
                  <dl className="mt-2.5 grid grid-cols-[28px_1fr] gap-y-0.5 text-[13px]">
                    {k.on.length > 0 && (
                      <>
                        <dt className="font-semibold text-ink-3">음</dt>
                        <dd className="font-jp text-ink-2">{k.on.slice(0, 3).join("・")}</dd>
                      </>
                    )}
                    {k.kun.length > 0 && (
                      <>
                        <dt className="font-semibold text-ink-3">훈</dt>
                        <dd className="font-jp text-ink-2">{k.kun.slice(0, 3).join("・")}</dd>
                      </>
                    )}
                  </dl>
                )}
                {same.length > 0 && (
                  <div className="mt-2.5 border-t border-line pt-2">
                    <p className="text-[11px] font-semibold text-ink-3">같은 한자 단어</p>
                    <ul className="mt-1 flex flex-wrap gap-1">
                      {same.map((v) => (
                        <li key={v.id} className="font-jp rounded-full bg-muted px-2 py-0.5 text-[12px] font-semibold">
                          {v.word}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
