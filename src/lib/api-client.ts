"use client";

import { create } from "zustand";
import type { AnalyzeResponse } from "./analysis/normalize";
import type { ExplainRequest } from "./analysis/schema";
import { useStore } from "./store";
import type { LineExplanation, LyricLine } from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("인터넷 연결을 확인해 주세요.", "OFFLINE");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.message ?? "요청에 실패했어요.", data?.code ?? "UNKNOWN");
  }
  return data as T;
}

export async function tokenize(lines: string[]): Promise<LyricLine[]> {
  const data = await postJson<{ lines: LyricLine[] }>("/api/tokenize", { lines });
  return data.lines;
}

export function explainLine(req: ExplainRequest): Promise<LineExplanation> {
  return postJson<LineExplanation>("/api/explain", req);
}

/** 지금 이 탭에서 분석 요청이 진행 중인 노래 id들 */
export const useInFlight = create<{ ids: Set<string> }>(() => ({ ids: new Set() }));

function setInFlight(id: string, on: boolean) {
  useInFlight.setState((s) => {
    const ids = new Set(s.ids);
    if (on) ids.add(id);
    else ids.delete(id);
    return { ids };
  });
}

/** AI 단어장 생성을 시작한다. 화면을 옮겨도 계속 진행되고 결과는 저장소에 기록된다. */
export async function startAnalysis(songId: string): Promise<void> {
  if (useInFlight.getState().ids.has(songId)) return;
  const { songs, updateSong } = useStore.getState();
  const song = songs[songId];
  if (!song) return;

  setInFlight(songId, true);
  updateSong(songId, { status: "analyzing", error: undefined });
  try {
    const data = await postJson<AnalyzeResponse>("/api/analyze", {
      title: song.title,
      artist: song.artist,
      level: song.level,
      lines: song.lines.map((l) => l.text),
    });
    useStore.getState().updateSong(songId, {
      status: "ready",
      summary: data.summary,
      grammar: data.grammar,
      vocab: data.vocab.map((v) => ({ ...v, id: `${songId}:${v.word}`, songId })),
    });
  } catch (err) {
    useStore.getState().updateSong(songId, {
      status: "error",
      error: err instanceof Error ? err.message : "분석에 실패했어요.",
    });
  } finally {
    setInFlight(songId, false);
  }
}
