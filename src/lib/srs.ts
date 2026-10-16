import type { CardState, Grade } from "./types";

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const MIN_EASE = 1.3;

export function newCard(now: number): CardState {
  return { due: now, interval: 0, ease: 2.5, reps: 0, lapses: 0 };
}

/** SM-2를 단순화한 간격 반복. 다음 복습 시점을 계산한다. */
export function schedule(card: CardState, grade: Grade, now: number): CardState {
  const next: CardState = { ...card, lastReviewed: now };

  if (grade === "again") {
    next.reps = 0;
    next.lapses = card.lapses + 1;
    next.interval = 0;
    next.ease = Math.max(MIN_EASE, card.ease - 0.2);
    next.due = now + MINUTE;
    return next;
  }

  let interval: number;
  if (grade === "hard") {
    interval = Math.max(1, Math.round(card.interval * 1.2));
    next.ease = Math.max(MIN_EASE, card.ease - 0.15);
  } else if (grade === "good") {
    interval = card.reps === 0 ? 1 : card.reps === 1 ? 3 : Math.round(card.interval * card.ease);
  } else {
    interval = card.reps === 0 ? 4 : Math.round(Math.max(card.interval, 1) * card.ease * 1.3);
    next.ease = card.ease + 0.15;
  }

  next.reps = card.reps + 1;
  next.interval = Math.max(1, interval);
  next.due = now + next.interval * DAY;
  return next;
}

/** 버튼 아래에 보여줄 "다음 복습까지" 라벨 */
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
  return !card.suspended && card.due <= now;
}

/** 외운 단어: 직접 뺐거나, 연달아 두 번 이상 맞힌 카드 */
export function isLearned(card: CardState | undefined): boolean {
  return !!card && (card.suspended === true || card.reps >= 2);
}
