"use client";

import { speak, useCanSpeak } from "@/lib/speech";
import { Icon } from "./Icon";

/** 일본어 발음 듣기 버튼. 기기에 일본어 음성이 없으면 그리지 않는다. */
export function SpeakButton({
  text,
  label = "발음 듣기",
  className = "size-9",
  plain = false,
}: {
  text: string;
  label?: string;
  className?: string;
  /** 색 있는 바탕 위에 놓을 때: 흰 동그라미 */
  plain?: boolean;
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
      className={`press grid shrink-0 place-items-center rounded-full text-blue ${plain ? "bg-surface" : "bg-blue-soft"} ${className}`}
    >
      <Icon name="volume" className="size-[50%]" />
    </button>
  );
}
