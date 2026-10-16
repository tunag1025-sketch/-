import { Icon } from "./Icon";

const TONES = ["var(--blue)", "var(--violet)", "var(--pink)"] as const;

function toneFor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}

/** 노래 커버: 제목 첫 글자를 노래마다 정해진 색의 타일에 */
export function SongCover({
  id,
  title,
  className = "size-[60px] rounded-[20px] text-[26px]",
}: {
  id: string;
  title: string;
  className?: string;
}) {
  const tone = toneFor(id);
  const first = Array.from(title.trim()).find((c) => /[\p{L}\p{N}]/u.test(c));
  return (
    <span
      className={`font-jp grid shrink-0 place-items-center font-bold ${className}`}
      style={{
        color: tone,
        background: `linear-gradient(140deg, color-mix(in srgb, ${tone} 8%, var(--surface)), color-mix(in srgb, ${tone} 22%, var(--surface)))`,
      }}
      aria-hidden
    >
      {first ?? <Icon name="music" className="size-[40%]" />}
    </span>
  );
}
