"use client";

import { useId } from "react";

// Utango 캐릭터 넷. 복습 답(다시·어려움·알맞음·쉬움)과 화면 곳곳의 표정을 맡는다.
//  note   음표  · 파랑   · 알맞음 (기분 좋음)
//  pick   기타 피크 · 노랑 · 쉬움 (신남)
//  bubble 말풍선 · 보라   · 어려움 (졸림)
//  heart  하트  · 핑크   · 다시 (뾰로통)
export type MascotKind = "note" | "pick" | "bubble" | "heart";

const PALETTE: Record<MascotKind, { stops: [string, string, string]; ink: string }> = {
  note: { stops: ["#a8d4ff", "#4b8bff", "#1f5cff"], ink: "#0d3a9e" },
  pick: { stops: ["#fff0a6", "#ffc93a", "#ffa400"], ink: "#8a4f00" },
  bubble: { stops: ["#d4c8ff", "#9478ff", "#6a47ff"], ink: "#3a1fa8" },
  heart: { stops: ["#ffd0e2", "#ff77aa", "#ff3d84"], ink: "#9e1048" },
};

const BODY: Record<MascotKind, React.ReactNode> = {
  note: (
    <>
      <rect x="63" y="9" width="10" height="58" rx="5" />
      <path d="M68 9c15 2 27 13 25 30-3-8-11-13-25-13Z" />
      <ellipse cx="42" cy="66" rx="31" ry="26" transform="rotate(-18 42 66)" />
    </>
  ),
  pick: <path d="M50 93C42 87 13 54 11 36 9 19 26 9 50 9s41 10 39 27C87 54 58 87 50 93Z" />,
  bubble: (
    <path d="M24 14h52c9 0 15 6 15 15v31c0 9-6 15-15 15H46L28 89c-1.5 1-3.5 0-3-2l3-12h-4c-9 0-15-6-15-15V29c0-9 6-15 15-15Z" />
  ),
  heart: <path d="M50 88C24 70 8 54 8 35 8 21 19 11 32 11c8 0 14 4 18 10 4-6 10-10 18-10 13 0 24 10 24 24 0 19-16 35-42 53Z" />,
};

// 커버처럼 표정 없이 밝게 웃는 얼굴이 필요할 때 쓰는 눈·입 위치
const HAPPY: Record<MascotKind, { eyes: [number, number][]; mouth: [number, number] }> = {
  note: { eyes: [[33, 64], [52, 58]], mouth: [45, 74] },
  pick: { eyes: [[38, 38], [62, 38]], mouth: [50, 55] },
  bubble: { eyes: [[37, 42], [63, 42]], mouth: [50, 57] },
  heart: { eyes: [[37, 43], [63, 43]], mouth: [50, 58] },
};

