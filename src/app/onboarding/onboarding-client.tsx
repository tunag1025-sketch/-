"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { Icon } from "@/components/Icon";
import { MemoryBar, MemoryLegend } from "@/components/MemoryBar";
import { Headline } from "@/components/PageHeader";
import { useAccount } from "@/lib/account";
import { markOnboarded } from "@/lib/onboarding";

export function OnboardingClient() {
  return (
    <HydrationGate>
      <Onboarding />
    </HydrationGate>
  );
}

type Slide = { key: string; first: string; second: string; body: string; visual: React.ReactNode };

const SLIDES: Slide[] = [
  {
    key: "lyrics",
    first: "좋아하는 노래로",
    second: "일본어 공부해요",
    body: "가사를 붙여넣으면 AI가 후리가나를 달고, 노래에 나온 단어로 단어장과 예문을 만들어 줘요.",
    visual: <LyricsVisual />,
  },
  {
    key: "cards",
    first: "가사 속 단어를",
    second: "카드로 익혀요",
    body: "뜻 떠올리기, 단어 고르기, 가사 빈칸, 읽는 법 쓰기로 연습해요. 노래 속 문형과 한자도 함께 나와요.",
    visual: <QuizVisual />,
  },
  {
    key: "memory",
    first: "잊을 때쯤",
    second: "다시 보여 줘요",
    body: "다시·이해·완벽으로 답하면 다음에 볼 날을 정해 줘요. 단기기억을 거쳐 장기기억까지 하나씩 쌓여요.",
    visual: <MemoryVisual />,
  },
  {
    key: "invite",
    first: "초대받은 사람만",
    second: "가입할 수 있어요",
    body: "Google이나 카카오로 로그인한 뒤 친구에게 받은 초대 코드를 넣으면 가입돼요. 가입하기 전에도 데모곡으로 둘러볼 수 있어요.",
    visual: <InviteVisual />,
  },
];

/** 처음 연 사람에게 보여 주는 안내: 옆으로 넘기는 네 장, 마지막에 로그인 또는 둘러보기 */
function Onboarding() {
  const router = useRouter();
  const { enabled, user } = useAccount();
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

  const goTo = (i: number) => {
    const el = track.current;
    el?.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };
  const finish = (href: string) => {
    markOnboarded();
    router.replace(href);
  };

  return (
    // 아래 탭이 없는 화면이라 main의 아래 여백을 지우고 화면 높이에 맞춘다.
    <div className="-mb-32 flex min-h-[calc(100dvh-env(safe-area-inset-top))] flex-col pb-safe">
      <header className="flex h-16 shrink-0 items-center justify-between">
        <span className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="size-8 rounded-[22%]" />
          <span className="num text-[19px] font-bold">Utango</span>
        </span>
        {!last && (
          <button type="button" onClick={() => finish("/")} className="press -mr-2 px-2 py-2 text-[15px] font-semibold text-ink-3">
            건너뛰기
          </button>
        )}
      </header>

      <div
        ref={track}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="-mx-5 flex flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SLIDES.map((s, i) => (
          <section
            key={s.key}
            aria-roledescription="슬라이드"
            aria-label={`${i + 1} / ${SLIDES.length}`}
            aria-hidden={i !== index}
            className="flex w-full shrink-0 snap-center flex-col px-5"
          >
            <div className="flex min-h-[220px] flex-1 items-center justify-center py-3">{s.visual}</div>
            <Headline as="h2" className="text-[30px]" first={s.first} second={s.second} />
            <p className="mt-3 min-h-[78px] text-[16px] leading-[1.65] break-keep text-ink-2">{s.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-4 flex justify-center gap-1.5">
        {SLIDES.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`${i + 1}번째 안내`}
            aria-current={i === index ? "step" : undefined}
            className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-blue" : "w-2 bg-line"}`}
          />
        ))}
      </div>

      <div className="mt-5 shrink-0 space-y-1 pb-3">
        {!last ? (
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            className="btn-primary press flex h-[54px] w-full items-center justify-center text-[16px] font-bold"
          >
            다음
          </button>
        ) : enabled && !user ? (
          <>
            <button
              type="button"
              onClick={() => finish("/login")}
              className="btn-primary press flex h-[54px] w-full items-center justify-center text-[16px] font-bold"
            >
              로그인하고 시작하기
            </button>
            <button
              type="button"
              onClick={() => finish("/")}
              className="press flex h-11 w-full items-center justify-center text-[15px] font-semibold text-ink-3"
            >
              먼저 둘러보기
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => finish("/")}
            className="btn-primary press flex h-[54px] w-full items-center justify-center text-[16px] font-bold"
          >
            시작하기
          </button>
        )}
      </div>
    </div>
  );
}

