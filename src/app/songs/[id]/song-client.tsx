"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { Icon, IconCircle } from "@/components/Icon";
import { LyricLineRange, LyricLineView, patternRange } from "@/components/LyricLineView";
import { MemoryBar, MemoryLegend } from "@/components/MemoryBar";
import { CircleButton, TopBar } from "@/components/PageHeader";
import { Sheet } from "@/components/Sheet";
import { SongCover } from "@/components/SongCover";
import { Spinner } from "@/components/Spinner";
import { VocabDetail } from "@/components/VocabDetail";
import { MemoryMarkLegend, VocabRow } from "@/components/VocabRow";
import { useAccount } from "@/lib/account";
import { autoCover, findArtwork, startAnalysis, useInFlight } from "@/lib/api-client";
import type { Artwork } from "@/lib/artwork";
import { buildDeck, cardOf } from "@/lib/cards";
import { fileToCover } from "@/lib/image";
import { isKoreanOnly } from "@/lib/lyrics";
import { buildQueue, grammarHref, remainingNew, reviewHref } from "@/lib/review";
import { GRAMMAR_NEW_PER_SESSION, uniqueGrammar } from "@/lib/grammar";
import { isDue, memoryOf, progressOf } from "@/lib/srs";
import { useStore } from "@/lib/store";
import type { Song } from "@/lib/types";
import { LineExplain } from "./line-explain";

type Tab = "lyrics" | "vocab" | "grammar";
const TABS: Tab[] = ["lyrics", "vocab", "grammar"];

/** 주소로 여는 처음 상태: ?tab=vocab, ?word=단어(단어 카드), ?line=줄 번호(줄 해설) */
type Opening = { tab?: Tab; word?: string; line?: number };

export function SongClient() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const line = params.get("line");
  const opening: Opening = {
    tab: TABS.find((t) => t === params.get("tab")),
    word: params.get("word") ?? undefined,
    line: line !== null && Number.isInteger(Number(line)) ? Number(line) : undefined,
  };
  return (
    <HydrationGate>
      <SongScreen id={id} opening={opening} />
    </HydrationGate>
  );
}

function SongScreen({ id, opening }: { id: string; opening: Opening }) {
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
  return <SongView song={song} opening={opening} />;
}

