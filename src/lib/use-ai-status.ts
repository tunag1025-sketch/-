"use client";

import { useEffect, useState } from "react";

let cached: Promise<boolean> | null = null;

/** 서버에 AI 키가 설정돼 있는지. 확인 전에는 null. */
export function useAiStatus(): boolean | null {
  const [ai, setAi] = useState<boolean | null>(null);
  useEffect(() => {
    cached ??= fetch("/api/status")
      .then((r) => r.json())
      .then((d) => Boolean(d.ai))
      .catch(() => {
        cached = null;
        return true; // 오프라인 등으로 확인 못 하면 경고를 띄우지 않는다.
      });
    let alive = true;
    cached.then((v) => alive && setAi(v));
    return () => {
      alive = false;
    };
  }, []);
  return ai;
}
