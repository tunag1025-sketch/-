"use client";

import { Icon } from "@/components/Icon";
import { SpeakButton } from "@/components/SpeakButton";
import { Spinner } from "@/components/Spinner";
import type { Song } from "@/lib/types";
import { useLineExplanation } from "@/lib/use-line-explanation";

/** 가사 한 줄의 해석과 끊어 읽기. 한 번 받은 해설은 저장해 두고 다시 쓴다. */
export function LineExplain({ song, index }: { song: Song; index: number }) {
  const { explanation, error, retry } = useLineExplanation(song, index);

  return (
    <div className="iris mx-2 mt-0.5 mb-1 rounded-[20px] px-4 py-3.5 text-[14px]">
      {explanation ? (
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 text-[16px] leading-normal font-bold text-pretty">{explanation.translation}</p>
            <SpeakButton text={song.lines[index].text} label="이 줄 듣기" className="size-8" tone="none" />
          </div>
          {explanation.breakdown.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {explanation.breakdown.map((b, i) => (
                // 조각이 길어도 뜻 칸이 좁아지지 않게 조각은 절반까지만
                <li key={i} className="flex items-baseline gap-3">
                  <span className="font-jp max-w-[50%] shrink-0 rounded-lg bg-surface/80 px-2 text-[14px] leading-[1.75] font-semibold break-words text-blue">
                    {b.part}
                  </span>
                  <span className="min-w-0 flex-1 leading-[1.55] text-ink-2">{b.meaning}</span>
                </li>
              ))}
            </ul>
          )}
          {explanation.notes && <p className="leading-[1.65] text-pretty text-ink-2">{explanation.notes}</p>}
        </div>
      ) : error ? (
        <div>
          <p className="text-ink-2">{error}</p>
          <button type="button" onClick={retry} className="mt-1.5 flex items-center gap-1.5 font-semibold text-blue">
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
