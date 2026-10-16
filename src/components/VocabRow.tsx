"use client";

import type { VocabItem } from "@/lib/types";
import { Badge } from "./Badge";
import { Icon } from "./Icon";

/** 단어 목록의 한 줄 */
export function VocabRow({
  item,
  learned,
  sub,
  onClick,
}: {
  item: VocabItem;
  learned?: boolean;
  sub?: string;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-muted"
      >
        <div className="font-jp w-[38%] min-w-0 shrink-0">
          <div className="truncate text-[12px] font-medium text-ink-3">{item.reading}</div>
          <div className="truncate text-[19px] leading-tight font-bold">{item.word}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-[14px] leading-snug text-ink-2">{item.meaning}</div>
          {sub && <div className="font-jp mt-0.5 truncate text-[12px] text-ink-3">{sub}</div>}
        </div>
        <div className="shrink-0">
          {learned ? (
            <span className="btn-primary grid size-7 place-items-center" aria-label="외운 단어">
              <Icon name="check" className="size-4" />
            </span>
          ) : (
            item.jlpt !== "기타" && <Badge tone="blue">{item.jlpt}</Badge>
          )}
        </div>
      </button>
    </li>
  );
}
