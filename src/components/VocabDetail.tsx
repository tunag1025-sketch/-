"use client";

import { useMemo } from "react";
import { cardKey, cardOf, otherSongsWith } from "@/lib/cards";
import { LEARNED_INTERVAL_DAYS, LEARNED_PERFECT_STREAK, memoryOf } from "@/lib/srs";
import { useStore } from "@/lib/store";
import type { Song, VocabItem } from "@/lib/types";
import { Badge } from "./Badge";
import { Icon } from "./Icon";
import { KanjiBreakdown } from "./KanjiBreakdown";
import { LyricLineView } from "./LyricLineView";
import { Ruby } from "./Ruby";
import { SpeakButton } from "./SpeakButton";

export function WordHeading({
  item,
  size = "lg",
  center = false,
}: {
  item: VocabItem;
  size?: "lg" | "md";
  center?: boolean;
}) {
  return (
    <div className={`font-jp ${center ? "text-center" : ""}`}>
      <div className="text-[15px] font-medium text-ink-3">{item.reading}</div>
      <div className={`flex items-center gap-3 ${center ? "justify-center" : ""}`}>
        <span className={`leading-tight font-bold ${size === "lg" ? "text-[40px]" : "text-[28px]"}`}>{item.word}</span>
        <SpeakButton text={item.reading || item.word} label={`${item.word} 발음 듣기`} />
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2.5 text-[13px] font-semibold text-ink-3">{children}</h3>;
}

/** 단어 하나의 뜻·설명·예문·가사 속 위치를 보여준다. */
export function VocabDetail({
  item,
  song,
  showHeading = true,
  onLearned,
}: {
  item: VocabItem;
  song?: Song;
  showHeading?: boolean;
  /** 장기기억으로 옮긴 뒤 불린다 (학습 화면에서 다음 카드로 넘길 때) */
  onLearned?: () => void;
}) {
  const card = useStore((s) => cardOf(s.cards, item));
  const setLearned = useStore((s) => s.setLearned);
  const furigana = useStore((s) => s.settings.furigana);
  const songs = useStore((s) => s.songs);
  const order = useStore((s) => s.order);
  // 같은 단어가 나오는 다른 노래 (학습 기록은 함께 쓴다)
  const alsoIn = useMemo(() => otherSongsWith(songs, order, item), [songs, order, item]);
  const learned = card?.learned ?? false;
  const memory = memoryOf(card);

  return (
    <div className="space-y-6">
      {showHeading && <WordHeading item={item} />}
      <div>
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          <Badge>{item.pos}</Badge>
          {item.jlpt !== "기타" && <Badge tone="blue">JLPT {item.jlpt}</Badge>}
          {memory === "long" && <Badge tone="solid">장기기억</Badge>}
          {memory === "short" && <Badge tone="short">단기기억</Badge>}
        </div>
        <p className="text-[21px] leading-snug font-bold">{item.meaning}</p>
        {item.note && <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{item.note}</p>}
      </div>

      <KanjiBreakdown item={item} />

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
          {alsoIn.length > 0 && (
            <p className="mt-2.5 text-[13px] leading-relaxed text-ink-3">
              <span className="font-jp font-semibold text-ink-2">{alsoIn.map((s) => `「${s.title}」`).join(" ")}</span>
              에도 나와요. 학습 기록은 함께 쌓여요.
            </p>
          )}
        </section>
      )}

      {item.examples.length > 0 && (
        <section>
          <SectionLabel>예문</SectionLabel>
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {item.examples.map((ex, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-jp text-[17px] leading-[2.1]">
                    <Ruby segs={ex.segs} hideReading={!furigana} />
                  </p>
                  <p className="text-[14px] text-ink-2">{ex.ko}</p>
                </div>
                <SpeakButton text={ex.ja} label="예문 듣기" className="mt-2 size-8" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div>
        <button
          type="button"
          onClick={() => {
            setLearned(cardKey(item), !learned);
            if (!learned) onLearned?.();
          }}
          aria-pressed={learned}
          className="press btn-ghost flex w-full items-center justify-center gap-1.5 px-4 py-3.5 text-[15px] font-semibold aria-pressed:border-blue aria-pressed:bg-blue-soft"
        >
          {learned ? (
            <>
              <Icon name="check" className="size-4" /> 장기기억 · 다시 학습하기
            </>
          ) : (
            "이미 아는 단어예요 · 장기기억으로 옮기기"
          )}
        </button>
        {!learned && (
          <p className="mt-2 text-center text-[12px] leading-relaxed text-ink-3">
            이해·완벽을 한 번 고르면 단기기억, 완벽을 {LEARNED_PERFECT_STREAK}번 연달아 고르거나{" "}
            {LEARNED_INTERVAL_DAYS / 7}주 넘게 기억하면 장기기억으로 옮겨져요.
          </p>
        )}
      </div>
    </div>
  );
}
