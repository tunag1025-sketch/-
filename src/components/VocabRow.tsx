"use client";

import type { VocabItem } from "@/lib/types";
import { Badge } from "./Badge";
import { Icon } from "./Icon";

/** 단어 목록의 한 줄 */
export function VocabRow({
  item,
  suspended,
  sub,
  onClick,
}: {
  item: VocabItem;
  suspended?: boolean;
  sub?: string;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2 active:bg-surface-2"
      >
        <div className="min-w-0 flex-1">
          <div className="font-jp text-[11px] font-semibold text-ink-3">{item.reading}</div>
          <div className="font-jp truncate text-[20px] leading-tight font-extrabold">{item.word}</div>
        </div>
        <div className="min-w-0 flex-[1.3]">
          <div className="line-clamp-2 text-[14px] leading-snug font-semibold text-ink-2">{item.meaning}</div>
          {sub && <div className="font-jp mt-0.5 truncate text-[11px] text-ink-3">♪ {sub}</div>}
        </div>
        <div className="shrink-0">
          {suspended ? (
            <span className="grid size-7 place-items-center rounded-full border-[1.5px] border-black bg-lemon text-black">
              <Icon name="check" className="size-4" />
            </span>
          ) : (
            item.jlpt !== "기타" && (
              <Badge tone="pink" pixel>
                {item.jlpt}
              </Badge>
            )
          )}
        </div>
      </button>
    </li>
  );
}
