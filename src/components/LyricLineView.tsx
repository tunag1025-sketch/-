"use client";

import { matchTokens } from "@/lib/highlight";
import type { LyricLine, VocabItem } from "@/lib/types";
import { Ruby } from "./Ruby";

/**
 * 가사 한 줄을 후리가나와 함께 그린다. 단어장에 있는 단어는 형광펜으로 칠하고 누를 수 있다.
 * focusId를 주면 그 단어만 강조하고 읽기를 가린다(복습 카드 앞면).
 */
export function LyricLineView({
  line,
  index,
  vocab,
  onWord,
  focusId,
  blank = false,
  furigana = true,
}: {
  line: LyricLine;
  index: number;
  vocab: VocabItem[];
  onWord?: (vocabId: string) => void;
  focusId?: string;
  /** focusId 단어를 빈칸으로 가린다 (가사 빈칸 문제) */
  blank?: boolean;
  furigana?: boolean;
}) {
  const matches = matchTokens(line, index, vocab);

  // 같은 단어에 속한 연속 형태소를 하나의 버튼으로 묶는다.
  const groups: { id: string | null; tokens: LyricLine["tokens"] }[] = [];
  line.tokens.forEach((token, i) => {
    const id = matches[i];
    const last = groups.at(-1);
    if (last && id && last.id === id) last.tokens.push(token);
    else groups.push({ id, tokens: [token] });
  });

  return (
    <span className="font-jp">
      {groups.map((group, gi) => {
        const content = group.tokens.map((t, ti) => (
          <Ruby key={ti} segs={t.segs} hideReading={!furigana || (focusId !== undefined && group.id === focusId)} />
        ));
        if (!group.id) return <span key={gi}>{content}</span>;
        if (focusId !== undefined) {
          if (blank && group.id === focusId) {
            return (
              <span
                key={gi}
                aria-label="빈칸"
                className="mx-0.5 inline-block w-[3.2em] translate-y-[0.15em] border-b-[3px] border-blue"
              >
                &nbsp;
              </span>
            );
          }
          return group.id === focusId ? (
            <mark key={gi} className="focus-word">
              {content}
            </mark>
          ) : (
            <span key={gi}>{content}</span>
          );
        }
        return (
          <button key={gi} type="button" onClick={() => onWord?.(group.id!)} className="vocab-word font-semibold">
            {content}
          </button>
        );
      })}
    </span>
  );
}
