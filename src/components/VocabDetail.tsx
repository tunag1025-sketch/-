"use client";

import { useStore } from "@/lib/store";
import type { Song, VocabItem } from "@/lib/types";
import { Badge } from "./Badge";
import { LyricLineView } from "./LyricLineView";
import { Ruby } from "./Ruby";

export function WordHeading({ item, size = "lg" }: { item: VocabItem; size?: "lg" | "md" }) {
  return (
    <div className="font-jp">
      <div className="text-sm text-ink-3">{item.reading}</div>
      <div className={size === "lg" ? "text-4xl font-bold" : "text-2xl font-bold"}>{item.word}</div>
    </div>
  );
}

/** 단어 하나의 뜻·설명·예문·가사 속 위치를 보여준다. */
export function VocabDetail({ item, song, showHeading = true }: { item: VocabItem; song?: Song; showHeading?: boolean }) {
  const card = useStore((s) => s.cards[item.id]);
  const setSuspended = useStore((s) => s.setSuspended);
  const furigana = useStore((s) => s.settings.furigana);
  const suspended = card?.suspended ?? false;

  return (
    <div className="space-y-5">
      {showHeading && <WordHeading item={item} />}
      <div>
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          <Badge>{item.pos}</Badge>
          {item.jlpt !== "기타" && <Badge tone="accent">{item.jlpt}</Badge>}
        </div>
        <p className="text-lg font-semibold">{item.meaning}</p>
        {item.note && <p className="mt-1 text-[15px] leading-relaxed text-ink-2">{item.note}</p>}
      </div>

      {song && item.lines.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-ink-3">노래 속에서</h3>
          <ul className="space-y-2">
            {item.lines.map((n) => (
              <li key={n} className="rounded-2xl bg-surface-2 px-4 py-3 text-[17px] leading-[2.2]">
                <LyricLineView line={song.lines[n]} index={n} vocab={[item]} focusId={item.id} furigana={furigana} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {item.examples.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-ink-3">예문</h3>
          <ul className="space-y-3">
            {item.examples.map((ex, i) => (
              <li key={i} className="border-l-2 border-accent/40 pl-3">
                <p className="font-jp text-[17px] leading-[2.1]">
                  <Ruby segs={ex.segs} hideReading={!furigana} />
                </p>
                <p className="text-sm text-ink-2">{ex.ko}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <button
        type="button"
        onClick={() => setSuspended(item.id, !suspended)}
        className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold ${
          suspended ? "border-good/40 bg-good/10 text-good" : "border-line text-ink-2 hover:bg-surface-2"
        }`}
      >
        {suspended ? "✓ 외운 단어 (복습에서 빠짐) · 다시 복습하기" : "이미 아는 단어예요 · 복습에서 빼기"}
      </button>
    </div>
  );
}
