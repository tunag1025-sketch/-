"use client";

import type { Memory } from "@/lib/srs";
import type { VocabItem } from "@/lib/types";
import { Icon } from "./Icon";

/** 기억 상태 동그라미: 장기기억(채움) · 단기기억(테두리) · 학습 전(점선) */
export function MemoryMark({ memory }: { memory: Memory }) {
  if (memory === "long") {
    return (
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-btn text-white" role="img" aria-label="장기기억">
        <Icon name="check" className="size-3.5" strokeWidth={2.5} />
      </span>
    );
  }
  if (memory === "short") {
    return (
      <span
        className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-[color:var(--short-term)] text-blue"
        role="img"
        aria-label="단기기억"
      >
        <Icon name="check" className="size-[13px]" strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <span
      className="size-7 shrink-0 rounded-full border-[1.5px] border-dashed border-ink-3 opacity-60"
      role="img"
      aria-label="학습 전"
    />
  );
}

/** 단어 목록 위 기억 상태 설명 */
export function MemoryMarkLegend() {
  return (
    <span className="flex gap-3">
      <span className="flex items-center gap-1">
        <span className="size-2.5 rounded-full bg-btn" />
        장기
      </span>
      <span className="flex items-center gap-1">
        <span className="size-2.5 rounded-full border-2 border-[color:var(--short-term)]" />
        단기
      </span>
      <span className="flex items-center gap-1">
        <span className="size-2.5 rounded-full border-[1.5px] border-dashed border-ink-3" />
        학습 전
      </span>
    </span>
  );
}

/** 단어 목록의 한 줄. meta를 주지 않으면 품사·JLPT를 보여 준다. */
export function VocabRow({
  item,
  memory = "none",
  meta,
  dueToday = false,
  onClick,
}: {
  item: VocabItem;
  memory?: Memory;
  /** 뜻 아래 작은 줄 (단어장에서는 노래 이름) */
  meta?: string;
  /** 오늘 복습할 단어 */
  dueToday?: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted"
      >
        <div className="font-jp w-[36%] min-w-0 shrink-0">
          <div className="truncate text-[12px] font-medium text-ink-3">{item.reading}</div>
          <div className="truncate text-[20px] leading-[1.3] font-bold">{item.word}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-[15px] leading-[1.4] font-medium">{item.meaning}</div>
          <div className="mt-0.5 truncate text-[12px] text-ink-3">
            {meta !== undefined ? (
              <span className="font-jp">{meta}</span>
            ) : (
              <>
                {item.pos}
                {item.jlpt !== "기타" && (
                  <>
                    {" · "}
                    <span className="num">{item.jlpt}</span>
                  </>
                )}
              </>
            )}
            {dueToday && (
              <>
                {" · "}
                <span className="font-semibold text-blue">오늘 복습</span>
              </>
            )}
          </div>
        </div>
        <MemoryMark memory={memory} />
      </button>
    </li>
  );
}
