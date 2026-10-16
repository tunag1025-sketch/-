"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/Badge";
import { HydrationGate } from "@/components/HydrationGate";
import { Icon } from "@/components/Icon";
import { LyricLineView } from "@/components/LyricLineView";
import { BackButton } from "@/components/PageHeader";
import { Sheet } from "@/components/Sheet";
import { Spinner } from "@/components/Spinner";
import { Heart, Sparkle } from "@/components/Stickers";
import { VocabDetail } from "@/components/VocabDetail";
import { VocabRow } from "@/components/VocabRow";
import { startAnalysis, useInFlight } from "@/lib/api-client";
import { useStore } from "@/lib/store";
import { toneFor } from "@/lib/tone";
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
        <p className="font-display text-2xl">404</p>
        <p className="mt-1 font-semibold">노래를 찾을 수 없어요</p>
        <Link href="/" className="mt-4 inline-block rounded-full border-2 border-edge px-4 py-2 text-sm font-bold">
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

  const word = openWord ? song.vocab.find((v) => v.id === openWord) : undefined;

  function remove() {
    if (!confirm(`'${song.title}'을(를) 삭제할까요? 이 노래의 단어 복습 기록도 함께 지워져요.`)) return;
    removeSong(song.id);
    router.replace("/");
  }

  return (
    <div className="pt-4">
      <header className="flex items-center justify-between">
        <BackButton href="/" />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSettings({ furigana: !furigana })}
            className={`sticker-sm press font-pixel rounded-full px-3.5 py-1.5 text-[15px] ${
              furigana ? "bg-lemon text-black" : "bg-surface text-ink-3"
            }`}
            aria-pressed={furigana}
          >
            ふりがな {furigana ? "ON" : "OFF"}
          </button>
          <button
            onClick={remove}
            className="sticker-sm press grid size-10 place-items-center rounded-full bg-surface text-ink-2"
            aria-label="노래 삭제"
          >
            <Icon name="trash" className="size-[18px]" />
          </button>
        </div>
      </header>

      <section className={`sticker relative mt-4 overflow-hidden px-5 pt-4 pb-5 text-black ${toneFor(song.id)}`}>
        <div className="dots absolute inset-0" />
        <div className="relative">
          <p className="font-mono text-[11px] font-bold tracking-wider">[ NOW STUDYING ]</p>
          <h1 className="font-display mt-2 pr-10 text-[27px] leading-[1.25]">{song.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border-[1.5px] border-black bg-white px-2 py-px font-mono text-[11px] font-bold">
              {song.artist || "unknown artist"}
            </span>
            <Badge tone="black" pixel>
              {song.level}
            </Badge>
            {song.isDemo && (
              <Badge tone="pink" pixel className="-rotate-6">
                DEMO
              </Badge>
            )}
          </div>
        </div>
        <Sparkle className="absolute top-3 right-4 w-7" color="#ffffff" />
        <Heart className="absolute right-12 bottom-3 w-6 -rotate-12" />
      </section>

      {song.summary && <p className="mt-4 px-1 text-[15px] leading-relaxed text-ink-2">{song.summary}</p>}

      <AnalysisStatus song={song} />

      <div className="sticky top-0 z-20 -mx-4 mt-5 mb-4 px-4 py-2.5 backdrop-blur-md">
        <div className="flex gap-1 rounded-full border-2 border-edge bg-surface p-1" role="tablist">
          {(
            [
              ["lyrics", "가사", null],
              ["vocab", "단어", song.vocab.length],
              ["grammar", "문법", song.grammar.length],
            ] as const
          ).map(([key, label, count]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`flex flex-1 items-center justify-center gap-1 rounded-full py-2 text-[14px] font-bold transition-colors ${
                tab === key ? "bg-ink text-bg" : "text-ink-3"
              }`}
            >
              {label}
              {count ? <span className="font-pixel text-[13px] opacity-80">{count}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {tab === "lyrics" && (
        <div className="sticker px-4 py-4">
          {song.status === "ready" && song.vocab.length > 0 && (
            <p className="mb-3 rounded-xl bg-surface-2 px-3 py-2 text-xs leading-relaxed text-ink-2">
              <span className="vocab-word font-bold">형광펜 단어</span>를 누르면 뜻과 예문이, ✦ 를 누르면 그 줄 해설이 나와요.
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
                    className={`mt-3 grid size-8 shrink-0 place-items-center rounded-full border-2 ${
                      openLine === i ? "border-black bg-pink text-black" : "border-line text-ink-3"
                    }`}
                    aria-label="이 줄 해설 보기"
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
        <ul className="sticker divide-y divide-line overflow-hidden">
          {song.vocab.length === 0 && <EmptyAnalysis song={song} />}
          {song.vocab.map((v) => (
            <VocabRow key={v.id} item={v} suspended={cards[v.id]?.suspended} onClick={() => setOpenWord(v.id)} />
          ))}
        </ul>
      )}

      {tab === "grammar" && (
        <ul className="space-y-3">
          {song.grammar.length === 0 && (
            <li className="sticker">
              <EmptyAnalysis song={song} />
            </li>
          )}
          {song.grammar.map((g, i) => (
            <li key={i} className="sticker px-4 py-4">
              <div className="flex items-baseline gap-2">
                <span className="font-pixel text-[13px] text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-display text-[20px] text-pink-text">{g.pattern}</span>
                <span className="text-[15px] font-extrabold">{g.meaning}</span>
              </div>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{g.explanation}</p>
              {song.lines[g.line] && (
                <p className="mt-3 rounded-2xl border-2 border-edge bg-lemon/50 px-3 py-2 text-[16px] leading-[2.1] dark:bg-lemon/15">
                  <LyricLineView line={song.lines[g.line]} index={g.line} vocab={[]} furigana={furigana} />
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {song.status === "ready" && song.vocab.length > 0 && (
        <Link
          href={`/review?song=${song.id}`}
          className="sticker-sm press mt-8 flex items-center justify-center gap-2 rounded-full bg-black px-4 py-4 font-bold text-white"
        >
          <Icon name="cards" /> 이 노래 단어 복습하기
        </Link>
      )}

      <Sheet open={!!word} onClose={() => setOpenWord(null)} title={song.title}>
        {word && <VocabDetail item={word} song={song} />}
      </Sheet>
    </div>
  );
}

function AnalysisStatus({ song }: { song: Song }) {
  const inFlight = useInFlight((s) => s.ids.has(song.id));
  if (song.status === "ready") return null;

  if (song.status === "analyzing" && inFlight) {
    return (
      <div className="sticker mt-4 flex items-center gap-3 bg-lav px-4 py-3.5 text-sm text-black">
        <Spinner className="size-5 shrink-0" />
        <div>
          <p className="font-bold">AI가 단어장과 예문을 만들고 있어요</p>
          <p className="opacity-75">1~2분 정도 걸려요. 그동안 후리가나 가사를 먼저 읽어 보세요.</p>
        </div>
      </div>
    );
  }

  const message =
    song.status === "error" ? song.error : "단어장 만들기가 중간에 멈췄어요 (앱을 닫았거나 새로고침했어요).";
  return (
    <div className="sticker mt-4 px-4 py-3.5 text-sm">
      <p className="text-ink-2">
        <span className="font-pixel mr-1 text-pink-text">(!)</span>
        {message}
      </p>
      <button
        type="button"
        onClick={() => startAnalysis(song.id, { retokenize: true })}
        className="sticker-sm press mt-3 flex items-center gap-1.5 rounded-full bg-pink px-3.5 py-2 font-bold text-black"
      >
        <Icon name="refresh" className="size-4" /> 단어장 다시 만들기
      </button>
    </div>
  );
}

function EmptyAnalysis({ song }: { song: Song }) {
  return (
    <p className="px-4 py-8 text-center text-sm text-ink-3">
      {song.status === "analyzing" ? "단어장을 만드는 중이에요…" : "아직 단어장이 없어요."}
    </p>
  );
}