function Face({ kind, ink, happy }: { kind: MascotKind; ink: string; happy: boolean }) {
  const eye = (cx: number, cy: number, r = 8.5) => (
    <>
      <circle cx={cx} cy={cy} r={r} fill="#fff" />
      <circle cx={cx + 1.6} cy={cy + 2} r={r * 0.54} fill={ink} />
      <circle cx={cx + 3} cy={cy + 0.6} r={1.4} fill="#fff" />
    </>
  );
  const blush = (cx: number, cy: number) => (
    <ellipse cx={cx} cy={cy} rx={4.5} ry={2.6} fill="#ff8fb8" opacity={0.5} />
  );
  if (happy) {
    const { eyes, mouth } = HAPPY[kind];
    return (
      <>
        {eyes.map(([x, y]) => (
          <g key={x}>{eye(x, y)}</g>
        ))}
        <path
          d={`M${mouth[0] - 4} ${mouth[1]}q4 4 8 0`}
          fill="none"
          stroke={ink}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
        {blush(eyes[0][0] - 8, eyes[0][1] + 10)}
        {blush(eyes[1][0] + 8, eyes[1][1] + 10)}
      </>
    );
  }
  switch (kind) {
    case "note":
      return (
        <>
          {eye(33, 64)}
          {eye(52, 58)}
          <path d="M42 75q3 3 6 0" fill="none" stroke={ink} strokeWidth={2.2} strokeLinecap="round" />
          {blush(24, 73)}
          {blush(60, 67)}
        </>
      );
    case "pick":
      return (
        <>
          {eye(38, 39, 9)}
          <path d="M68 34 57 40l11 6" fill="none" stroke={ink} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
          <ellipse cx={50} cy={57} rx={4.2} ry={3.6} fill="#c35700" />
          {blush(28, 52)}
          {blush(72, 52)}
        </>
      );
    case "bubble":
      return (
        <>
          {[36, 64].map((cx) => (
            <g key={cx}>
              <circle cx={cx} cy={43} r={10} fill="#fff" />
              <circle cx={cx + 1} cy={47} r={4.2} fill={ink} />
              <path d={`M${cx - 10} 43a10 10 0 0 1 20 0Z`} fill="#5b38ea" />
            </g>
          ))}
          <path d="M43 60q3.5-3 7 0t7 0" fill="none" stroke={ink} strokeWidth={2.2} strokeLinecap="round" />
        </>
      );
    case "heart":
      return (
        <>
          {[28, 54].map((x) => (
            <g key={x}>
              <path d={`M${x} 42h18a9 9 0 0 1-18 0Z`} fill="#fff" />
              <circle cx={x + 9.5} cy={45.5} r={3.8} fill={ink} />
            </g>
          ))}
          <path d="M44 63q6-5 12 0" fill="none" stroke={ink} strokeWidth={2.4} strokeLinecap="round" />
          {blush(24, 56)}
          {blush(76, 56)}
        </>
      );
  }
}

/** 부드러운 그라데이션 캐릭터 */
export function Mascot({
  kind,
  className = "size-16",
  style,
  happy = false,
}: {
  kind: MascotKind;
  className?: string;
  style?: React.CSSProperties;
  /** 캐릭터 고유 표정 대신 웃는 얼굴 */
  happy?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const { stops, ink } = PALETTE[kind];
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      style={{ filter: "drop-shadow(0 6px 10px rgb(40 60 140 / 0.18))", ...style }}
      aria-hidden
    >
      <defs>
        <linearGradient id={`g${id}`} x1="0.15" y1="0.05" x2="0.85" y2="0.95">
          <stop offset="0" stopColor={stops[0]} />
          <stop offset="0.55" stopColor={stops[1]} />
          <stop offset="1" stopColor={stops[2]} />
        </linearGradient>
        <radialGradient id={`h${id}`} cx="0.32" cy="0.22" r="0.45">
          <stop offset="0" stopColor="#fff" stopOpacity={0.6} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
      </defs>
      <g fill={`url(#g${id})`}>{BODY[kind]}</g>
      <g fill={`url(#h${id})`}>{BODY[kind]}</g>
      <Face kind={kind} ink={ink} happy={happy} />
    </svg>
  );
}

/** 네 갈래 반짝이 */
export function Twinkle({
  color = "#7fb2ff",
  className = "size-5",
  style,
}: {
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden>
      <path d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12C7 11 11 7 12 0Z" fill={color} opacity={0.9} />
    </svg>
  );
}

/** 넷이 모여 있는 장면 (홈 카드, 완료 화면) */
export function MascotGroup({ className = "w-32" }: { className?: string }) {
  return (
    <div className={`relative aspect-[5/4] ${className}`} aria-hidden>
      <Mascot kind="pick" className="absolute top-[2%] left-[8%] w-[38%]" style={{ transform: "rotate(-12deg)" }} />
      <Mascot kind="heart" className="absolute top-0 right-[6%] w-[40%]" style={{ transform: "rotate(10deg)" }} />
      <Mascot kind="note" className="absolute bottom-0 left-0 w-[50%]" />
      <Mascot kind="bubble" className="absolute right-0 bottom-[4%] w-[44%]" style={{ transform: "rotate(-6deg)" }} />
      <Twinkle color="#ff9fc6" className="absolute top-[38%] left-[46%] w-[12%]" />
    </div>
  );
}

export const MASCOT_FOR_SONG: MascotKind[] = ["note", "pick", "bubble", "heart"];

export function mascotFor(id: string): MascotKind {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return MASCOT_FOR_SONG[h % MASCOT_FOR_SONG.length];
}
