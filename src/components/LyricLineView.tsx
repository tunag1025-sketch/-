"use client";

import { matchTokens } from "@/lib/highlight";
import type { Memory } from "@/lib/srs";
import type { LyricLine, VocabItem } from "@/lib/types";
import { Ruby } from "./Ruby";

/**
 * 가사 한 줄을 후리가나와 함께 그린다. 단어장에 있는 단어는 형광펜으로 칠하고 누를 수 있다.
 * memory를 주면 기억 상태에 따라 칠한다: 장기기억은 진한 형광펜, 단기기억은 가는 밑줄, 학습 전은 점선.
 * focusId를 주면 그 단어만 강조하고 읽기를 가린다(복습 카드 앞면).
 */
export function LyricLineView({
  line,
  index,
  vocab,
  onWord,
  memory,
  focusId,
  blank = false,
  showFocusReading = false,
  furigana = true,
}: {
  line: LyricLine;
  index: number;
  vocab: VocabItem[];
  onWord?: (vocabId: string) => void;
  /** 단어마다 기억 상태 (노래 가사 화면) */
  memory?: (vocabId: string) => Memory;
  focusId?: string;
  /** focusId 단어를 빈칸으로 가린다 (가사 빈칸 문제) */
  blank?: boolean;
  /** 답을 본 뒤: 강조한 단어의 읽기도 보여 준다 */
  showFocusReading?: boolean;
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
          <Ruby
            key={ti}
            segs={t.segs}
            hideReading={!furigana || (focusId !== undefined && group.id === focusId && !showFocusReading)}
          />
        ));
        if (!group.id) return <span key={gi}>{content}</span>;
        if (focusId !== undefined) {
          if (blank && group.id === focusId) {
            return (
              <span
                key={gi}
                aria-label="빈칸"
                className="mx-1 inline-block h-[1.3em] w-[4.2em] rounded-lg bg-surface align-[-0.3em] ring-[1.5px] ring-blue ring-inset"
              />
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
          <button
            key={gi}
            type="button"
            onClick={() => onWord?.(group.id!)}
            className="vocab-word"
            data-memory={memory?.(group.id)}
          >
            {content}
          </button>
        );
      })}
    </span>
  );
}

/** 문형(〜ても 등)에서 가사에서 찾을 글자: 가나·한자 덩어리 중 줄에 나오는 가장 긴 것 */
export function patternRange(pattern: string, text: string): [number, number] | null {
  const runs = (pattern.match(/[぀-ヿ㐀-鿿々]+/gu) ?? []).sort((a, b) => b.length - a.length);
  for (const run of runs) {
    const at = text.indexOf(run);
    if (at >= 0) return [at, at + run.length];
  }
  return null;
}

/**
 * 가사 한 줄을 그리되 [start, end) 글자만 파란 밑줄로 짚는다 (문법 예시).
 * blank면 그 자리를 흰 빈칸으로 가린다 (문법 빈칸 문제).
 */
export function LyricLineRange({
  line,
  range,
  furigana = true,
  blank = false,
}: {
  line: LyricLine;
  range: [number, number] | null;
  furigana?: boolean;
  blank?: boolean;
}) {
  const mark = "font-bold text-blue underline decoration-2 underline-offset-[5px]";
  const out: React.ReactNode[] = [];
  let boxed = false;
  const box = (key: string) => {
    if (boxed) return null;
    boxed = true;
    return (
      <span
        key={key}
        aria-label="빈칸"
        className="mx-1 inline-block h-[1.3em] w-[3.6em] rounded-lg bg-surface align-[-0.3em] ring-[1.5px] ring-blue ring-inset"
      />
    );
  };
  let at = 0;
  line.tokens.forEach((token, ti) =>
    token.segs.forEach((seg, si) => {
      const start = at;
      const end = at + seg.t.length;
      at = end;
      const key = `${ti}-${si}`;
      const inRange = (a: number, b: number) => !!range && a < range[1] && b > range[0];
      if (blank && range && inRange(start, end)) {
        // 빈칸 문제: 범위에 걸친 조각은 앞뒤 글자만 남기고 가운데를 빈칸 하나로
        const a = Math.max(range[0], start) - start;
        const b = Math.min(range[1], end) - start;
        out.push(
          <span key={key}>
            {seg.r ? null : seg.t.slice(0, a)}
            {box(`${key}-box`)}
            {seg.r ? null : seg.t.slice(b)}
          </span>,
        );
        return;
      }
      if (seg.r) {
        out.push(
          <ruby key={key} className={inRange(start, end) ? mark : undefined}>
            {seg.t}
            <rt className={furigana ? undefined : "invisible"}>{seg.r}</rt>
          </ruby>,
        );
        return;
      }
      // 가나 조각은 범위 경계에서 잘라 그 부분만 짚는다.
      if (!range || !inRange(start, end)) {
        out.push(<span key={key}>{seg.t}</span>);
        return;
      }
      const a = Math.max(range[0], start) - start;
      const b = Math.min(range[1], end) - start;
      out.push(
        <span key={key}>
          {seg.t.slice(0, a)}
          <span className={mark}>{seg.t.slice(a, b)}</span>
          {seg.t.slice(b)}
        </span>,
      );
    }),
  );
  return <span className="font-jp">{out}</span>;
}
