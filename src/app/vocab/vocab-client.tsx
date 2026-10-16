"use client";

import { useMemo, useState } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { Sheet } from "@/components/Sheet";
import { Bow } from "@/components/Stickers";
import { VocabDetail } from "@/components/VocabDetail";
import { VocabRow } from "@/components/VocabRow";
import { kataToHira } from "@/lib/furigana";
import { useStore } from "@/lib/store";

export function VocabClient() {
  return (
    <HydrationGate>
      <VocabList />
    </HydrationGate>
  );
}

function VocabList() {
  const songs = useStore((s) => s.songs);
  const order = useStore((s) => s.order);
  const cards = useStore((s) => s.cards);
  const [query, setQuery] = useState("");
  const [songFilter, setSongFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const all = useMemo(
    () => order.flatMap((id) => (songs[id]?.status === "ready" ? songs[id].vocab : [])),
    [songs, order],
  );
  const q = kataToHira(query.trim().toLowerCase());
  const items = all.filter(
    (v) =>
      (songFilter === "all" || v.songId === songFilter) &&
      (!q || v.word.includes(q) || v.reading.includes(q) || v.meaning.toLowerCase().includes(q)),
  );
  const open = openId ? all.find((v) => v.id === openId) : undefined;
  const songsWithVocab = order.filter((id) => songs[id]?.vocab.length);
  const learned = all.filter((v) => cards[v.id]?.suspended).length;

  return (
    <div className="space-y-4">
      <PageHeader label="WORDBOOK" title="단어장" right={<Bow className="mb-1 w-14 rotate-6" />} />

      <div className="grid grid-cols-2 gap-3">
        <div className="sticker bg-lemon px-4 py-3 text-black">
          <p className="font-mono text-[10px] font-bold tracking-wider">[ ALL WORDS ]</p>
          <p className="font-pixel text-[34px] leading-none">{all.length}</p>
        </div>
        <div className="sticker bg-candy px-4 py-3 text-black">
          <p className="font-mono text-[10px] font-bold tracking-wider">[ LEARNED ]</p>
          <p className="font-pixel text-[34px] leading-none">{learned}</p>
        </div>
      </div>

      <div className="relative">
        <Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="단어, 읽기, 뜻으로 찾기"
          className="font-jp input pl-10"
        />
      </div>

      {songsWithVocab.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pt-0.5 pb-1.5">
          {[["all", "전체"] as const, ...songsWithVocab.map((id) => [id, songs[id].title] as const)].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSongFilter(id)}
              className={`sticker-sm press shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold ${
                songFilter === id ? "bg-ink text-bg" : "bg-surface text-ink-2"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink-3">
          {all.length === 0 ? "노래를 추가하면 여기에 단어가 모여요." : "찾는 단어가 없어요."}
        </p>
      ) : (
        <ul className="sticker divide-y divide-line overflow-hidden">
          {items.map((v) => (
            <VocabRow
              key={v.id}
              item={v}
              suspended={cards[v.id]?.suspended}
              sub={songs[v.songId]?.title}
              onClick={() => setOpenId(v.id)}
            />
          ))}
        </ul>
      )}

      <Sheet open={!!open} onClose={() => setOpenId(null)} title={open ? songs[open.songId]?.title : undefined}>
        {open && <VocabDetail item={open} song={songs[open.songId]} />}
      </Sheet>
    </div>
  );
}
