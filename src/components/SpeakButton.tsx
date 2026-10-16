"use client";

import { speak, useCanSpeak } from "@/lib/speech";
import { Icon } from "./Icon";

/** 일본어 발음 듣기 버튼. 기기에 일본어 음성이 없으면 그리지 않는다. */
const TONES = {
  soft: "bg-blue-soft",
  /** 색 있는 바탕 위에 놓을 때: 흰 동그라미 */
  plain: "bg-surface",
  muted: "bg-muted",
  /** 바탕 없이 아이콘만 (해석 줄 옆) */
  none: "",
} as const;

export function SpeakButton({
  text,
  label = "발음 듣기",
  className = "size-9",
  tone = "soft",
}: {
  text: string;
  label?: string;
  className?: string;
  tone?: keyof typeof TONES;
}) {
  const can = useCanSpeak();
  if (!can) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        speak(text);
      }}
      aria-label={label}
      className={`press grid shrink-0 place-items-center rounded-full text-blue ${TONES[tone]} ${className}`}
    >
      <Icon name="volume" className="size-[50%]" />
    </button>
  );
}
