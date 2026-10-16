"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { Headline, TopBar } from "@/components/PageHeader";
import { Spinner } from "@/components/Spinner";
import { Icon } from "@/components/Icon";
import { autoCover, searchSongs, startAnalysis, tokenize } from "@/lib/api-client";
import type { SongHit } from "@/lib/artwork";
import { cleanLyrics } from "@/lib/lyrics";
import { useStore } from "@/lib/store";
import { LEVELS, type Level } from "@/lib/types";

const LEVEL_HINT: Record<Level, string> = {
  입문: "히라가나·가타카나를 읽을 수 있어요",
  N5: "아주 기초적인 단어와 문장을 알아요",
  N4: "기초 문법과 일상 단어를 알아요",
  N3: "일상 대화는 대체로 알아들어요",
  N2: "뉴스나 긴 글도 꽤 읽을 수 있어요",
  N1: "웬만한 글은 다 읽을 수 있어요",
};

export function NewSongClient() {
  // ?q= 로 열면 그 말로 노래를 찾아 둔다
  const query = useSearchParams().get("q") ?? "";
  return (
    <HydrationGate>
      <NewSongForm initialQuery={query} />
    </HydrationGate>
  );
}

function NewSongForm({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const defaultLevel = useStore((s) => s.settings.defaultLevel);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [level, setLevel] = useState<Level>(defaultLevel);
  const [lyrics, setLyrics] = useState("");
  // 검색에서 고른 노래 (앨범 커버를 그대로 쓴다)
  const [picked, setPicked] = useState<SongHit | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { lines, koreanLines } = cleanLyrics(lyrics);
  const lineCount = lines.filter((l) => l.trim()).length;
  const canSubmit = title.trim() && lineCount > 0 && !busy;

  // 웹 페이지에서 후리가나(<rt>)째 복사한 가사는 읽기를 빼고 본문만 붙여넣는다.
  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const html = e.clipboardData.getData("text/html");
    if (!html || !/<rt[\s>]/i.test(html)) return;
    e.preventDefault();
    const text = htmlToPlainLyrics(html);
    const el = e.currentTarget;
    setLyrics(el.value.slice(0, el.selectionStart) + text + el.value.slice(el.selectionEnd));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    if (lines.length > 400) {
      setError("가사가 너무 길어요. 400줄 이하로 넣어 주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const tokenized = await tokenize(lines);
      const { createSong, setSettings } = useStore.getState();
      const id = createSong({ title: title.trim(), artist: artist.trim(), level, lines: tokenized });
      setSettings({ defaultLevel: level });
      void startAnalysis(id);
      if (picked?.cover) useStore.getState().updateSong(id, { cover: picked.cover, coverSearched: true });
      else void autoCover(id);
      router.replace(`/songs/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "가사를 읽지 못했어요.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6 pb-4">
      <TopBar backHref="/" title="노래 추가" />

      <Headline className="text-[28px]" first="어떤 노래로" second="공부해 볼까요?" />

      <SongSearch
        initialQuery={initialQuery}
        picked={picked}
        onPick={(hit) => {
          setPicked(hit);
          setTitle(hit.title);
          setArtist(hit.artist);
        }}
        onClear={() => setPicked(null)}
      />

      <div className="space-y-4">
        <Field label="노래 제목" htmlFor="title">
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 夜に駆ける"
            className="font-jp input"
            maxLength={200}
            required
          />
        </Field>
        <Field label="가수" hint="선택" htmlFor="artist">
          <input
            id="artist"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="예: YOASOBI"
            className="font-jp input"
            maxLength={200}
          />
        </Field>
      </div>

      <fieldset>
        <legend className="mb-2.5 text-[15px] font-semibold">내 일본어 수준</legend>
        <div className="grid grid-cols-6 gap-1.5">
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLevel(l)}
              aria-pressed={level === l}
              className="chip press num justify-center px-0 text-[15px]"
            >
              {l}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[13px] text-ink-3">{LEVEL_HINT[level]}</p>
      </fieldset>

      <Field
        label="가사"
        hint={lineCount ? `${lineCount}줄` : undefined}
        htmlFor="lyrics"
        action={
          title.trim() ? (
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(`${title.trim()} ${artist.trim()} 歌詞`.replace(/\s+/g, " "))}`}
              target="_blank"
              rel="noreferrer"
              className="press flex items-center gap-1 text-[13px] font-semibold text-blue"
            >
              가사 찾아보기 <Icon name="arrowUpRight" className="size-3.5" />
            </a>
          ) : undefined
        }
      >
        <textarea
          id="lyrics"
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          onPaste={onPaste}
          placeholder={"가사를 그대로 붙여넣어 주세요.\n\n例)\n夜明け前の空に 小さな星がひとつ\n眠れない僕は 窓を開けて君を思う"}
          rows={12}
          className="font-jp input min-h-[16rem] resize-y text-[16px] leading-relaxed"
          required
        />
        {koreanLines > 0 && (
          <p className="mt-2 flex items-start gap-1.5 rounded-2xl bg-blue-soft px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-2">
            <Icon name="info" className="mt-0.5 size-4 shrink-0 text-blue" />
            {lineCount > 0
              ? `한글 발음·해석 ${koreanLines}줄은 빼고 일본어 가사 ${lineCount}줄로 만들어요.`
              : "일본어 가사가 없어요. 한글 발음이나 해석만으로는 단어장을 만들 수 없어요."}
          </p>
        )}
        <p className="mt-2 text-[13px] text-ink-3">
          가사는 직접 찾아 붙여넣어 주세요. 내 기기(로그인하면 내 계정)에만 저장되고, 단어장을 만들 때만 AI에 보내져요.
        </p>
      </Field>

      {error && <p className="rounded-2xl bg-danger/10 px-4 py-3 text-[14px] font-medium text-danger">{error}</p>}

      <div className="pb-safe sticky bottom-0 -mx-4 bg-gradient-to-t from-bg via-bg to-transparent px-4 pt-6 pb-4">
        <button
          type="submit"
          disabled={!canSubmit}
          className="btn-primary press flex w-full items-center justify-center gap-2 py-4 text-[16px] font-semibold disabled:opacity-40 disabled:shadow-none"
        >
          {busy ? (
            <>
              <Spinner /> 가사 읽는 중…
            </>
          ) : (
            "단어장 만들기"
          )}
        </button>
      </div>
    </form>
  );
}

