"use client";

import { useMemo } from "react";
import { gradeLabel, isJoyo, useKanji } from "@/lib/kanji";
import { useStore } from "@/lib/store";
import type { VocabItem } from "@/lib/types";
import { Badge } from "./Badge";

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
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
      ) : (
        <ul className="space-y-2">
          {list.map((k) => {
            const same = [...new Map(others.filter((v) => v.word.includes(k.char)).map((v) => [v.word, v])).values()].slice(0, 4);
            return (
              <li key={k.char} className="rounded-2xl border border-line px-4 py-3">
                <div className="flex items-center gap-3.5">
                  <span className="font-jp grid size-14 shrink-0 place-items-center rounded-2xl bg-muted text-[34px] leading-none font-bold">
                    {k.char}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px] font-bold">{k.hun || "훈음 정보 없음"}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge tone={isJoyo(k.grade) ? "blue" : "muted"}>{gradeLabel(k.grade)}</Badge>
                      {k.strokes > 0 && <span className="num text-[12px] font-medium text-ink-3">{k.strokes}획</span>}
                    </div>
                  </div>
                </div>
                {(k.on.length > 0 || k.kun.length > 0) && (
                  <dl className="font-jp mt-2.5 space-y-0.5 text-[14px]">
                    {k.on.length > 0 && (
                      <div className="flex gap-2">
                        <dt className="w-8 shrink-0 font-sans text-[13px] font-semibold text-ink-3">음독</dt>
                        <dd className="text-ink-2">{k.on.slice(0, 4).join("・")}</dd>
                      </div>
                    )}
                    {k.kun.length > 0 && (
                      <div className="flex gap-2">
                        <dt className="w-8 shrink-0 font-sans text-[13px] font-semibold text-ink-3">훈독</dt>
                        <dd className="text-ink-2">{k.kun.slice(0, 4).join("・")}</dd>
                      </div>
                    )}
                  </dl>
                )}
                {same.length > 0 && (
                  <div className="mt-2.5 border-t border-line pt-2.5">
                    <p className="text-[12px] font-semibold text-ink-3">내 단어장에서 이 한자가 들어간 단어</p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {same.map((v) => (
                        <li key={v.id} className="rounded-full bg-muted px-2.5 py-1 text-[13px]">
                          <span className="font-jp font-semibold">{v.word}</span>{" "}
                          <span className="text-ink-3">{v.meaning.split(/[,，]/)[0]}</span>
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