function LyricsVisual() {
  return (
    <div className="w-full max-w-[340px]" aria-hidden>
      <div className="card -rotate-2 rounded-[26px] p-4">
        <p className="font-jp flex items-center gap-1.5 text-[13px] font-medium text-ink-3">
          <Icon name="music" className="size-3.5" />
          夜明けのメロディ
        </p>
        <div className="iris mt-3 rounded-[18px] px-4 py-1">
          <p className="font-jp lyric text-[20px] leading-[2.3]">
            <ruby className="vocab-word">
              夜明<rt>よあ</rt>
            </ruby>
            <span className="vocab-word">け</span>
            <ruby>
              前<rt>まえ</rt>
            </ruby>
            の
            <ruby className="vocab-word">
              空<rt>そら</rt>
            </ruby>
            に
          </p>
        </div>
      </div>
      <ul className="mt-4 flex justify-center gap-2">
        {[
          ["夜明け", "새벽"],
          ["空", "하늘"],
          ["星", "별"],
        ].map(([w, m], i) => (
          <li
            key={w}
            className={`card flex items-baseline gap-1.5 rounded-full px-3.5 py-2 ${i === 1 ? "translate-y-2" : ""}`}
          >
            <span className="font-jp text-[17px] font-bold">{w}</span>
            <span className="text-[13px] text-ink-3">{m}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuizVisual() {
  return (
    <div className="w-full max-w-[340px]" aria-hidden>
      <div className="card rounded-[26px] px-5 py-5 text-center">
        <p className="text-[13px] font-medium text-ink-3">이 뜻의 단어는?</p>
        <p className="mt-1 text-[28px] leading-snug font-extrabold">새벽</p>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {["夜明け", "星", "窓", "約束"].map((w, i) => (
          <span
            key={w}
            className={`font-jp flex h-[52px] items-center justify-center gap-1.5 rounded-[18px] text-[18px] font-bold ${
              i === 0 ? "border-[1.5px] border-blue bg-blue-soft text-blue" : "border border-line bg-surface"
            }`}
          >
            {w}
            {i === 0 && <Icon name="check" className="size-4" strokeWidth={2.5} />}
          </span>
        ))}
      </div>
    </div>
  );
}

function MemoryVisual() {
  return (
    <div className="w-full max-w-[340px] space-y-2.5" aria-hidden>
      <div className="card rounded-[26px] p-4">
        <p className="text-center text-[14px] font-bold">이 단어, 어땠어요?</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(
            [
              ["다시", "1분", "bg-danger-soft text-danger"],
              ["이해", "3일", "bg-blue-soft text-blue"],
              ["완벽", "7일", "bg-violet-soft text-violet"],
            ] as const
          ).map(([label, after, tone]) => (
            <span key={label} className={`flex h-[64px] flex-col items-center justify-center rounded-[18px] ${tone}`}>
              <span className="text-[16px] font-bold">{label}</span>
              <span className="num text-[13px] font-medium">{after}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="card rounded-[26px] p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-[13px] font-semibold text-ink-2">기억한 단어</p>
          <p className="text-[13px] text-ink-3">
            <b className="num text-[20px] font-semibold text-ink">29</b> / <span className="num">48</span>
          </p>
        </div>
        <MemoryBar total={48} long={11} short={18} className="mt-2.5 h-2" />
        <MemoryLegend className="mt-2" counts={{ long: 11, short: 18 }} />
      </div>
    </div>
  );
}

function InviteVisual() {
  return (
    <div className="w-full max-w-[340px] text-center" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" className="mx-auto size-20 rounded-[22%] shadow-[0_16px_36px_rgb(47_107_242/0.26)]" />
      <div className="card mx-auto mt-6 max-w-[260px] rounded-[22px] px-5 py-4">
        <p className="text-[12px] font-semibold text-ink-3">초대 코드</p>
        <p className="num mt-1 text-[28px] leading-tight font-semibold tracking-[0.14em]">ABCD-EFGH</p>
      </div>
    </div>
  );
}