function htmlToPlainLyrics(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("rt, rp, script, style").forEach((el) => el.remove());
  // HTML 소스의 줄바꿈은 공백으로, 실제 줄바꿈(<br>, 블록 요소)만 살린다.
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    n.textContent = (n.textContent ?? "").replace(/\s*\n\s*/g, " ");
  }
  doc.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  doc.querySelectorAll("p, div, li, h1, h2, h3, h4, tr").forEach((el) => el.append("\n"));
  return doc.body.textContent ?? "";
}

function Field({
  label,
  hint,
  htmlFor,
  action,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="flex items-baseline gap-2 text-[15px] font-semibold">
          {label}
          {hint && <span className="text-[13px] font-normal text-ink-3">{hint}</span>}
        </label>
        {action}
      </div>
      {children}
    </div>
  );
}

/** 제목·가수로 노래를 찾아 고른다. 고르면 제목·가수·앨범 커버가 채워진다. */
function SongSearch({
  initialQuery,
  picked,
  onPick,
  onClear,
}: {
  initialQuery: string;
  picked: SongHit | null;
  onPick: (hit: SongHit) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [hits, setHits] = useState<SongHit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  // 입력이 멈추면 찾는다.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      searchSongs(q, ctrl.signal)
        .then((r) => {
          setHits(r);
          setFailed(false);
        })
        .catch((err) => {
          if (!ctrl.signal.aborted) setFailed(true);
          void err;
        })
        .finally(() => !ctrl.signal.aborted && setLoading(false));
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  if (picked) {
    return (
      <div className="card flex items-center gap-3 p-3">
        {picked.cover ? (
          // 앨범 커버는 외부 주소라 그대로 쓴다.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={picked.cover} alt="" className="size-14 shrink-0 rounded-2xl bg-muted object-cover" />
        ) : (
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-blue-soft text-blue">
            <Icon name="music" className="size-6" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-jp truncate text-[16px] font-bold">{picked.title}</p>
          <p className="font-jp truncate text-[13px] text-ink-3">
            {[picked.artist, picked.album].filter(Boolean).join(" · ")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            onClear();
            setHits(null);
            setQuery("");
          }}
          className="press shrink-0 rounded-full bg-muted px-3 py-1.5 text-[13px] font-semibold text-ink-2"
        >
          다시 찾기
        </button>
      </div>
    );
  }

  const q = query.trim();
  return (
    <div>
      <label htmlFor="song-search" className="mb-2 block text-[15px] font-semibold">
        노래 찾기
      </label>
      <div className="relative">
        <Icon name="search" className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-ink-3" />
        <input
          id="song-search"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length < 2) setHits(null);
          }}
          placeholder="제목이나 가수 (예: 夜に駆ける, YOASOBI)"
          className="font-jp input rounded-full pl-11"
          autoComplete="off"
          enterKeyHint="search"
        />
        {loading && <Spinner className="absolute top-1/2 right-4 size-4 -translate-y-1/2 text-ink-3" />}
      </div>
      {q.length >= 2 && hits && (
        <ul className="card mt-2 divide-y divide-line overflow-hidden" aria-label="검색 결과">
          {hits.map((h) => (
            <li key={`${h.title}|${h.artist}|${h.album}`}>
              <button
                type="button"
                onClick={() => onPick(h)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors active:bg-muted"
              >
                {h.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={h.cover} alt="" loading="lazy" className="size-11 shrink-0 rounded-xl bg-muted object-cover" />
                ) : (
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-ink-3">
                    <Icon name="music" className="size-5" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="font-jp block truncate text-[15px] font-semibold">{h.title}</span>
                  <span className="font-jp block truncate text-[13px] text-ink-3">
                    {[h.artist, h.album].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {hits.length === 0 && (
            <li className="px-4 py-3 text-[14px] text-ink-3">찾는 노래가 없어요. 아래에 제목과 가수를 직접 적어 주세요.</li>
          )}
        </ul>
      )}
      {failed && <p className="mt-2 text-[13px] text-danger">노래를 찾지 못했어요. 아래에 직접 적어 주세요.</p>}
      {!hits && !failed && (
        <p className="mt-2 text-[13px] text-ink-3">고르면 제목·가수·앨범 커버가 채워져요. 없으면 아래에 직접 적어도 돼요.</p>
      )}
    </div>
  );
}
