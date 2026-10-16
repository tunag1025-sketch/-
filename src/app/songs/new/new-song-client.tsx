"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { Icon } from "@/components/Icon";
import { Spinner } from "@/components/Spinner";
import { startAnalysis, tokenize } from "@/lib/api-client";
import { cleanLyrics } from "@/lib/lyrics";
import { useStore } from "@/lib/store";
import { LEVELS, type Level } from "@/lib/types";

const LEVEL_HINT: Record<Level, string> = {
  입문: "히라가나만 읽을 수 있어요",
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
  const canSubmit = title.trim() && lines.some((l) => l.trim()) && !busy;

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
    <form onSubmit={submit} className="space-y-6 pt-4">
      <header className="flex items-center gap-2">
        <Link href="/" className="-ml-2 rounded-full p-2 text-ink-2 hover:bg-surface-2" aria-label="뒤로">
          <Icon name="back" />
        </Link>
        <h1 className="text-xl font-bold">노래 추가</h1>
      </header>

      <div className="space-y-3">
        <Field label="노래 제목">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 夜に駆ける"
            className="font-jp input"
            maxLength={200}
            required
          />
        </Field>
        <Field label="가수 (선택)">
          <input
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="예: YOASOBI"
            className="font-jp input"
            maxLength={200}
          />
        </Field>
      </div>

      <Field label="내 일본어 수준">
        <div className="grid grid-cols-3 gap-2">
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLevel(l)}
              className={`rounded-2xl border px-2 py-2.5 text-center ${
                level === l ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-ink-2"
              }`}
            >
              <div className="text-[15px] font-bold">{l}</div>
              <div className="text-[11px] opacity-80">{LEVEL_HINT[l]}</div>
            </button>
          ))}
        </div>
      </Field>

      <Field label="가사" hint={lines.length ? `${lines.filter((l) => l.trim()).length}줄` : undefined}>
        <textarea
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          placeholder={"가사를 그대로 붙여넣어 주세요.\n\n例)\n夜明け前の空に 小さな星がひとつ\n眠れない僕は 窓を開けて君を思う"}
          rows={12}
          className="font-jp input min-h-[16rem] resize-y text-[16px] leading-relaxed"
          required
        />
        <p className="mt-1.5 text-xs text-ink-3">가사는 이 기기에만 저장돼요. 단어장을 만들 때만 AI에 보내져요.</p>
      </Field>

      {error && <p className="rounded-2xl bg-accent-soft px-4 py-3 text-sm text-accent">{error}</p>}

      <button
        type="submit"
        disabled={!canSubmit}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-4 text-base font-bold text-accent-ink disabled:opacity-40"
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
      </button>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-sm font-semibold text-ink-2">
        {label}
        {hint && <span className="text-xs font-normal text-ink-3">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
