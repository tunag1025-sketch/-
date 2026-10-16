"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Spinner";
import { Sparkle } from "@/components/Stickers";
import { startAnalysis, tokenize } from "@/lib/api-client";
import { cleanLyrics } from "@/lib/lyrics";
import { useStore } from "@/lib/store";
import { LEVELS, type Level } from "@/lib/types";

const LEVEL_HINT: Record<Level, string> = {
  입문: "히라가나만",
  N5: "아주 기초",
  N4: "기초",
  N3: "중급",
  N2: "중상급",
  N1: "상급",
};

export function NewSongClient() {
  return (
    <HydrationGate>
      <NewSongForm />
    </HydrationGate>
  );
}

function NewSongForm() {
  const router = useRouter();
  const defaultLevel = useStore((s) => s.settings.defaultLevel);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [level, setLevel] = useState<Level>(defaultLevel);
  const [lyrics, setLyrics] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lines = cleanLyrics(lyrics);
  const lineCount = lines.filter((l) => l.trim()).length;
  const canSubmit = title.trim() && lineCount > 0 && !busy;

  // 웹 페이지에서 후리가나(<rt>)째 복사한 가사는 읽기를 빼고 본문만 붙여넣는다.
  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const html = e.clipboardData.getData("text/html");
    if (!html || !/<rt[\s>]/i.test(html)) return;
    e.preventDefault();
    const text = htmlToPlainLyrics(html);
    const el = e.currentTarget;
    const next = el.value.slice(0, el.selectionStart) + text + el.value.slice(el.selectionEnd);
    setLyrics(next);
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
      router.replace(`/songs/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "가사를 읽지 못했어요.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-7">
      <PageHeader label="ADD SONG" title="노래 추가" backHref="/" />

      <div className="sticker space-y-4 p-4">
        <Field en="01 · TITLE" ko="노래 제목">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 夜に駆ける"
            className="font-jp input"
            maxLength={200}
            required
          />
        </Field>
        <Field en="02 · ARTIST" ko="가수 (선택)">
          <input
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="예: YOASOBI"
            className="font-jp input"
            maxLength={200}
          />
        </Field>
      </div>

      <Field en="03 · LEVEL" ko="내 일본어 수준">
        <div className="grid grid-cols-3 gap-2.5">
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLevel(l)}
              aria-pressed={level === l}
              className={`sticker-sm press rounded-2xl px-2 py-2.5 text-center ${
                level === l ? "bg-pink text-black" : "bg-surface text-ink-2"
              }`}
            >
              <div className="font-pixel text-[19px] leading-tight font-bold">{l}</div>
              <div className="text-[11px] font-semibold opacity-80">{LEVEL_HINT[l]}</div>
            </button>
          ))}
        </div>
      </Field>

      <Field en="04 · LYRICS" ko="가사" hint={lineCount ? `${lineCount} lines` : undefined}>
        <textarea
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          onPaste={onPaste}
          placeholder={"가사를 그대로 붙여넣어 주세요.\n\n例)\n夜明け前の空に 小さな星がひとつ\n眠れない僕は 窓を開けて君を思う"}
          rows={12}
          className="font-jp input min-h-[16rem] resize-y text-[16px] leading-relaxed"
          required
        />
        <p className="mt-2 text-xs text-ink-3">가사는 이 기기에만 저장돼요. 단어장을 만들 때만 AI에 보내져요.</p>
      </Field>

      {error && (
        <p className="rounded-2xl border-2 border-edge bg-candy px-4 py-3 text-sm font-semibold text-black">
          <span className="font-pixel mr-1">(!)</span>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="sticker-sm press relative flex w-full items-center justify-center gap-2 rounded-full bg-pink px-4 py-4 text-[17px] font-extrabold text-black shadow-ink disabled:opacity-40"
      >
        {busy ? (
          <>
            <Spinner /> 가사 읽는 중…
          </>
        ) : (
          <>
            <Icon name="sparkle" /> 단어장 만들기
          </>
        )}
        <Sparkle className="absolute -top-3 right-6 w-6 rotate-12" />
      </button>
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

function Field({ en, ko, hint, children }: { en: string; ko: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-baseline justify-between">
        <span className="flex items-baseline gap-2">
          <span className="font-mono text-[11px] font-bold tracking-wider text-pink-text">{en}</span>
          <span className="text-sm font-bold">{ko}</span>
        </span>
        {hint && <span className="font-mono text-[11px] text-ink-3">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
