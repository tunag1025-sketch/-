import { kataToHira } from "./furigana";
import { matchTokens } from "./highlight";
import type { Song, VocabItem } from "./types";

/**
 * 문제 유형
 *  recall  단어를 보고 뜻 떠올리기 (카드 뒤집기)
 *  choice  뜻을 보고 단어 고르기
 *  blank   가사 빈칸에 들어갈 말 고르기
 *  reading 읽는 법 쓰기
 */
export type QuizType = "recall" | "choice" | "blank" | "reading";

export const QUIZ_TYPES: { type: QuizType; label: string; hint: string }[] = [
  { type: "recall", label: "뜻 떠올리기", hint: "단어를 보고 뜻을 떠올린 뒤 뒤집어 봐요" },
  { type: "choice", label: "단어 고르기", hint: "뜻을 보고 알맞은 단어를 4개 중에 골라요" },
  { type: "blank", label: "가사 빈칸", hint: "가사에서 빈칸에 들어갈 말을 골라요" },
  { type: "reading", label: "읽는 법 쓰기", hint: "단어의 읽는 법을 히라가나로 써요 (일본어 자판 필요)" },
];

export const DEFAULT_QUIZ_TYPES: QuizType[] = ["recall", "choice", "blank"];

const CHOICES = 4;

/** 가사 줄에서 이 단어가 쓰인 부분 (빈칸으로 가릴 글자) */
export function blankAnswer(item: VocabItem, song: Song): string | null {
  const index = item.lines.find((n) => song.lines[n]);
  if (index === undefined) return null;
  const line = song.lines[index];
  const matches = matchTokens(line, index, [item]);
  const text = line.tokens
    .filter((_, i) => matches[i] === item.id)
    .map((t) => t.surface)
    .join("");
  return text && text !== line.text ? text : null;
}

const hasKanji = (s: string) => /[㐀-鿿々]/.test(s);

/** 이 단어로 낼 수 있는 유형인지 */
export function canAsk(type: QuizType, item: VocabItem, song: Song, poolSize: number): boolean {
  switch (type) {
    case "recall":
      return true;
    case "choice":
      return poolSize >= CHOICES;
    case "blank":
      return poolSize >= CHOICES && blankAnswer(item, song) !== null;
    case "reading":
      return hasKanji(item.word) && !!item.reading;
  }
}

/** 이번 카드의 유형. 처음 보는 단어는 먼저 뜻을 익히게 '뜻 떠올리기'로 낸다. */
export function pickQuizType(
  enabled: QuizType[],
  item: VocabItem,
  song: Song,
  poolSize: number,
  isNew: boolean,
  rand: () => number = Math.random,
): QuizType {
  if (isNew) return "recall";
  const options = enabled.filter((t) => canAsk(t, item, song, poolSize));
  if (!options.length) return "recall";
  return options[Math.floor(rand() * options.length)];
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 보기 4개 (정답 포함, 섞어서). 같은 품사의 다른 단어를 먼저 오답으로 쓴다.
 * show: 보기에 보여 줄 글자 (단어 고르기는 사전형, 빈칸은 가사에 쓰인 형태)
 */
export function makeChoices(
  item: VocabItem,
  answer: string,
  pool: VocabItem[],
  show: (v: VocabItem) => string,
  rand: () => number = Math.random,
): string[] {
  const others = pool.filter((v) => v.word !== item.word && v.meaning !== item.meaning && show(v) && show(v) !== answer);
  const samePos = shuffle(others.filter((v) => v.pos === item.pos), rand);
  const rest = shuffle(others.filter((v) => v.pos !== item.pos), rand);
  const picked: string[] = [];
  for (const v of [...samePos, ...rest]) {
    const label = show(v);
    if (!picked.includes(label)) picked.push(label);
    if (picked.length === CHOICES - 1) break;
  }
  return shuffle([answer, ...picked], rand);
}

/** 읽는 법 답 맞추기: 가타카나/히라가나, 공백 차이는 봐준다. */
export function readingMatches(input: string, reading: string): boolean {
  const norm = (s: string) => kataToHira(s.normalize("NFKC").replace(/\s/g, ""));
  return norm(input) !== "" && norm(input) === norm(reading);
}
