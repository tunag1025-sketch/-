"use client";

import { useStore } from "@/lib/store";
import type { Song, VocabItem } from "@/lib/types";
import { Badge } from "./Badge";
import { Icon } from "./Icon";
import { LyricLineView } from "./LyricLineView";
import { Ruby } from "./Ruby";

export function WordHeading({ item, size = "lg" }: { item: VocabItem; size?: "lg" | "md" }) {
  return (
    <div>
      <div className="font-jp text-sm font-semibold text-ink-3">{item.reading}</div>
      <div className={`font-jp leading-tight font-extrabold ${size === "lg" ? "text-[42px]" : "text-[28px]"}`}>{item.word}</div>
    </div>
  );
}

function SectionLabel({ en, ko }: { en: string; ko: string }) {
  return (
    <h3 className="mb-2 flex items-baseline gap-2">
      <span className="font-mono text-[11px] font-bold tracking-wider text-pink-text">[ {en} ]</span>
      <span className="text-xs font-semibold text-ink-3">{ko}</span>
    </h3>
  );
}

/** 단어 하나의 뜻·설명·예문·가사 속 위치를 보여준다. */
export function VocabDetail({ item, song, showHeading = true }: { item: VocabItem; song?: Song; showHeading?: boolean }) {
  const card = useStore((s) => s.cards[item.id]);
  const setSuspended = useStore((s) => s.setSuspended);
  const furigana = useStore((s) => s.settings.furigana);
  const suspended = card?.suspended ?? false;

  return (
    <div className="space-y-6">
      {showHeading && <WordHeading item={item} />}
      <div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          <Badge>{item.pos}</Badge>
          {item.jlpt !== "기타" && (
            <Badge tone="pink" pixel>
              {item.jlpt}
            </Badge>
          )}
        </div>
        <p className="text-[21px] leading-snug font-extrabold">{item.meaning}</p>
        {item.note && <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{item.note}</p>}
      </div>

      {song && item.lines.length > 0 && (
        <section>
          <SectionLabel en="IN THE SONG" ko="노래 속에서" />
          <ul className="space-y-2">
            {item.lines.map((n) => (
              <li key={n} className="rounded-2xl border-2 border-edge bg-sky/40 px-4 py-3 text-[17px] leading-[2.2]">
                <LyricLineView line={song.lines[n]} index={n} vocab={[item]} focusId={item.id} furigana={furigana} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {item.examples.length > 0 && (
        <section>
          <SectionLabel en="EXAMPLES" ko="예문" />
          <ul className="space-y-3">
            {item.examples.map((ex, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-pixel mt-2 text-sm text-pink-text">0{i + 1}</span>
                <div>
                  <p className="font-jp text-[17px] leading-[2.1]">
                    <Ruby segs={ex.segs} hideReading={!furigana} />
                  </p>
                  <p className="text-sm text-ink-2">{ex.ko}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <button
        type="button"
        onClick={() => setSuspended(item.id, !suspended)}
        className={`sticker-sm press flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-3 text-sm font-bold ${
          suspended ? "bg-lemon text-black" : "bg-surface text-ink-2"
        }`}
      >
        {suspended ? (
          <>
            <Icon name="check" className="size-4" /> 외운 단어예요 · 다시 복습하기
          </>
        ) : (
          "이미 아는 단어예요 · 복습에서 빼기"
        )}
      </button>
    </div>
  );
}
