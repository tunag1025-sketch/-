"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Spinner } from "@/components/Spinner";
import { explainLine } from "@/lib/api-client";
import { explanationKey, useStore } from "@/lib/store";
import type { Song } from "@/lib/types";

const nearbyLine = (song: Song, from: number, step: number) => {
  for (let i = from + step; i >= 0 && i < song.lines.length; i += step) {
    if (song.lines[i].text.trim()) return song.lines[i].text;
  }
  return undefined;
};

/** 가사 한 줄의 해석과 끊어 읽기. 한 번 받은 해설은 저장해 두고 다시 쓴다. */
export function LineExplain({ song, index }: { song: Song; index: number }) {
  const key = explanationKey(song.id, index);
  const explanation = useStore((s) => s.explanations[key]);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (explanation) return;
    let alive = true;
    explainLine({
      title: song.title,
      artist: song.artist,
      level: song.level,
      line: song.lines[index].text,
      before: nearbyLine(song, index, -1),
      after: nearbyLine(song, index, 1),
    })
      .then((res) => useStore.getState().setExplanation(key, res))
      .catch((err) => alive && setError(err instanceof Error ? err.message : "해설을 가져오지 못했어요."));
    return () => {
      alive = false;
    };
    // song 객체 전체가 아니라 줄 내용이 바뀔 때만 다시 요청한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, explanation, attempt]);

  return (
    <div className="mt-1 mb-4 rounded-2xl border-2 border-black bg-lav px-4 py-3.5 text-[15px] text-black">
      {explanation ? (
        <div className="space-y-3">
          <p className="font-mono text-[10px] font-bold tracking-wider opacity-70">[ TRANSLATION ]</p>
          <p className="-mt-2 text-[16px] font-extrabold">{explanation.translation}</p>
          <ul className="space-y-1">
            {explanation.breakdown.map((b, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-jp shrink-0 rounded-md bg-white/70 px-1.5 font-bold">{b.part}</span>
                <span className="opacity-80">{b.meaning}</span>
              </li>
            ))}
          </ul>
          {explanation.notes && <p className="leading-relaxed opacity-80">{explanation.notes}</p>}
        </div>
      ) : error ? (
        <div>
          <p className="opacity-80">{error}</p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setAttempt((n) => n + 1);
            }}
            className="mt-1.5 flex items-center gap-1.5 font-bold"
          >
            <Icon name="refresh" className="size-4" /> 다시 시도
          </button>
        </div>
      ) : (
        <p className="flex items-center gap-2 opacity-70">
          <Spinner /> 이 줄을 해설하는 중…
        </p>
      )}
    </div>
  );
}
