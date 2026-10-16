"use client";

import { useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/Icon";
import { resetPreviewData } from "@/lib/preview";

type Screen = { path: string; title: string; note?: string };

// 주소 뒤의 값은 미리보기에서만 쓰는 처음 상태다 (src/lib/preview.ts, 각 화면 참고).
const GROUPS: { title: string; dark?: boolean; screens: Screen[] }[] = [
  {
    title: "홈",
    screens: [
      { path: "/", title: "홈", note: "오늘 학습 · 나의 기록 · 내 노래" },
      { path: "/?as=guest", title: "홈 · 로그인 전", note: "로그인 안내가 보여요" },
    ],
  },
  {
    title: "노래",
    screens: [
      { path: "/songs/demo-yoake", title: "노래 · 가사" },
      { path: "/songs/demo-yoake?line=1", title: "노래 · 줄 해설 펼침" },
      { path: "/songs/demo-yoake?tab=vocab", title: "노래 · 단어" },
      { path: "/songs/demo-yoake?tab=vocab&word=夜明け", title: "노래 · 단어 카드" },
      { path: "/songs/demo-yoake?tab=grammar", title: "노래 · 문법" },
      { path: "/songs/pv-new", title: "노래 · 단어장 만드는 중" },
      { path: "/songs/pv-error", title: "노래 · 만들기 실패" },
      { path: "/songs/new", title: "노래 추가" },
      { path: "/songs/new?q=Utango", title: "노래 추가 · 검색 결과" },
    ],
  },
  {
    title: "단어장",
    screens: [
      { path: "/vocab", title: "단어장" },
      { path: "/vocab?word=君", title: "단어장 · 단어 카드", note: "두 노래에 나오는 단어" },
      { path: "/vocab?view=grammar", title: "단어장 · 문법", note: "모은 문형과 기억 상태" },
      { path: "/vocab?view=kanji", title: "단어장 · 한자", note: "모은 단어 속 한자" },
    ],
  },
  {
    title: "학습",
    screens: [
      { path: "/study", title: "학습 설정" },
      { path: "/review?quiz=recall", title: "학습 · 뜻 떠올리기" },
      { path: "/review?quiz=recall&reveal=1", title: "학습 · 뜻 보기" },
      { path: "/review?quiz=choice", title: "학습 · 단어 고르기" },
      { path: "/review?quiz=choice&reveal=wrong", title: "학습 · 틀렸을 때" },
      { path: "/review?quiz=blank", title: "학습 · 빈칸 채우기" },
      { path: "/review?quiz=reading", title: "학습 · 읽는 법 쓰기" },
      { path: "/review?quiz=reading&reveal=1", title: "학습 · 맞혔을 때" },
      { path: "/review?done=1", title: "학습 · 다 했어요" },
      { path: "/review?quiz=grammar", title: "학습 · 문형 카드", note: "단어 사이에 섞여 나와요 · 뜻 떠올리기 · 가사 빈칸" },
      { path: "/review?kind=kanji", title: "한자 카드", note: "훈음 떠올리기 · 고르기" },
      { path: "/review?kind=weak", title: "자주 틀린 단어" },
    ],
  },
  {
    title: "계정",
    screens: [
      { path: "/settings", title: "설정", note: "관리자 계정 · 동기화 · 초대 · 백업" },
      { path: "/settings?as=guest", title: "설정 · 로그인 전" },
      { path: "/login?as=guest", title: "로그인" },
      { path: "/invite/SAMPLE7Q2K?as=guest", title: "초대 받기" },
    ],
  },
  {
    title: "어두운 화면",
    dark: true,
    screens: [
      { path: "/", title: "홈" },
      { path: "/songs/demo-yoake", title: "노래 · 가사" },
      { path: "/review?quiz=recall&reveal=1", title: "학습 · 뜻 보기" },
      { path: "/vocab", title: "단어장" },
    ],
  },
];

function screenUrl(path: string, dark?: boolean) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}preview=1${dark ? "&theme=dark" : ""}`;
}

const noop = () => () => {};

/** 모든 화면을 샘플 데이터로 한눈에 보는 페이지 (디자인 검토용) */
export function PreviewClient() {
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const [copied, setCopied] = useState(false);
  const all = GROUPS.flatMap((g) =>
    g.screens.map((s) => ({ ...s, group: g.title, url: origin + screenUrl(s.path, g.dark) })),
  );

  async function copyAll() {
    const text = all.map((s) => `${s.group} · ${s.title}\n${s.url}`).join("\n\n");
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-bg">
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-24 sm:px-8">
        <header className="max-w-2xl">
          <p className="text-[14px] font-semibold text-blue">Utango</p>
          <h1 className="mt-1 text-[30px] leading-tight font-extrabold tracking-[-0.03em]">화면 미리보기</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
            샘플 노래와 학습 기록으로 모든 화면을 볼 수 있어요. 화면마다 따로 열리는 주소가 있어서 디자인 도구에 하나씩
            넣을 수도 있어요. 여기서 바꾼 내용은 이 탭에만 남고, 진짜 기록과 계정에는 영향이 없어요.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={copyAll} className="btn-primary press flex items-center gap-1.5 px-5 py-3 text-[15px] font-semibold">
              <Icon name={copied ? "check" : "copy"} className="size-4" />
              {copied ? "복사했어요" : "주소 모두 복사"}
            </button>
            <button
              type="button"
              onClick={() => {
                resetPreviewData();
                window.location.reload();
              }}
              className="btn-ghost press px-5 py-3 text-[15px] font-semibold"
            >
              샘플 데이터 처음으로
            </button>
            {/* 새로 열어야 미리보기가 꺼진다 */}
            <button
              type="button"
              onClick={() => window.location.replace(new URL("/?preview=0", window.location.origin))}
              className="btn-ghost press px-5 py-3 text-[15px] font-semibold"
            >
              미리보기 끝내기
            </button>
          </div>
        </header>

        {GROUPS.map((g) => (
          <section key={g.title} className="mt-12">
            <h2 className="text-[19px] font-bold">{g.title}</h2>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-7">
              {g.screens.map((s) => {
                const href = screenUrl(s.path, g.dark);
                return (
                  <li key={href} className="w-[195px]">
                    <div className="relative h-[422px] w-[195px] overflow-hidden rounded-[26px] border border-line bg-surface shadow-[var(--shadow)]">
                      <iframe
                        src={href}
                        title={s.title}
                        loading="lazy"
                        className="pointer-events-none absolute top-0 left-0 h-[844px] w-[390px] origin-top-left scale-50 border-0"
                      />
                    </div>
                    <a href={href} target="_blank" rel="noreferrer" className="mt-2.5 flex items-start gap-1 text-[14px] font-semibold">
                      <span className="min-w-0 flex-1">{s.title}</span>
                      <Icon name="arrowUpRight" className="mt-0.5 size-4 shrink-0 text-ink-3" />
                    </a>
                    {s.note && <p className="mt-0.5 text-[12px] leading-snug text-ink-3">{s.note}</p>}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        <section className="mt-14">
          <h2 className="text-[19px] font-bold">주소 목록</h2>
          <p className="mt-1 text-[14px] text-ink-3">주소 하나가 화면 하나예요. 새 탭에서 열어도 샘플 데이터로 보여요.</p>
          <ol className="card mt-4 divide-y divide-line overflow-hidden">
            {all.map((s) => (
              <li key={s.url} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                <span className="w-56 shrink-0 text-[14px] font-semibold">
                  {s.group} · {s.title}
                </span>
                <a href={s.url} target="_blank" rel="noreferrer" className="num min-w-0 truncate text-[13px] text-blue">
                  {decodeURI(s.url)}
                </a>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