function SongView({ song, opening }: { song: Song; opening: Opening }) {
  const router = useRouter();
  const furigana = useStore((s) => s.settings.furigana);
  const setSettings = useStore((s) => s.setSettings);
  const removeSong = useStore((s) => s.removeSong);
  const cards = useStore((s) => s.cards);
  const [tab, setTab] = useState<Tab>(opening.tab ?? "lyrics");
  const [openWord, setOpenWord] = useState<string | null>(
    () => song.vocab.find((v) => v.word === opening.word)?.id ?? null,
  );
  const [openLine, setOpenLine] = useState<number | null>(opening.line ?? null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // 노래 헤더가 위 막대 뒤로 지나갔는지
  const headerRef = useRef<HTMLElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setCompact(!e.isIntersecting), { rootMargin: "-72px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const word = openWord ? song.vocab.find((v) => v.id === openWord) : undefined;
  const memory = progressOf(song.vocab, cards);
  const koreanLines = song.lines.filter((l) => isKoreanOnly(l.text)).length;
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
  const grammarToday = useMemo(
    () =>
      buildDeck(
        uniqueGrammar(songs, order, song.id).map((g) => g.key),
        cards,
        now,
        GRAMMAR_NEW_PER_SESSION,
      ).queue.length,
    [songs, order, song.id, cards, now],
  );

  return (
    <div>
      {/* 헤더가 화면 위로 지나가면 위 막대에 노래 제목을 띄우고 탭 줄과 함께 유리 바탕으로 고정한다 */}
      <div
        className={`pt-safe sticky top-0 z-30 -mx-5 -mt-[env(safe-area-inset-top)] px-5 transition-colors ${
          compact ? "glass border-x-0 border-t-0 border-b-transparent" : "border-b border-transparent"
        }`}
      >
        <TopBar
          backHref="/"
          title={
            <span className={`font-jp transition-opacity ${compact ? "opacity-100" : "opacity-0"}`} aria-hidden={!compact}>
              {song.title}
            </span>
          }
          right={<CircleButton icon="trash" label="노래 삭제" onClick={() => setConfirmDelete(true)} />}
        />
      </div>

      <section ref={headerRef} className="mt-2 flex items-center gap-4">
        <CoverPicker song={song} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5">
            <span className="num inline-flex h-[22px] items-center rounded-full bg-blue-soft px-[9px] text-[12px] font-semibold text-blue">
              {song.level}
            </span>
            {song.isDemo && (
              <span className="inline-flex h-[22px] items-center rounded-full bg-muted px-[9px] text-[12px] font-semibold text-ink-2">
                데모곡
              </span>
            )}
          </div>
          <h1 className="font-jp mt-2 text-[26px] leading-[1.25] font-extrabold tracking-[-0.02em] break-words">
            {song.title}
          </h1>
          <p className="mt-0.5 truncate text-[15px] font-semibold text-blue">{song.artist || "아티스트 미상"}</p>
        </div>
      </section>
      {song.summary && <p className="mt-4 text-[15px] leading-[1.65] text-pretty text-ink-2">{song.summary}</p>}

      {song.status === "ready" && total > 0 && (
        <div className="card mt-5 px-[18px] pt-[18px] pb-4">
          <div className="flex items-baseline justify-between">
            <p className="text-[13px] font-semibold text-ink-2">기억한 단어</p>
            <p className="text-[13px] text-ink-3">
              <b className="num text-[20px] font-semibold tracking-[-0.02em] text-ink">{memory.long + memory.short}</b> /{" "}
              <span className="num">{total}</span>
            </p>
          </div>
          <MemoryBar total={total} long={memory.long} short={memory.short} className="mt-2.5 h-2" />
          <MemoryLegend className="mt-2" counts={{ long: memory.long, short: memory.short }} />
          <Link
            href={reviewHref(song.id)}
            className="btn-primary press mt-4 flex h-[52px] items-center justify-center gap-2 text-[15px] font-bold"
          >
            이 노래 단어 학습하기
            {today > 0 && (
              <span className="num inline-flex h-6 items-center rounded-full bg-white/22 px-[9px] text-[13px] font-semibold">
                오늘 {today}
              </span>
            )}
          </Link>
        </div>
      )}

      <AnalysisStatus song={song} />

      <div
        className={`sticky top-[calc(env(safe-area-inset-top)+65px)] z-20 -mx-5 mt-6 mb-3 flex items-center gap-3 px-5 py-2 ${
          compact ? "glass border-x-0 border-t-0 border-b-line" : "bg-bg"
        }`}
      >
        <div className="seg flex-1" role="tablist" aria-label="노래 보기">
          {(
            [
              ["lyrics", "가사", null],
              ["vocab", "단어", total],
              ["grammar", "문법", song.grammar.length],
            ] as const
          ).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className="seg-item press whitespace-nowrap"
            >
              {label}
              {count ? <span className="num text-[13px] font-medium text-ink-3">{count}</span> : null}
            </button>
          ))}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={furigana}
          onClick={() => setSettings({ furigana: !furigana })}
          className="press flex shrink-0 items-center gap-2 py-2 text-[13px] font-medium text-ink-2"
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

      {tab === "lyrics" && (
        <div className="card px-2.5 pt-2.5 pb-3">
          {song.status === "ready" && total > 0 && (
            <p className="mx-2 mt-1 mb-1.5 flex flex-wrap items-center gap-1.5 text-[12px] leading-normal text-ink-3">
              <span className="h-2 w-[22px] shrink-0 rounded-sm bg-[var(--mark)]" aria-hidden />
              단어를 누르면 뜻, <Icon name="sparkle" className="size-[13px]" />를 누르면 줄 해설
            </p>
          )}
          {koreanLines > 0 && (
            <p className="mx-2 mb-1.5 text-[12px] leading-normal text-ink-3">
              같이 붙여넣은 한글 발음·해석 {koreanLines}줄은 숨겼어요.
            </p>
          )}
          {song.lines.map((line, i) =>
            // 예전에 한글 발음·해석까지 붙여넣은 노래는 그 줄을 숨긴다 (새 노래는 추가할 때 뺀다).
            isKoreanOnly(line.text) ? null : line.text.trim() ? (
              <div key={i}>
                <div className="grid grid-cols-[1fr_32px] items-start gap-1.5 px-2">
                  <p className="font-jp lyric text-[19px] leading-[2.3]">
                    <LyricLineView line={line} index={i} vocab={song.vocab} onWord={setOpenWord} furigana={furigana} />
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpenLine(openLine === i ? null : i)}
                    className={`press mt-3.5 grid size-8 place-items-center rounded-full ${
                      openLine === i ? "btn-primary" : "border border-line text-ink-3"
                    }`}
                    aria-label="이 줄 해설 보기"
                    aria-expanded={openLine === i}
                  >
                    <Icon name="sparkle" className="size-[15px]" />
                  </button>
                </div>
                {openLine === i && <LineExplain song={song} index={i} />}
              </div>
            ) : (
              <div key={i} className="h-3.5" />
            ),
          )}
        </div>
      )}

      {tab === "vocab" && (
        <>
          {total > 0 && (
            <div className="mx-1 mb-2.5 flex items-center justify-between text-[12px] font-medium text-ink-3">
              <span>가사에 나온 순서</span>
              <MemoryMarkLegend />
            </div>
          )}
          <ul className="card divide-y divide-line overflow-hidden">
            {total === 0 && <EmptyAnalysis song={song} />}
            {song.vocab.map((v) => {
              const card = cardOf(cards, v);
              return (
                <VocabRow
                  key={v.id}
                  item={v}
                  memory={memoryOf(card)}
                  dueToday={!!card && isDue(card, now)}
                  onClick={() => setOpenWord(v.id)}
                />
              );
            })}
          </ul>
        </>
      )}

      {tab === "grammar" && song.grammar.length > 0 && (
        <Link
          href={grammarHref(song.id)}
          className="btn-primary press mb-3 flex h-[52px] items-center justify-center gap-2 text-[15px] font-bold"
        >
          이 노래 문법 복습하기
          {grammarToday > 0 && (
            <span className="num inline-flex h-6 items-center rounded-full bg-white/22 px-[9px] text-[13px] font-semibold">
              오늘 {grammarToday}
            </span>
          )}
        </Link>
      )}
      {tab === "grammar" && (
        <ul className="space-y-2.5">
          {song.grammar.length === 0 && (
            <li className="card">
              <EmptyAnalysis song={song} />
            </li>
          )}
          {song.grammar.map((g, i) => (
            <li key={i} className="card p-[18px]">
              <p className="flex flex-wrap items-baseline gap-x-2.5">
                <span className="font-jp text-[22px] font-bold text-blue">{g.pattern}</span>
                <span className="text-[15px] font-bold">{g.meaning}</span>
              </p>
              {song.lines[g.line] && (
                <p className="iris font-jp lyric mt-3 rounded-2xl px-3.5 py-0.5 text-[17px] leading-[2.25]">
                  <LyricLineRange
                    line={song.lines[g.line]}
                    range={patternRange(g.pattern, song.lines[g.line].text)}
                    furigana={furigana}
                  />
                </p>
              )}
              <p className="mt-3 text-[14px] leading-[1.65] text-ink-2">{g.explanation}</p>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={!!word} onClose={() => setOpenWord(null)} title={song.title} icon="music">
        {word && <VocabDetail item={word} song={song} />}
      </Sheet>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="노래 삭제">
        <div className="flex flex-col items-center text-center">
          <IconCircle name="trash" tone="danger" className="size-16" />
          <p className="font-jp mt-3 text-[20px] font-bold">{song.title}</p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
            이 노래와 단어장이 지워져요. 되돌릴 수 없어요.
            <br />
            단어 학습 기록은 다른 노래에도 쓰여서 남아요.
          </p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="btn-ghost press h-[52px] text-[15px] font-semibold"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              removeSong(song.id);
              router.replace("/");
            }}
            className="press h-[52px] rounded-full bg-danger text-[15px] font-semibold text-white"
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
        <SongCover song={song} className="size-[84px] rounded-[28px]" />
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
            className="btn-primary press h-[52px] text-[15px] font-semibold"
          >
            사진 직접 고르기
          </button>
          {song.cover && (
            <button
              type="button"
              onClick={() => choose(undefined)}
              className="btn-ghost press h-[52px] text-[15px] font-semibold"
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
      <div className="card mt-5 flex items-center gap-3 px-4 py-4">
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
          className="btn-primary press mt-3 flex h-[52px] w-full items-center justify-center gap-1.5 text-[15px] font-semibold"
        >
          <Icon name="user" className="size-4" /> 로그인하기
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => startAnalysis(song.id, { retokenize: true })}
          className="btn-primary press mt-3 flex h-[52px] w-full items-center justify-center gap-1.5 text-[15px] font-semibold"
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
