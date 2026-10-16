"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/Badge";
import { HydrationGate } from "@/components/HydrationGate";
import { Icon } from "@/components/Icon";
import { Marquee } from "@/components/Marquee";
import { Spinner } from "@/components/Spinner";
import { Bow, Cassette, Heart, Sparkle } from "@/components/Stickers";
import { useInFlight } from "@/lib/api-client";
import { buildQueue } from "@/lib/review";
import { useStore } from "@/lib/store";
import { toneFor } from "@/lib/tone";
import type { Song } from "@/lib/types";
import { useAiStatus } from "@/lib/use-ai-status";

export function HomeClient() {
  return (
    <HydrationGate>
      <Home />
    </HydrationGate>
  );
}

function Home() {
  const songs = useStore((s) => s.songs);
  const order = useStore((s) => s.order);
  const cards = useStore((s) => s.cards);
  const ai = useAiStatus();
  const [now] = useState(Date.now);
  const { queue } = useMemo(() => buildQueue(songs, order, cards, now), [songs, order, cards, now]);

  return (
    <div className="pt-4">
      <header className="flex items-center justify-between">
        <span className="font-display text-[22px] tracking-tight">
          UTANGO<span className="text-pink">.</span>
        </span>
        <span className="font-pixel rounded-full border-2 border-edge bg-surface px-2.5 py-0.5 text-[13px]">歌単語</span>
      </header>

      <Marquee
        items={["歌で覚える日本語", "SING IT · LEARN IT", "노래로 외우는 일본어", "NOT JUST LYRICS"]}
        className="font-pixel -mx-4 mt-4 -rotate-1 bg-ink py-1.5 text-[15px] text-bg"
      />

      <section className="relative mt-7 pr-24">
        <p className="font-mono text-[11px] font-bold tracking-wider text-pink-text">[ they call it 노래 공부 ]</p>
        <h1 className="font-display mt-1.5 text-[31px] leading-[1.2]">
          좋아하는
          <br />
          <span className="bg-[linear-gradient(transparent_62%,var(--pink)_62%)] px-0.5">노래</span>
          로 일본어
          <br />
          공부해요
        </h1>
        <Cassette className="bob absolute top-0 -right-1 w-[120px]" style={{ "--tilt": "8deg" } as React.CSSProperties} />
        <Sparkle className="absolute top-[118px] right-24 w-5" />
        <Heart className="absolute top-[92px] right-0 w-6 rotate-12" />
      </section>

      {ai === false && (
        <p className="mt-6 rounded-2xl border-2 border-dashed border-edge bg-surface/80 px-4 py-3 text-sm leading-relaxed text-ink-2">
          <span className="font-pixel mr-1 text-pink-text">(!)</span>
          아직 서버에 AI 키가 없어서 <b className="text-ink">후리가나 가사</b>와 <b className="text-ink">데모곡</b>만 쓸 수
          있어요.
        </p>
      )}

      <Link href="/review" className="sticker press relative mt-6 block overflow-hidden bg-sky px-5 pt-4 pb-5 text-black">
        <div className="dots absolute inset-0" />
        <div className="relative flex items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] font-bold tracking-wider">[ TODAY&apos;S REVIEW ]</p>
            <p className="font-pixel mt-1 text-[60px] leading-none">
              {queue.length}
              <span className="ml-1.5 text-lg">words</span>
            </p>
            <p className="mt-1 text-sm font-bold">오늘 복습할 단어</p>
          </div>
          <span className="flex shrink-0 items-center gap-1 rounded-full border-2 border-black bg-black px-4 py-2.5 text-sm font-bold text-white">
            {queue.length ? "복습 시작" : "모두 완료"} <Icon name="arrow" className="size-4" />
          </span>
        </div>
        <Bow className="absolute top-2 right-3 w-12 rotate-12" />
      </Link>

      <section className="mt-9">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-[22px] leading-none">
            MY SONGS <span className="font-mono align-middle text-xs text-ink-3">({order.length})</span>
          </h2>
          <Link
            href="/songs/new"
            className="sticker-sm press flex items-center gap-1 rounded-full bg-pink px-3.5 py-2 text-sm font-bold text-black"
          >
            <Icon name="plus" className="size-4" /> 노래 추가
          </Link>
        </div>
        {order.length === 0 ? (
          <Link
            href="/songs/new"
            className="block rounded-3xl border-2 border-dashed border-edge bg-surface/70 px-5 py-9 text-center"
          >
            <Cassette className="mx-auto w-24" />
            <p className="mt-3 font-bold">첫 노래를 추가해 보세요</p>
            <p className="text-sm text-ink-3">가사를 붙여넣으면 단어장이 만들어져요</p>
          </Link>
        ) : (
          <ul className="space-y-3">
            {order.map((id) => songs[id] && <SongCard key={id} song={songs[id]} />)}
          </ul>
        )}
      </section>
    </div>
  );
}

function SongCard({ song }: { song: Song }) {
  const inFlight = useInFlight((s) => s.ids.has(song.id));
  return (
    <li>
      <Link href={`/songs/${song.id}`} className="sticker press flex items-center gap-3.5 px-3.5 py-3.5">
        <div
          className={`grid size-14 shrink-0 place-items-center rounded-2xl border-2 border-edge text-black ${toneFor(song.id)}`}
        >
          <Icon name="music" className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display truncate text-[17px] leading-snug">{song.title}</div>
          <div className="truncate font-mono text-[11px] text-ink-3">{song.artist || "unknown artist"}</div>
        </div>
        <div className="shrink-0 text-right">
          {song.status === "ready" && (
            <div className="flex flex-col items-end gap-1">
              <Badge tone="black" pixel>
                {song.level}
              </Badge>
              <span className="font-mono text-[11px] text-ink-3">{song.vocab.length} words</span>
            </div>
          )}
          {song.status === "analyzing" && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-3">
              {inFlight && <Spinner className="size-3" />}
              {inFlight ? "만드는 중" : "중단됨"}
            </span>
          )}
          {song.status === "error" && <span className="text-xs font-bold text-pink-text">다시 시도 필요</span>}
        </div>
      </Link>
    </li>
  );
}
