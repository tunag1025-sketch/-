"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/Badge";
import { HydrationGate } from "@/components/HydrationGate";
import { Icon } from "@/components/Icon";
import { Spinner } from "@/components/Spinner";
import { useInFlight } from "@/lib/api-client";
import { buildQueue } from "@/lib/review";
import { useStore } from "@/lib/store";
import { useAiStatus } from "@/lib/use-ai-status";
import type { Song } from "@/lib/types";

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
    <div className="space-y-6 pt-6">
      <header>
        <p className="font-jp text-sm font-semibold text-accent">歌で覚える日本語</p>
        <h1 className="text-[28px] leading-tight font-bold">좋아하는 노래로<br />일본어 공부해요</h1>
      </header>

      {ai === false && (
        <p className="rounded-2xl border border-hard/30 bg-hard/10 px-4 py-3 text-sm leading-relaxed text-ink-2">
          아직 서버에 AI 키가 없어서 <b>후리가나 가사</b>와 <b>데모곡</b>만 쓸 수 있어요. 단어장 자동 생성은 키를 설정하면 켜져요.
        </p>
      )}

      <Link
        href="/review"
        className="flex items-center justify-between rounded-3xl bg-accent px-5 py-5 text-accent-ink shadow-sm active:scale-[0.99]"
      >
        <div>
          <div className="text-sm opacity-85">오늘 복습할 단어</div>
          <div className="text-3xl font-bold">{queue.length}개</div>
        </div>
        <span className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold">
          {queue.length ? "복습 시작" : "모두 완료"}
        </span>
      </Link>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">내 노래</h2>
          <Link
            href="/songs/new"
            className="flex items-center gap-1 rounded-full bg-ink px-3.5 py-2 text-sm font-semibold text-bg"
          >
            <Icon name="plus" className="size-4" /> 노래 추가
          </Link>
        </div>
        {order.length === 0 ? (
          <Link
            href="/songs/new"
            className="block rounded-3xl border-2 border-dashed border-line px-5 py-10 text-center text-ink-2"
          >
            <div className="text-3xl">🎧</div>
            <p className="mt-2 font-semibold">첫 노래를 추가해 보세요</p>
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
      <Link
        href={`/songs/${song.id}`}
        className="flex items-center gap-4 rounded-3xl border border-line bg-surface px-4 py-4 active:scale-[0.99]"
      >
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
          <Icon name="music" className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-jp truncate text-[17px] font-bold">{song.title}</div>
          <div className="truncate text-sm text-ink-3">{song.artist || "아티스트 미상"}</div>
        </div>
        <div className="shrink-0 text-right text-xs">
          {song.status === "ready" && (
            <div className="space-y-1">
              <Badge tone="accent">{song.level}</Badge>
              <div className="text-ink-3">단어 {song.vocab.length}</div>
            </div>
          )}
          {song.status === "analyzing" && (
            <span className="flex items-center gap-1.5 text-ink-3">
              {inFlight && <Spinner className="size-3" />}
              {inFlight ? "만드는 중" : "중단됨"}
            </span>
          )}
          {song.status === "error" && <span className="text-accent">다시 시도 필요</span>}
        </div>
      </Link>
    </li>
  );
}
