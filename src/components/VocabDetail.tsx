"use client";

import { useMemo } from "react";
import { cardKey, cardOf, otherSongsWith } from "@/lib/cards";
import { LEARNED_INTERVAL_DAYS, LEARNED_PERFECT_STREAK, memoryOf } from "@/lib/srs";
import { useStore } from "@/lib/store";
import type { Song, VocabItem } from "@/lib/types";
import { useLineExplanation } from "@/lib/use-line-explanation";
import { Icon } from "./Icon";
import { KanjiBreakdown } from "./KanjiBreakdown";
import { LyricLineView } from "./LyricLineView";
import { Ruby } from "./Ruby";
import { SpeakButton } from "./SpeakButton";

/** 읽기 + 큰 단어 + 듣기 버튼 */
export function WordHeading({
  item,
  size = "lg",
  center = false,
}: {
  item: VocabItem;
  /** lg: 단어 카드(44px·듣기 40px) / card: 답 보기(44px·36px) / md: 틀렸을 때(40px·36px) */
  size?: "lg" | "card" | "md";
  center?: boolean;
}) {
  return (
    <div className={`font-jp ${center ? "text-center" : ""}`}>
      <div className="text-[15px] font-medium tracking-[0.04em] text-ink-3">{item.reading}</div>
      <div className={`flex items-center ${center ? "justify-center gap-2.5" : "gap-3"}`}>
        <span className={`leading-[1.25] font-bold ${size === "md" ? "text-[40px]" : "text-[44px]"}`}>{item.word}</span>
        <SpeakButton
          text={item.reading || item.word}
          label={`${item.word} 발음 듣기`}
          className={size === "lg" ? "size-10" : "size-9"}
        />
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2.5 text-[13px] font-semibold text-ink-3">{children}</h3>;
}

const PILL = "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold";

/** 가사 한 줄과 그 줄의 해석 (노래 속에서) */
function SongLine({ song, index, item, furigana }: { song: Song; index: number; item: VocabItem; furigana: boolean }) {
  const { explanation } = useLineExplanation(song, index);
  return (
    <li className="iris rounded-[20px] px-4 pt-1.5 pb-3">
      <p className="font-jp lyric text-[18px] leading-[2.3]">
        <LyricLineView line={song.lines[index]} index={index} vocab={[item]} focusId={item.id} furigana={furigana} />
      </p>
      {explanation && <p className="mt-0.5 text-[14px] leading-normal text-ink-2">{explanation.translation}</p>}
    </li>
  );
}

/**
 * 단어 하나의 뜻·설명·예문·가사 속 위치를 보여준다.
 * summary를 끄면(학습 화면의 답 보기 아래) 뜻·뱃지·가사 줄은 빼고 한자·예문만 보여 준다.
 */
export function VocabDetail({
  item,
  song,
  showHeading = true,
  summary = true,
  onLearned,
}: {
  item: VocabItem;
  song?: Song;
  showHeading?: boolean;
  summary?: boolean;
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
  // 후렴처럼 같은 가사가 여러 번 나오면 한 번만 (해석도 한 번만 받는다)
  const lines = useMemo(() => {
    if (!song) return [];
    const seen = new Set<string>();
    return item.lines.filter((n) => {
      const text = song.lines[n]?.text;
      if (!text || seen.has(text)) return false;
      seen.add(text);
      return true;
    });
  }, [song, item.lines]);

  return (
    <div className="space-y-7">
      {summary && (
        <div>
          {showHeading && <WordHeading item={item} />}
          <p className={`${showHeading ? "mt-2.5" : ""} text-[22px] leading-[1.35] font-bold`}>{item.meaning}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span className={`${PILL} bg-muted text-ink-2`}>{item.pos}</span>
            {item.jlpt !== "기타" && <span className={`${PILL} num bg-blue-soft text-blue`}>JLPT {item.jlpt}</span>}
            {memory === "long" && (
              <span className={`${PILL} bg-btn text-white`}>
                <Icon name="check" className="size-3" strokeWidth={2.5} /> 장기기억
              </span>
            )}
            {memory === "short" && <span className={`${PILL} bg-[color:var(--short-term)]/30 text-blue`}>단기기억</span>}
          </div>
          {item.note && <p className="mt-3 text-[15px] leading-[1.65] text-ink-2">{item.note}</p>}
        </div>
      )}

      {summary && song && lines.length > 0 && (
        <section>
          <SectionLabel>노래 속에서</SectionLabel>
          <ul className="space-y-2">
            {lines.map((n) => (
              <SongLine key={n} song={song} index={n} item={item} furigana={furigana} />
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

      <KanjiBreakdown item={item} />

      {item.examples.length > 0 && (
        <section>
          <SectionLabel>예문</SectionLabel>
          <ul className="divide-y divide-line rounded-[20px] border border-line">
            {item.examples.map((ex, i) => (
              <li key={i} className="flex items-start gap-3 px-4 pt-2.5 pb-3">
                <div className="min-w-0 flex-1">
                  <p className="font-jp lyric text-[17px] leading-[2.2]">
                    <Ruby segs={ex.segs} hideReading={!furigana} />
                  </p>
                  <p className="text-[14px] text-ink-2">{ex.ko}</p>
                </div>
                <SpeakButton text={ex.ja} label="예문 듣기" className="mt-3 size-8 text-ink-2" tone="muted" />
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
          className="press btn-ghost flex h-[52px] w-full items-center justify-center gap-1.5 px-4 text-[15px] font-semibold aria-pressed:border-blue aria-pressed:bg-blue-soft"
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
