"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/Badge";
import { HydrationGate } from "@/components/HydrationGate";
import { Icon, IconCircle } from "@/components/Icon";
import { LyricLineView } from "@/components/LyricLineView";
import { MemoryBar, MemoryLegend } from "@/components/MemoryBar";
import { CircleButton, Headline, TopBar } from "@/components/PageHeader";
import { Sheet } from "@/components/Sheet";
import { SongCover } from "@/components/SongCover";
import { Spinner } from "@/components/Spinner";
import { Stat } from "@/components/Stat";
import { VocabDetail } from "@/components/VocabDetail";
import { VocabRow } from "@/components/VocabRow";
import { useAccount } from "@/lib/account";
import { autoCover, findArtwork, startAnalysis, useInFlight } from "@/lib/api-client";
import type { Artwork } from "@/lib/artwork";
import { fileToCover } from "@/lib/image";
import { buildQueue, remainingNew, reviewHref } from "@/lib/review";
import { memoryOf, progressOf } from "@/lib/srs";
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
      <div className="flex flex-col items-center pt-24 text-center">
        <IconCircle name="music" tone="muted" className="size-20" />
        <p className="mt-4 text-[18px] font-semibold">노래를 찾을 수 없어요</p>
        <p className="mt-1 text-[14px] text-ink-3">삭제됐거나 다른 기기에서 추가한 노래예요.</p>
        <Link href="/" className="btn-primary press mt-6 px-6 py-3 text-[15px] font-semibold">
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
  const memory = progressOf(song.vocab, cards);
  const total = song.vocab.length;
  const newLog = useStore((s) => s.newLog);
  const dailyNew = useStore((s) => s.settings.dailyNew);
  const songs = useStore((s) => s.songs);
  const order = useStore((s) => s.order);
  const [now] = useState(Date.now);
  const today = useMemo(
    () =>
      buildQueue(songs, order, cards, now, { songId: song.id, newLimit: remainingNew(dailyNew, newLog, now) }).queue
        .length,
    [songs, order, cards, now, song.id, dailyNew, newLog],
  );

  return (
    <div>
      <TopBar
        backHref="/"
        title="노래"
        right={<CircleButton icon="trash" label="노래 삭제" onClick={() => setConfirmDelete(true)} />}
      />

      <section className="mt-2 flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="blue">{song.level}</Badge>
            {song.isDemo && <Badge>데모곡</Badge>}
          </div>
          <Headline
            className="font-jp mt-3 text-[28px]"
            first={song.title}
            second={<span className="font-sans">{song.artist || "아티스트 미상"}</span>}
          />
        </div>
        <CoverPicker song={song} />
      </section>
      {song.summary && <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{song.summary}</p>}

      {song.status === "ready" && total > 0 && (
        <div className="card mt-5 px-2 pt-4 pb-3">
          <div className="grid grid-cols-3">
            <Stat value={total} label="단어" />
            <Stat value={memory.short} label="단기기억" />
            <Stat value={memory.long} label="장기기억" />
          </div>
          <div className="mx-2 mt-4">
            <MemoryBar total={total} long={memory.long} short={memory.short} className="h-2" />
            <div className="mt-2 flex items-center justify-between">
              <span className="num text-[12px] font-semibold text-ink-3">
                {memory.long + memory.short}/{total}
              </span>
              <MemoryLegend />
            </div>
          </div>
          <Link
            href={reviewHref(song.id)}
            className="btn-primary press mx-2 mt-4 flex items-center justify-center gap-1.5 py-3.5 text-[15px] font-semibold"
          >
            이 노래 단어 학습하기
            {today > 0 && <span className="num rounded-full bg-white/20 px-2 py-0.5 text-[13px]">오늘 {today}개</span>}
          </Link>
        </div>
      )}

      <AnalysisStatus song={song} />

      <div className="sticky top-0 z-20 -mx-4 mt-6 mb-3 bg-bg/85 px-4 py-2 backdrop-blur-md">
        <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
          <div className="flex gap-1.5" role="tablist">
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
                className="chip press shrink-0 px-3.5 whitespace-nowrap"
              >
                {label}
                {count ? <span className="num text-[13px] opacity-75">{count}</span> : null}
              </button>
            ))}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={furigana}
            onClick={() => setSettings({ furigana: !furigana })}
            className="press ml-auto flex shrink-0 items-center gap-2 py-2 pl-1 text-[13px] font-medium text-ink-2"
          >
            <span className="font-jp whitespace-nowrap">ふりがな</span>
            <span
              className={`relative h-6 w-10 rounded-full transition-colors ${furigana ? "bg-blue" : "bg-ink-3/45"}`}
              aria-hidden
            >
              <span
                className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${
                  furigana ? "translate-x-4" : ""
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {tab === "lyrics" && (
        <div className="card px-4 pt-3 pb-4">
          {song.status === "ready" && total > 0 && (
            <p className="mb-2 text-[13px] leading-relaxed text-ink-3">
              색칠된 단어를 누르면 뜻과 예문을, 줄 끝 버튼을 누르면 그 줄 해설을 볼 수 있어요.
            </p>
          )}
          {song.lines.map((line, i) =>
            line.text.trim() ? (
              <div key={i}>
                <div className="flex items-start gap-2">
                  <p className="flex-1 text-[19px] leading-[2.3] text-pretty">
                    <LyricLineView line={line} index={i} vocab={song.vocab} onWord={setOpenWord} furigana={furigana} />
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpenLine(openLine === i ? null : i)}
                    className={`press mt-3 grid size-8 shrink-0 place-items-center rounded-full ${
                      openLine === i ? "btn-primary" : "bg-muted text-ink-3"
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
        <ul className="card divide-y divide-line overflow-hidden">
          {total === 0 && <EmptyAnalysis song={song} />}
          {song.vocab.map((v) => (
            <VocabRow key={v.id} item={v} memory={memoryOf(cards[v.id])} onClick={() => setOpenWord(v.id)} />
          ))}
        </ul>
      )}

      {tab === "grammar" && (
        <ul className="space-y-2.5">
          {song.grammar.length === 0 && (
            <li className="card">
              <EmptyAnalysis song={song} />
            </li>
          )}
          {song.grammar.map((g, i) => (
            <li key={i} className="card px-5 py-4">
              <p className="font-jp text-[21px] font-bold text-blue">{g.pattern}</p>
              <p className="mt-0.5 text-[15px] font-semibold">{g.meaning}</p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{g.explanation}</p>
              {song.lines[g.line] && (
                <p className="iris mt-3 rounded-2xl px-3.5 py-2 text-[16px] leading-[2.1]">
                  <LyricLineView line={song.lines[g.line]} index={g.line} vocab={[]} furigana={furigana} />
                </p>
              )}
            </li>
          ))}
        </ul>
      )}


      <Sheet open={!!word} onClose={() => setOpenWord(null)} title={song.title}>
        {word && <VocabDetail item={word} song={song} />}
      </Sheet>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="노래 삭제">
        <div className="flex flex-col items-center text-center">
          <IconCircle name="trash" tone="danger" className="size-16" />
          <p className="font-jp mt-3 text-[20px] font-bold">{song.title}</p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
            이 노래와 단어장, 학습 기록이 모두 지워져요.
            <br />
            되돌릴 수 없어요.
          </p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="btn-ghost press py-3.5 text-[15px] font-semibold"
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


function CoverPicker({ song }: { song: Song }) {
  const updateSong = useStore((s) => s.updateSong);
  const input = useRef<HTMLInputElement>(null);
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<Artwork[] | null>(null);

  // 예전에 넣은 노래도 처음 열 때 한 번 앨범 커버를 찾아 본다.
  useEffect(() => {
    void autoCover(song.id);
  }, [song.id]);

  function open() {
    setMenu(true);
    if (found === null && !song.isDemo) {
      findArtwork(song.title, song.artist).then(setFound, () => setFound([]));
    }
  }

  function choose(cover: string | undefined) {
    updateSong(song.id, { cover });
    setError(null);
    setMenu(false);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      choose(await fileToCover(file));
    } catch {
      setError("사진을 읽지 못했어요. 다른 사진을 골라 주세요.");
      setMenu(true);
    }
  }

  return (
    <>
      <button type="button" onClick={open} aria-label="커버 바꾸기" className="press relative shrink-0">
        <SongCover song={song} className="size-[76px] rounded-[26px]" />
        <span className="absolute -right-1 -bottom-1 grid size-7 place-items-center rounded-full border-2 border-bg bg-surface text-ink-2 shadow-sm">
          <Icon name="camera" className="size-3.5" />
        </span>
      </button>
      <input ref={input} type="file" accept="image/*" onChange={onFile} className="hidden" />
      <Sheet open={menu} onClose={() => setMenu(false)} title="커버">
        {error && <p className="mb-4 text-[15px] text-danger">{error}</p>}
        {!song.isDemo && (
          <section className="mb-5">
            <h3 className="mb-2.5 text-[13px] font-semibold text-ink-3">앨범 커버</h3>
            {found === null ? (
              <p className="flex items-center gap-2 py-6 text-[14px] text-ink-3">
                <Spinner /> 앨범 커버를 찾는 중…
              </p>
            ) : found.length === 0 ? (
              <p className="py-3 text-[14px] text-ink-3">이 제목으로 앨범 커버를 찾지 못했어요. 사진을 직접 골라 주세요.</p>
            ) : (
              <ul className="grid grid-cols-3 gap-2.5">
                {found.map((a) => (
                  <li key={a.url}>
                    <button
                      type="button"
                      onClick={() => choose(a.url)}
                      aria-pressed={song.cover === a.url}
                      className="press block w-full text-left"
                    >
                      {/* 외부 이미지라 next/image 설정 없이 그대로 쓴다. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={a.url}
                        alt=""
                        loading="lazy"
                        className={`aspect-square w-full rounded-2xl bg-muted object-cover ${
                          song.cover === a.url ? "ring-3 ring-blue" : ""
                        }`}
                      />
                      <span className="font-jp mt-1 block truncate text-[12px] font-medium">{a.album || a.title}</span>
                      <span className="block truncate text-[11px] text-ink-3">{a.artist}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        <div className="grid gap-2.5">
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="btn-primary press py-3.5 text-[15px] font-semibold"
          >
            사진 직접 고르기
          </button>
          {song.cover && (
            <button
              type="button"
              onClick={() => choose(undefined)}
              className="btn-ghost press py-3.5 text-[15px] font-semibold"
            >
              커버 지우고 랜덤 그림 쓰기
            </button>
          )}
        </div>
      </Sheet>
    </>
  );
}

function AnalysisStatus({ song }: { song: Song }) {
  const inFlight = useInFlight((s) => s.ids.has(song.id));
  const user = useAccount((s) => s.user);
  if (song.status === "ready") return null;

  if (song.status === "analyzing" && inFlight) {
    return (
      <div className="iris-card mt-5 flex items-center gap-3 px-4 py-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-blue-soft text-blue">
          <Spinner className="size-5" />
        </span>
        <div className="min-w-0 flex-1 text-[14px]">
          <p className="font-semibold">단어장 만드는 중</p>
          <p className="text-ink-3">1~2분 걸려요. 그동안 가사를 먼저 읽어 보세요.</p>
        </div>
      </div>
    );
  }

  const message =
    song.status === "error" ? song.error : "단어장 만들기가 중간에 멈췄어요. 앱을 닫거나 새로고침하면 멈춰요.";
  const needLogin = song.errorCode === "LOGIN_REQUIRED" && !user;
  return (
    <div className="card mt-5 px-4 py-4">
      <div className="flex gap-3">
        <IconCircle name="info" tone="danger" className="size-11" />
        <p className="text-[14px] leading-relaxed text-ink-2">{message}</p>
      </div>
      {needLogin ? (
        <Link
          href={`/login?next=${encodeURIComponent(`/songs/${song.id}`)}`}
          className="btn-primary press mt-3 flex w-full items-center justify-center gap-1.5 py-3 text-[14px] font-semibold"
        >
          <Icon name="user" className="size-4" /> 로그인하기
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => startAnalysis(song.id, { retokenize: true })}
          className="btn-primary press mt-3 flex w-full items-center justify-center gap-1.5 py-3 text-[14px] font-semibold"
        >
          <Icon name="refresh" className="size-4" /> 단어장 다시 만들기
        </button>
      )}
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
