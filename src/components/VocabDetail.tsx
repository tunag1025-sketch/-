"use client";

import { useStore } from "@/lib/store";
import type { Song, VocabItem } from "@/lib/types";
import { Badge } from "./Badge";
import { Icon } from "./Icon";
import { LyricLineView } from "./LyricLineView";
import { Ruby } from "./Ruby";

export function WordHeading({ item, size = "lg" }: { item: VocabItem; size?: "lg" | "md" }) {
  return (
    <div className="font-jp">
      <div className="text-[15px] font-medium text-ink-3">{item.reading}</div>
      <div className={`leading-tight font-bold ${size === "lg" ? "text-[40px]" : "text-[28px]"}`}>{item.word}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2.5 text-[13px] font-semibold text-ink-3">{children}</h3>;
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
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          <Badge>{item.pos}</Badge>
          {item.jlpt !== "기타" && <Badge tone="blue">JLPT {item.jlpt}</Badge>}
        </div>
        <p className="text-[21px] leading-snug font-bold">{item.meaning}</p>
        {item.note && <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{item.note}</p>}
      </div>

      {song && item.lines.length > 0 && (
        <section>
          <SectionLabel>노래 속에서</SectionLabel>
          <ul className="space-y-2">
            {item.lines.map((n) => (
              <li key={n} className="iris rounded-2xl px-4 py-3 text-[17px] leading-[2.2]">
                <LyricLineView line={song.lines[n]} index={n} vocab={[item]} focusId={item.id} furigana={furigana} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {item.examples.length > 0 && (
        <section>
          <SectionLabel>예문</SectionLabel>
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {item.examples.map((ex, i) => (
              <li key={i} className="px-4 py-3">
                <p className="font-jp text-[17px] leading-[2.1]">
                  <Ruby segs={ex.segs} hideReading={!furigana} />
                </p>
                <p className="text-[14px] text-ink-2">{ex.ko}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <button
        type="button"
        onClick={() => setSuspended(item.id, !suspended)}
        aria-pressed={suspended}
        className="press btn-ghost flex w-full items-center justify-center gap-1.5 px-4 py-3.5 text-[15px] font-semibold aria-pressed:border-blue aria-pressed:bg-blue-soft"
      >
        {suspended ? (
          <>
            <Icon name="check" className="size-4" /> 외운 단어 · 다시 복습하기
          </>
        ) : (
          "이미 아는 단어예요 · 복습에서 빼기"
        )}
      </button>
    </div>
  );
}
