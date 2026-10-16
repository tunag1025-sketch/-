"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { Headline, TopBar } from "@/components/PageHeader";
import { Spinner } from "@/components/Spinner";
import { startAnalysis, tokenize } from "@/lib/api-client";
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

      <Field label="가사" hint={lineCount ? `${lineCount}줄` : undefined} htmlFor="lyrics">
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
        <p className="mt-2 text-[13px] text-ink-3">가사는 이 기기에만 저장되고, 단어장을 만들 때만 AI에 보내져요.</p>
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
  children,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 flex items-baseline justify-between text-[15px] font-semibold">
        {label}
        {hint && <span className="text-[13px] font-normal text-ink-3">{hint}</span>}
      </label>
      {children}
    </div>
  );
}
