"use client";

import { create } from "zustand";
import type { AnalyzeResponse } from "./analysis/normalize";
import type { ExplainRequest } from "./analysis/schema";
import { explanationKey, useStore } from "./store";
import type { LineExplanation, LyricLine, Song } from "./types";

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

const nearbyLine = (song: Song, from: number, step: number) => {
  for (let i = from + step; i >= 0 && i < song.lines.length; i += step) {
    if (song.lines[i].text.trim()) return song.lines[i].text;
  }
  return undefined;
};

const pendingExplain = new Map<string, Promise<LineExplanation>>();

/** 가사 한 줄의 해설을 받아 저장한다. 이미 있으면 그대로 쓰고, 같은 줄을 동시에 두 번 요청하지 않는다. */
export function fetchExplanation(song: Song, index: number): Promise<LineExplanation> {
  const key = explanationKey(song.id, index);
  const saved = useStore.getState().explanations[key];
  if (saved) return Promise.resolve(saved);
  let pending = pendingExplain.get(key);
  if (!pending) {
    pending = explainLine({
      title: song.title,
      artist: song.artist,
      level: song.level,
      line: song.lines[index].text,
      before: nearbyLine(song, index, -1),
      after: nearbyLine(song, index, 1),
    })
      .then((res) => {
        useStore.getState().setExplanation(key, res);
        return res;
      })
      .finally(() => pendingExplain.delete(key));
    pendingExplain.set(key, pending);
  }
  return pending;
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

/**
 * AI 단어장 생성을 시작한다. 화면을 옮겨도 계속 진행되고 결과는 저장소에 기록된다.
 * retokenize: 예전에 저장한 가사를 다시 정리한다(후리가나가 섞여 들어간 가사 등).
 */
export async function startAnalysis(songId: string, opts: { retokenize?: boolean } = {}): Promise<void> {
  if (useInFlight.getState().ids.has(songId)) return;
  const { songs, updateSong } = useStore.getState();
  let song = songs[songId];
  if (!song) return;

  setInFlight(songId, true);
  updateSong(songId, { status: "analyzing", error: undefined });
  try {
    if (opts.retokenize) {
      const lines = await tokenize(song.lines.map((l) => l.text));
      if (lines.some((l, i) => l.text !== song.lines[i]?.text)) {
        updateSong(songId, { lines });
        song = { ...song, lines };
      }
    }
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
