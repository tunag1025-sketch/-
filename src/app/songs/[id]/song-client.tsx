"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/Badge";
import { HydrationGate } from "@/components/HydrationGate";
import { Icon } from "@/components/Icon";
import { LyricLineView } from "@/components/LyricLineView";
import { Sheet } from "@/components/Sheet";
import { Spinner } from "@/components/Spinner";
import { VocabDetail } from "@/components/VocabDetail";
import { startAnalysis, useInFlight } from "@/lib/api-client";
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
      <div className="pt-20 text-center">
        <p className="font-semibold">노래를 찾을 수 없어요</p>
        <Link href="/" className="mt-3 inline-block text-sm text-accent underline">
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
    <div className="pt-3">
      <header className="flex items-center justify-between">
        <Link href="/" className="-ml-2 rounded-full p-2 text-ink-2 hover:bg-surface-2" aria-label="뒤로">
          <Icon name="back" />
        </Link>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSettings({ furigana: !furigana })}
            className={`font-jp rounded-full px-3 py-1.5 text-sm font-semibold ${
              furigana ? "bg-accent-soft text-accent" : "bg-surface-2 text-ink-3"
            }`}
            aria-pressed={furigana}
          >
            ふりがな {furigana ? "ON" : "OFF"}
          </button>
          <button onClick={remove} className="rounded-full p-2 text-ink-3 hover:bg-surface-2" aria-label="노래 삭제">
            <Icon name="trash" />
          </button>
        </div>
      </header>

      <div className="mt-2 mb-4">
        <h1 className="font-jp text-2xl leading-snug font-bold">{song.title}</h1>
        <p className="mt-0.5 flex items-center gap-2 text-sm text-ink-3">
          {song.artist || "아티스트 미상"} <Badge>{song.level}</Badge>
          {song.isDemo && <Badge tone="accent">데모</Badge>}
        </p>
        {song.summary && <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{song.summary}</p>}
      </div>

      <AnalysisStatus song={song} />

      <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-line bg-bg/95 px-4 backdrop-blur">
        <div className="flex gap-1" role="tablist">
          {(
            [
              ["lyrics", "가사"],
              ["vocab", `단어 ${song.vocab.length || ""}`],
              ["grammar", `문법 ${song.grammar.length || ""}`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`-mb-px border-b-2 px-3 py-3 text-[15px] font-semibold ${
                tab === key ? "border-accent text-ink" : "border-transparent text-ink-3"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "lyrics" && (
        <div className="space-y-1">
          {song.status === "ready" && song.vocab.length > 0 && (
            <p className="mb-3 text-xs text-ink-3">밑줄 친 단어를 누르면 뜻과 예문이 나와요. ✦ 를 누르면 그 줄을 해설해 줘요.</p>
          )}
          {song.lines.map((line, i) =>
            line.text.trim() ? (
              <div key={i} className="group">
                <div className="flex items-start gap-2">
                  <p className="flex-1 text-[19px] leading-[2.3]">
                    <LyricLineView line={line} index={i} vocab={song.vocab} onWord={setOpenWord} furigana={furigana} />
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpenLine(openLine === i ? null : i)}
                    className={`mt-2.5 shrink-0 rounded-full p-1.5 ${
                      openLine === i ? "bg-accent text-accent-ink" : "text-ink-3 hover:bg-surface-2"
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
        <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
          {song.vocab.length === 0 && <EmptyAnalysis song={song} />}
          {song.vocab.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => setOpenWord(v.id)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-2"
              >
                <div className="font-jp min-w-0 flex-1">
                  <div className="text-xs text-ink-3">{v.reading}</div>
                  <div className="text-lg font-bold">{v.word}</div>
                </div>
                <div className="min-w-0 flex-[1.4] text-[15px] text-ink-2">{v.meaning}</div>
                <div className="shrink-0">
                  {cards[v.id]?.suspended ? (
                    <Icon name="check" className="size-5 text-good" />
                  ) : (
                    v.jlpt !== "기타" && <Badge tone="accent">{v.jlpt}</Badge>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {tab === "grammar" && (
        <ul className="space-y-3">
          {song.grammar.length === 0 && (
            <li className="rounded-3xl border border-line bg-surface">
              <EmptyAnalysis song={song} />
            </li>
          )}
          {song.grammar.map((g, i) => (
            <li key={i} className="rounded-3xl border border-line bg-surface px-4 py-4">
              <div className="flex items-baseline gap-2">
                <span className="font-jp text-lg font-bold text-accent">{g.pattern}</span>
                <span className="text-[15px] font-semibold">{g.meaning}</span>
              </div>
              <p className="mt-1 text-[15px] leading-relaxed text-ink-2">{g.explanation}</p>
              {song.lines[g.line] && (
                <p className="mt-3 rounded-2xl bg-surface-2 px-3 py-2 text-[16px] leading-[2.1]">
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
          className="mt-8 flex items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-4 font-bold text-bg"
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
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-accent-soft px-4 py-3.5 text-sm text-accent">
        <Spinner className="size-5 shrink-0" />
        <div>
          <p className="font-semibold">AI가 단어장과 예문을 만들고 있어요</p>
          <p className="opacity-80">1~2분 정도 걸려요. 그동안 후리가나 가사를 먼저 읽어 보세요.</p>
        </div>
      </div>
    );
  }

  const message =
    song.status === "error" ? song.error : "단어장 만들기가 중간에 멈췄어요 (앱을 닫았거나 새로고침했어요).";
  return (
    <div className="mb-4 rounded-2xl border border-line bg-surface px-4 py-3.5 text-sm">
      <p className="text-ink-2">{message}</p>
      <button
        type="button"
        onClick={() => startAnalysis(song.id)}
        className="mt-2 flex items-center gap-1.5 font-semibold text-accent"
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
