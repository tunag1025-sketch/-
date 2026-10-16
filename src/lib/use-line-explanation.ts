"use client";

import { useEffect, useState } from "react";
import { fetchExplanation } from "./api-client";
import { explanationKey, useStore } from "./store";
import type { Song } from "./types";

/** 가사 한 줄의 해설. 저장된 게 없으면 받아 온다. index가 없으면 아무것도 하지 않는다. */
export function useLineExplanation(song: Song, index: number | undefined) {
  const key = index === undefined ? null : explanationKey(song.id, index);
  const explanation = useStore((s) => (key ? s.explanations[key] : undefined));
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (key === null || index === undefined || explanation) return;
    let alive = true;
    fetchExplanation(song, index).catch(
      (err) => alive && setFailure({ key, message: err instanceof Error ? err.message : "해설을 가져오지 못했어요." }),
    );
    return () => {
      alive = false;
    };
    // song 객체 전체가 아니라 줄이 바뀔 때만 다시 요청한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, explanation, attempt]);

  const error = failure && failure.key === key ? failure.message : null;
  const retry = () => {
    setFailure(null);
    setAttempt((n) => n + 1);
  };
  return { explanation, error, retry };
}
