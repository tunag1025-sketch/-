"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/Badge";
import { HydrationGate } from "@/components/HydrationGate";
import { ArrowDot, Icon } from "@/components/Icon";
import { LyricLineView } from "@/components/LyricLineView";
import { CircleButton, TopBar } from "@/components/PageHeader";
import { Sheet } from "@/components/Sheet";
import { Spinner } from "@/components/Spinner";
import { VocabDetail } from "@/components/VocabDetail";
import { VocabRow } from "@/components/VocabRow";
import { startAnalysis, useInFlight } from "@/lib/api-client";
import { isLearned } from "@/lib/srs";
import { useStore } from "@/lib/store";
import type { Song } from "@/lib/types";
import { LineExplain } from "./line-explain";

type Tab = "lyrics" | "vocab" | "grammar";

export function SongClient() {
  const { id } = useParams<{ id: string }>();
  return (
    <HydrationGate>
      <SongScreen id={id} />
    </HydrationGate>
  );
}

function SongScreen({ id }: { id: string }) {
  const song = useStore((s) => s.songs[id]);
  if (!song) {
    return (
      <div className="pt-24 text-center">
        <p className="text-[18px] font-bold">노래를 찾을 수 없어요</p>
        <p className="mt-1 text-[14px] text-ink-3">삭제됐거나 다른 기기에서 추가한 노래예요.</p>
        <Link href="/" className="press mt-5 inline-block rounded-full bg-solid px-5 py-3 text-[14px] font-semibold text-on-solid">
          홈으로
        </Link>
      </div>
    );
  }
  return <SongView song={song} />;
}

