"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon, IconCircle } from "@/components/Icon";
import { CircleLink, Headline } from "@/components/PageHeader";
import { graduates, intervalLabel, memoryOf } from "@/lib/srs";
import { streak } from "@/lib/stats";
import { useStore } from "@/lib/store";
import type { CardState, Grade } from "@/lib/types";

// 답마다 색을 달리한다: 다시(빨강) · 이해(파랑) · 완벽(보라)
const GRADES: { grade: Grade; label: string; tone: string }[] = [
  { grade: "again", label: "다시", tone: "bg-danger-soft text-danger" },
  { grade: "good", label: "이해", tone: "bg-blue-soft text-blue" },
  { grade: "perfect", label: "완벽", tone: "bg-violet-soft text-violet" },
];

/**
 * 학습 한 번의 진행: 시작할 때 목록을 고정하고, "다시"를 누른 카드는 뒤에 다시 붙인다.
 * id는 화면에서 쓰는 이름(단어는 vocab id), keyOf로 카드 열쇠를 얻는다.
 * countNew를 끄면 처음 보는 카드를 하루 새 단어 몫에 세지 않는다 (문법·한자).
 */
export function useStudySession({
  initial,
  keyOf,
  nameOf,
  countNew = true,
}: {
  initial: string[];
  keyOf: (id: string) => string;
  nameOf: (id: string) => string;
  countNew?: boolean;
}) {
  const grade = useStore((s) => s.grade);
  const [queue, setQueue] = useState(initial);
  const [pos, setPos] = useState(0);
  const [stats, setStats] = useState({ done: 0, learned: 0, short: 0 });
  // 처음 배우는 카드는 '학습', 다시 보는 카드는 '복습'으로 보여 준다.
  const [fresh] = useState(() => {
    const { cards } = useStore.getState();
    return new Set(initial.filter((id) => !cards[keyOf(id)]));
  });
  const [toast, setToast] = useState<{ n: number; text: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const current = queue[pos];

  function advance(done: boolean, learned: boolean) {
    setStats((s) => ({ ...s, done: s.done + (done ? 1 : 0), learned: s.learned + (learned ? 1 : 0) }));
    if (learned) {
      setToast((t) => ({ n: (t?.n ?? 0) + 1, text: `${nameOf(current)} · 장기기억으로 옮겼어요` }));
      // "다시"로 뒤에 붙여 둔 같은 카드도 뺀다.
      setQueue((q) => q.filter((id, i) => i <= pos || id !== current));
    }
    setPos((p) => p + 1);
    window.scrollTo({ top: 0 });
  }

  function answer(g: Grade) {
    const key = keyOf(current);
    const before = memoryOf(useStore.getState().cards[key]);
    grade(key, g, { countNew });
    const after = memoryOf(useStore.getState().cards[key]);
    if (before === "none" && after === "short") setStats((s) => ({ ...s, short: s.short + 1 }));
    if (g === "again") setQueue((q) => [...q, current]);
    advance(g !== "again", after === "long" && before !== "long");
  }

  return {
    queue,
    pos,
    current,
    next: queue[pos + 1] as string | undefined,
    fresh,
    stats,
    toast,
    answer,
    /** 직접 장기기억으로 옮긴 뒤 다음 카드로 */
    markedLearned: () => advance(true, true),
  };
}

/** 위 막대: 닫기 · 제목 · 몇 번째 + 진행 막대 */
export function SessionHeader({
  exitHref,
  title,
  pos,
  total,
}: {
  exitHref: string;
  title: string;
  pos: number;
  total: number;
}) {
  return (
    <>
      <header className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div>
          <CircleLink href={exitHref} icon="close" label="학습 그만하기" />
        </div>
        <span className="text-[16px] font-semibold">{title}</span>
        <span className="num text-right text-[14px] font-semibold text-ink-3">
          {pos + 1}/{total}
        </span>
      </header>
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-[image:var(--grad-text)] transition-all"
          style={{ width: `${(pos / total) * 100}%` }}
        />
      </div>
    </>
  );
}

/** 화면 아래에 붙는 버튼 자리 */
export function BottomBar({ wide = false, children }: { wide?: boolean; children: React.ReactNode }) {
  return (
    <div className="pb-safe fixed inset-x-0 bottom-0 z-30">
      <div className={`mx-auto max-w-xl pb-[22px] ${wide ? "px-3" : "px-5"}`}>{children}</div>
    </div>
  );
}

const SHEET = "rounded-[30px] border border-line bg-surface px-3.5 pt-4 pb-3.5 shadow-[0_-8px_30px_rgb(31_59_120/0.10)]";

/** 이 단어, 어땠어요? 다시 · 이해 · 완벽 */
export function GradeSheet({
  state,
  now,
  title = "이 단어, 어땠어요?",
  onAnswer,
}: {
  state: CardState;
  now: number;
  title?: string;
  onAnswer: (g: Grade) => void;
}) {
  return (
    <BottomBar wide>
      <div className={SHEET}>
        <p className="text-center text-[15px] font-bold">{title}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {GRADES.map((g) => (
            <button
              key={g.grade}
              type="button"
              onClick={() => onAnswer(g.grade)}
              className={`press flex h-[60px] flex-col items-center justify-center gap-px rounded-[18px] ${g.tone}`}
            >
              <span className="text-[16px] font-bold">{g.label}</span>
              <span className="num text-[12px] font-medium">
                {graduates(state, g.grade, now) ? "장기기억으로" : intervalLabel(state, g.grade, now)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </BottomBar>
  );
}

/** 틀렸을 때: 잠시 뒤에 다시 나온다는 안내 + 다음 */
export function WrongSheet({ text = "틀린 단어는 잠시 뒤에 다시 나와요.", onNext }: { text?: string; onNext: () => void }) {
  return (
    <BottomBar wide>
      <div className={SHEET}>
        <p className="text-center text-[14px] text-ink-3">{text}</p>
        <button
          type="button"
          onClick={onNext}
          className="btn-primary press mt-3 flex h-[54px] w-full items-center justify-center text-[16px] font-bold"
        >
          다음
        </button>
      </div>
    </BottomBar>
  );
}

/** 장기기억으로 옮겼을 때 위에 잠깐 뜨는 알림 */
export function Toast({ toast }: { toast: { n: number; text: string } | null }) {
  if (!toast) return null;
  return (
    <div className="pt-safe pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4" role="status">
      <p
        key={toast.n}
        className="font-jp mt-3 flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[14px] font-semibold text-bg shadow-lg"
      >
        <Icon name="check" className="size-4" />
        {toast.text}
      </p>
    </div>
  );
}

const GHOST =
  "press grid h-[54px] place-items-center rounded-full border border-line bg-surface text-[15px] font-semibold text-ink-2";
const PRIMARY = "btn-primary press grid h-[54px] place-items-center text-[15px] font-bold";

/** 학습을 마친 화면 */
export function Finished({
  total,
  learned,
  short,
  unit = "단어",
  studiedNew,
  songTitle,
  empty,
  emptyText,
  exitHref,
  more,
}: {
  total: number;
  learned: number;
  short: number;
  /** 무엇을 학습했는지 (설명 문구에 쓴다) */
  unit?: "단어" | "문법" | "한자";
  /** 새 카드가 있었으면 '학습', 다시 보는 카드만 있었으면 '복습' */
  studiedNew: boolean;
  songTitle?: string;
  empty: boolean;
  emptyText: string;
  exitHref: string;
  /** 더 학습할 수 있으면 그 버튼 */
  more?: { href: string; label: string } | null;
}) {
  const reviewLog = useStore((s) => s.reviewLog);
  const [now] = useState(Date.now);
  const days = streak(reviewLog, now);
  const verb = studiedNew ? "학습" : "복습";
  const what = unit === "문법" ? "문법을" : `${unit}를`;
  const exitLabel = exitHref === "/" ? "홈으로" : exitHref === "/study" ? "학습 설정" : "노래로";

  return (
    <div className="flex flex-col items-center pt-[72px] pb-32 text-center">
      {empty ? (
        <IconCircle name="cards" className="size-[76px]" />
      ) : (
        <span className="grid size-[76px] place-items-center rounded-full bg-btn text-white">
          <Icon name="check" className="size-9" strokeWidth={2.5} />
        </span>
      )}
      <Headline
        className="mt-6 text-[30px]"
        first={empty ? "지금은" : `오늘 ${unit === "단어" ? "" : `${unit} `}${verb}`}
        second={empty ? "쉬어도 돼요" : "완료했어요!"}
      />
      <p className="mt-2.5 text-[15px] text-ink-3">
        {empty
          ? emptyText
          : songTitle
            ? `'${songTitle}' ${what} 모두 ${verb}했어요.`
            : `오늘 몫의 ${what} 모두 ${verb}했어요.`}
      </p>
      {!empty && (
        <div className="card mt-8 w-full p-5">
          <p className="flex items-baseline justify-center gap-1">
            <span className="num text-[56px] leading-none font-medium tracking-[-0.04em]">{total}</span>
            <span className="text-[16px] font-bold text-ink-2">개 {verb}</span>
          </p>
          <div className="mt-[18px] grid grid-cols-3 divide-x divide-line border-t border-line pt-4">
            {(
              [
                [short, "새 단기기억", ""],
                [learned, "새 장기기억", ""],
                [days, "일 연속", "text-pink"],
              ] as const
            ).map(([n, label, tone]) => (
              <div key={label}>
                <p className={`num text-[24px] leading-none font-medium ${tone}`}>{n}</p>
                <p className="mt-1.5 text-[13px] text-ink-3">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-30">
        <div className="mx-auto grid max-w-xl grid-cols-[1fr_1.4fr] gap-2.5 px-5 pb-[30px]">
          {more ? (
            <>
              <Link href={exitHref} className={GHOST}>
                {exitLabel}
              </Link>
              <Link href={more.href} replace className={PRIMARY}>
                {more.label}
              </Link>
            </>
          ) : (
            <>
              <Link href={unit === "단어" ? "/vocab" : "/study"} className={GHOST}>
                {unit === "단어" ? "단어장 보기" : "학습 설정"}
              </Link>
              <Link href={empty && unit === "단어" ? "/songs/new" : exitHref} className={PRIMARY}>
                {empty && unit === "단어" ? "노래 추가하기" : exitLabel}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
