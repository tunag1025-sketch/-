"use client";

import { useEffect, useState } from "react";

/** 한자 하나의 정보 (public/kanji.json, scripts/kanji/build-kanji.mjs로 만든다) */
export type KanjiInfo = {
  char: string;
  /** 한국 한자 훈음 (예: 별 성) */
  hun: string;
  /** 1~6 교육한자 학년, 8 그 밖의 상용한자, 9·10 인명용 */
  grade: number;
  strokes: number;
  on: string[];
  kun: string[];
};

type Raw = Record<string, [string, number, number, string, string]>;

let table: Promise<Raw> | null = null;
function loadTable(): Promise<Raw> {
  table ??= fetch("/kanji.json")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((d: { k: Raw }) => d.k)
    .catch((err) => {
      table = null;
      throw err;
    });
  return table;
}

const isKanji = (c: string) => /[㐀-鿿豈-﫿\u{20000}-\u{2ffff}]/u.test(c);

/** 단어 속 한자 (겹치면 한 번만) */
export function kanjiIn(word: string): string[] {
  return [...new Set(Array.from(word).filter(isKanji))];
}

/** "あ.ける" → "あ(ける)", 앞뒤 - 는 뺀다. */
const prettyReading = (r: string) => r.replace(/-/g, "").replace(/\.(.+)$/, "($1)");

function toInfo(char: string, row: Raw[string] | undefined): KanjiInfo {
  if (!row) return { char, hun: "", grade: 0, strokes: 0, on: [], kun: [] };
  const [hun, grade, strokes, on, kun] = row;
  const list = (s: string) => [...new Set(s.split("・").filter(Boolean).map(prettyReading))];
  return { char, hun, grade, strokes, on: list(on), kun: list(kun) };
}

/** 상용한자인지와 학년을 짧게 */
export function gradeLabel(grade: number): string {
  if (grade >= 1 && grade <= 6) return `상용한자 · 초등 ${grade}학년`;
  if (grade === 8) return "상용한자 · 중학 이상";
  if (grade === 9 || grade === 10) return "인명용 한자";
  return "상용한자 아님";
}

export const isJoyo = (grade: number) => grade >= 1 && grade <= 8;

/** 좁은 칸에 넣는 짧은 이름: 상용 · 초2 / 상용 · 중학 / 인명용 / 상용 외 */
export function gradeShort(grade: number): string {
  if (grade >= 1 && grade <= 6) return `상용 · 초${grade}`;
  if (grade === 8) return "상용 · 중학";
  if (grade === 9 || grade === 10) return "인명용";
  return "상용 외";
}

/** 단어 속 한자들의 정보. 처음 한 번 표를 받아 오는 동안은 null. */
export function useKanji(word: string): KanjiInfo[] | null {
  const chars = kanjiIn(word);
  const key = chars.join("");
  const [state, setState] = useState<{ key: string; list: KanjiInfo[] } | null>(null);
  useEffect(() => {
    if (!key) return;
    let alive = true;
    loadTable()
      .then((t) => alive && setState({ key, list: Array.from(key).map((c) => toInfo(c, t[c])) }))
      .catch(() => alive && setState({ key, list: Array.from(key).map((c) => toInfo(c, undefined)) }));
    return () => {
      alive = false;
    };
  }, [key]);
  if (!key) return [];
  return state?.key === key ? state.list : null;
}