function SongView({ song }: { song: Song }) {
  const router = useRouter();
  const furigana = useStore((s) => s.settings.furigana);
  const setSettings = useStore((s) => s.setSettings);
  const removeSong = useStore((s) => s.removeSong);
  const cards = useStore((s) => s.cards);
  const [tab, setTab] = useState<Tab>("lyrics");
  const [openWord, setOpenWord] = useState<string | null>(null);
  const [openLine, setOpenLine] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const word = openWord ? song.vocab.find((v) => v.id === openWord) : undefined;
  const learned = song.vocab.filter((v) => isLearned(cards[v.id])).length;
  const total = song.vocab.length;

  return (
    <div>
      <TopBar
        backHref="/"
        right={
          <>
            <button
              type="button"
              onClick={() => setSettings({ furigana: !furigana })}
              aria-pressed={furigana}
              className={`press font-jp h-11 rounded-full px-4 text-[14px] font-semibold ${
                furigana ? "bg-lime text-on-lime" : "bg-surface text-ink-3"
              }`}
            >
              ふりがな
            </button>
            <CircleButton icon="trash" label="노래 삭제" onClick={() => setConfirmDelete(true)} />
          </>
        }
      />

      <section className="mt-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="lime">{song.level}</Badge>
          {song.isDemo && <Badge tone="lav">데모곡</Badge>}
        </div>
        <h1 className="font-jp mt-3 text-[28px] leading-[1.3] font-bold">{song.title}</h1>
        <p className="mt-1 text-[15px] text-ink-3">{song.artist || "아티스트 미상"}</p>
        {song.summary && <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{song.summary}</p>}
      </section>

      {song.status === "ready" && total > 0 && (
        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <Stat label="단어" value={total} />
          <Stat label="문법" value={song.grammar.length} />
          <Stat label="외운 단어" value={learned} suffix={`/${total}`} />
        </div>
      )}

      <AnalysisStatus song={song} />

      <div className="sticky top-0 z-20 -mx-4 mt-6 mb-3 bg-bg/90 px-4 py-2 backdrop-blur-md">
        <div className="flex gap-2" role="tablist">
          {(
            [
              ["lyrics", "가사", null],
              ["vocab", "단어", total],
              ["grammar", "문법", song.grammar.length],
            ] as const
          ).map(([key, label, count]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`press flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[14px] font-semibold transition-colors ${
                tab === key ? "bg-lime text-on-lime" : "bg-surface text-ink-2"
              }`}
            >
              {label}
              {count ? <span className="num text-[13px] opacity-60">{count}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {tab === "lyrics" && (
        <div className="rounded-[28px] bg-surface px-4 pt-3 pb-4">
          {song.status === "ready" && total > 0 && (
            <p className="mb-2 text-[13px] leading-relaxed text-ink-3">
              색칠된 단어를 누르면 뜻과 예문을, 줄 끝 버튼을 누르면 그 줄 해설을 볼 수 있어요.
            </p>
          )}
          {song.lines.map((line, i) =>
            line.text.trim() ? (
              <div key={i}>
                <div className="flex items-start gap-2">
                  <p className="flex-1 text-[19px] leading-[2.3]">
                    <LyricLineView line={line} index={i} vocab={song.vocab} onWord={setOpenWord} furigana={furigana} />
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpenLine(openLine === i ? null : i)}
                    className={`press mt-3 grid size-8 shrink-0 place-items-center rounded-full ${
                      openLine === i ? "bg-blue text-on-blue" : "bg-muted text-ink-3"
                    }`}
                    aria-label="이 줄 해설 보기"
                    aria-expanded={openLine === i}
                  >
                    <Icon name="sparkle" className="size-4" />
                  </button>
                </div>
                {openLine === i && <LineExplain song={song} index={i} />}
              </div>
            ) : (
              <div key={i} className="h-5" />
            ),
          )}
        </div>
      )}

      {tab === "vocab" && (
        <ul className="divide-y divide-line overflow-hidden rounded-[28px] bg-surface">
          {total === 0 && <EmptyAnalysis song={song} />}
          {song.vocab.map((v) => (
            <VocabRow key={v.id} item={v} suspended={cards[v.id]?.suspended} onClick={() => setOpenWord(v.id)} />
          ))}
        </ul>
      )}

      {tab === "grammar" && (
        <ul className="space-y-2.5">
          {song.grammar.length === 0 && (
            <li className="rounded-[28px] bg-surface">
              <EmptyAnalysis song={song} />
            </li>
          )}
          {song.grammar.map((g, i) => (
            <li key={i} className="rounded-[28px] bg-surface px-5 py-4">
              <p className="font-jp text-[20px] font-bold text-blue">{g.pattern}</p>
              <p className="mt-0.5 text-[15px] font-semibold">{g.meaning}</p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{g.explanation}</p>
              {song.lines[g.line] && (
                <p className="mt-3 rounded-2xl bg-muted px-3.5 py-2 text-[16px] leading-[2.1]">
                  <LyricLineView line={song.lines[g.line]} index={g.line} vocab={[]} furigana={furigana} />
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {song.status === "ready" && total > 0 && (
        <Link
          href={`/review?song=${song.id}`}
          className="press mt-6 flex items-center justify-between rounded-full bg-solid py-2 pr-2 pl-6 text-[16px] font-semibold text-on-solid"
        >
          이 노래 단어 복습하기
          <ArrowDot />
        </Link>
      )}

      <Sheet open={!!word} onClose={() => setOpenWord(null)} title={song.title}>
        {word && <VocabDetail item={word} song={song} />}
      </Sheet>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="노래 삭제">
        <p className="font-jp text-[20px] font-bold">{song.title}</p>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          이 노래와 단어장, 복습 기록이 모두 지워져요. 되돌릴 수 없어요.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="press rounded-full bg-muted py-3.5 text-[15px] font-semibold"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              removeSong(song.id);
              router.replace("/");
            }}
            className="press rounded-full bg-danger py-3.5 text-[15px] font-semibold text-white"
          >
            삭제
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-[22px] bg-surface px-3.5 py-3">
      <p className="num text-[24px] leading-none font-semibold">
        {value}
        {suffix && <span className="text-[14px] font-medium text-ink-3">{suffix}</span>}
      </p>
      <p className="mt-1.5 text-[12px] font-medium text-ink-3">{label}</p>
    </div>
  );
}

function AnalysisStatus({ song }: { song: Song }) {
  const inFlight = useInFlight((s) => s.ids.has(song.id));
  if (song.status === "ready") return null;

  if (song.status === "analyzing" && inFlight) {
    return (
      <div className="mt-5 flex items-center gap-3 rounded-[24px] bg-lav px-4 py-4 text-on-lav">
        <Spinner className="size-5 shrink-0" />
        <div className="text-[14px]">
          <p className="font-semibold">AI가 단어장과 예문을 만들고 있어요</p>
          <p className="opacity-75">1~2분 걸려요. 그동안 가사를 먼저 읽어 보세요.</p>
        </div>
      </div>
    );
  }

  const message =
    song.status === "error" ? song.error : "단어장 만들기가 중간에 멈췄어요. 앱을 닫거나 새로고침하면 멈춰요.";
  return (
    <div className="mt-5 rounded-[24px] bg-surface px-4 py-4">
      <p className="flex gap-2 text-[14px] leading-relaxed text-ink-2">
        <Icon name="info" className="mt-0.5 size-[18px] shrink-0 text-danger" />
        {message}
      </p>
      <button
        type="button"
        onClick={() => startAnalysis(song.id, { retokenize: true })}
        className="press mt-3 flex items-center gap-1.5 rounded-full bg-solid px-4 py-2.5 text-[14px] font-semibold text-on-solid"
      >
        <Icon name="refresh" className="size-4" /> 단어장 다시 만들기
      </button>
    </div>
  );
}

function EmptyAnalysis({ song }: { song: Song }) {
  return (
    <p className="px-4 py-10 text-center text-[14px] text-ink-3">
      {song.status === "analyzing" ? "단어장을 만드는 중이에요…" : "아직 단어장이 없어요."}
    </p>
  );
}
