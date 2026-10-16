"use client";

import { Icon } from "@/components/Icon";
import { Spinner } from "@/components/Spinner";
import type { Song } from "@/lib/types";
import { useLineExplanation } from "@/lib/use-line-explanation";

/** 가사 한 줄의 해석과 끊어 읽기. 한 번 받은 해설은 저장해 두고 다시 쓴다. */
export function LineExplain({ song, index }: { song: Song; index: number }) {
  const { explanation, error, retry } = useLineExplanation(song, index);

  return (
    <div className="iris mt-1 mb-4 rounded-[20px] px-4 py-3.5 text-[15px]">
      {explanation ? (
        <div className="space-y-3">
          <p className="text-[16px] font-bold">{explanation.translation}</p>
          <ul className="space-y-1">
            {explanation.breakdown.map((b, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-jp shrink-0 rounded-lg bg-surface/80 px-2 font-semibold text-blue">{b.part}</span>
                <span className="text-ink-2">{b.meaning}</span>
              </li>
            ))}
          </ul>
          {explanation.notes && <p className="leading-relaxed text-ink-2">{explanation.notes}</p>}
        </div>
      ) : error ? (
        <div>
          <p className="text-ink-2">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-1.5 flex items-center gap-1.5 font-semibold text-blue"
          >
            <Icon name="refresh" className="size-4" /> 다시 시도
          </button>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-ink-3">
          <Spinner /> 이 줄을 해설하는 중…
        </p>
      )}
    </div>
  );
}
