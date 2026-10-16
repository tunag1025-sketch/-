"use client";

import { matchTokens } from "@/lib/highlight";
import type { LyricLine, VocabItem } from "@/lib/types";
import { Ruby } from "./Ruby";

/**
 * 가사 한 줄을 후리가나와 함께 그린다. 단어장에 있는 단어는 밑줄로 표시하고 누를 수 있다.
 * focusId를 주면 그 단어만 강조하고 읽기를 가린다(복습 카드 앞면).
 */
export function LyricLineView({
  line,
  index,
  vocab,
  onWord,
  focusId,
  furigana = true,
}: {
  line: LyricLine;
  index: number;
  vocab: VocabItem[];
  onWord?: (vocabId: string) => void;
  focusId?: string;
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
          return (
            <mark key={gi} className={group.id === focusId ? "rounded bg-mark px-0.5 font-bold text-ink" : "bg-transparent text-inherit"}>
              {content}
            </mark>
          );
        }
        return (
          <button
            key={gi}
            type="button"
            onClick={() => onWord?.(group.id!)}
            className="rounded underline decoration-accent/60 decoration-2 underline-offset-[6px] hover:bg-accent-soft"
          >
            {content}
          </button>
        );
      })}
    </span>
  );
}
