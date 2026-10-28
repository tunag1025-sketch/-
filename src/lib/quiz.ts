import { type Conjugation, conjugate } from "./conjugate";
import { kataToHira } from "./furigana";
import { matchTokens } from "./highlight";
import type { Song, VocabItem } from "./types";

/**
 * 문제 유형
 *  recall  단어를 보고 뜻 떠올리기 (카드 뒤집기)
 *  choice  뜻을 보고 단어 고르기
 *  listen  발음을 듣고 뜻 고르기
 *  blank   가사 빈칸에 들어갈 말 고르기
 *  form    사전형을 가사에 나온 활용형으로 바꾸기 (동사·형용사)
 *  reading 읽는 법 쓰기
 */
export type QuizType = "recall" | "choice" | "listen" | "blank" | "form" | "reading";

export const QUIZ_TYPES: { type: QuizType; label: string; hint: string }[] = [
  { type: "recall", label: "뜻 떠올리기", hint: "단어를 보고 뜻을 떠올린 뒤 뒤집어 봐요" },
  { type: "choice", label: "단어 고르기", hint: "뜻을 보고 4개 중에 골라요" },
  { type: "listen", label: "듣고 뜻 고르기", hint: "발음을 듣고 뜻을 골라요 · 소리를 켜 주세요" },
  { type: "blank", label: "가사 빈칸", hint: "가사에서 빈칸에 들어갈 말을 골라요" },
  { type: "form", label: "활용형 고르기", hint: "동사·형용사가 가사에서 어떤 꼴로 바뀌었는지 골라요" },
  { type: "reading", label: "읽는 법 쓰기", hint: "히라가나로 써요 · 일본어 자판 필요" },
];

export const DEFAULT_QUIZ_TYPES: QuizType[] = ["recall", "choice", "listen", "blank", "form"];

/**
 * 새로 생긴 유형 중 기본으로 켜는 것은 예전 설정에도 켜 준다.
 * knownQuizTypes(사용자에게 이미 보여 준 유형)에 없는 것만 더해서, 사용자가 끈 유형은 다시 켜지 않는다.
 * knownQuizTypes가 없던 때의 유형: 뜻 떠올리기 · 단어 고르기 · 가사 빈칸 · 읽는 법 쓰기
 */
export function withNewQuizTypes<S extends { quizTypes: QuizType[]; knownQuizTypes?: QuizType[] }>(settings: S): S {
  const known = settings.knownQuizTypes ?? ["recall", "choice", "blank", "reading"];
  const all = QUIZ_TYPES.map((q) => q.type);
  if (all.every((t) => known.includes(t))) return settings;
  const added = DEFAULT_QUIZ_TYPES.filter((t) => !known.includes(t) && !settings.quizTypes.includes(t));
  return { ...settings, quizTypes: [...settings.quizTypes, ...added], knownQuizTypes: all };
}

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

/**
 * 활용형 문제: 가사에 나온 활용형(정답)과 같은 단어의 다른 활용형 보기 3개.
 * 가사 속 형태가 활용형 목록에 있을 때만 낸다. 정답과 앞부분이 겹치는 형태(離れて / 離れても)는 둘 다 말이 되니 뺀다.
 */
export function formQuestion(
  item: VocabItem,
  song: Song,
  rand: () => number = Math.random,
): { answer: string; form: Conjugation; choices: string[] } | null {
  const answer = blankAnswer(item, song);
  if (!answer || answer === item.word) return null;
  const all = conjugate(item);
  const form = all.find((c) => c.form === answer);
  if (!form) return null;
  const others = all.filter((c) => !c.form.startsWith(answer) && !answer.startsWith(c.form)).map((c) => c.form);
  if (others.length < CHOICES - 1) return null;
  // 끝이 닮은 형태(眠らない · 眠れない)를 두 개, 나머지 하나는 아무거나
  const tail = (f: string) => {
    let n = 0;
    while (n < f.length && n < answer.length && f.at(-1 - n) === answer.at(-1 - n)) n++;
    return n;
  };
  const ranked = shuffle(others, rand).sort((a, b) => tail(b) - tail(a));
  const rest = shuffle(ranked.slice(2), rand);
  return { answer, form, choices: shuffle([answer, ranked[0], ranked[1], rest[0]], rand) };
}

/** 이 단어로 낼 수 있는 유형인지 */
export function canAsk(type: QuizType, item: VocabItem, song: Song, poolSize: number): boolean {
  switch (type) {
    case "recall":
      return true;
    case "choice":
      return poolSize >= CHOICES;
    case "listen":
      return poolSize >= CHOICES && !!item.reading;
    case "form":
      return formQuestion(item, song) !== null;
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
