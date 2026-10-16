import type { CardState, Grade } from "./types";

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const MIN_EASE = 1.3;

/** '완벽'을 연달아 이만큼 고르면 장기기억으로 옮긴다. */
export const LEARNED_PERFECT_STREAK = 3;
/** 다음 학습이 이만큼(일) 뒤로 밀리면 장기기억으로 옮긴다. */
export const LEARNED_INTERVAL_DAYS = 21;

export function newCard(now: number): CardState {
  return { due: now, interval: 0, ease: 2.5, reps: 0, lapses: 0, perfect: 0 };
}

/**
 * SM-2를 단순화한 간격 반복.
 *  다시: 1분 뒤 다시 (이번 학습 안에서 한 번 더)
 *  이해: 1일 → 3일 → 간격 × 쉬움 정도
 *  완벽: 4일 → 간격 × 쉬움 정도 × 1.3
 */
export function schedule(card: CardState, grade: Grade, now: number): CardState {
  const next: CardState = { ...card, lastReviewed: now };

  if (grade === "again") {
    next.reps = 0;
    next.lapses = card.lapses + 1;
    next.perfect = 0;
    next.interval = 0;
    next.ease = Math.max(MIN_EASE, card.ease - 0.2);
    next.due = now + MINUTE;
    return next;
  }

  let interval: number;
  if (grade === "good") {
    interval = card.reps === 0 ? 1 : card.reps === 1 ? 3 : Math.round(card.interval * card.ease);
    next.perfect = 0;
  } else {
    interval = card.reps === 0 ? 4 : Math.round(Math.max(card.interval, 1) * card.ease * 1.3);
    next.ease = card.ease + 0.15;
    next.perfect = (card.perfect ?? 0) + 1;
  }

  next.reps = card.reps + 1;
  next.correct = (card.correct ?? 0) + 1;
  next.interval = Math.max(1, interval);
  next.due = now + next.interval * DAY;
  if (!next.learned && reachesLearned(next)) {
    next.learned = true;
    next.learnedAt = now;
  }
  return next;
}

function reachesLearned(card: CardState): boolean {
  return (card.perfect ?? 0) >= LEARNED_PERFECT_STREAK || card.interval >= LEARNED_INTERVAL_DAYS;
}

/** 이 답을 고르면 장기기억으로 넘어가는지 */
export function graduates(card: CardState, grade: Grade, now: number): boolean {
  return !card.learned && !!schedule(card, grade, now).learned;
}

/** 버튼 아래에 보여줄 "다음 학습까지" 라벨 */
export function intervalLabel(card: CardState, grade: Grade, now: number): string {
  const ms = schedule(card, grade, now).due - now;
  if (ms < DAY) return "1분";
  const days = Math.round(ms / DAY);
  if (days < 30) return `${days}일`;
  if (days < 365) return `${Math.round(days / 30)}개월`;
  return `${Math.round(days / 365)}년`;
}

export function isDue(card: CardState | undefined, now: number): boolean {
  if (!card) return true;
  return !card.learned && card.due <= now;
}

/** 장기기억인지 */
export function isLearned(card: CardState | undefined): boolean {
  return card?.learned === true;
}

/**
 * 단어의 기억 단계
 *  long  장기기억: 완벽 3번 연속, 3주 넘게 기억, 또는 직접 옮김
 *  short 단기기억: 이해·완벽을 한 번이라도 고름
 *  none  아직
 */
export type Memory = "long" | "short" | "none";

export function memoryOf(card: CardState | undefined): Memory {
  if (!card) return "none";
  if (card.learned) return "long";
  // correct가 생기기 전 기록은 연속으로 맞힌 횟수(reps)로 본다.
  return (card.correct ?? card.reps) > 0 ? "short" : "none";
}

/** 단어 목록의 진척도: 장기기억 수, 단기기억 수(장기 제외) */
export function progressOf(
  vocab: { id: string }[],
  cards: Record<string, CardState>,
): { total: number; long: number; short: number } {
  let long = 0;
  let short = 0;
  for (const v of vocab) {
    const m = memoryOf(cards[v.id]);
    if (m === "long") long++;
    else if (m === "short") short++;
  }
  return { total: vocab.length, long, short };
}
