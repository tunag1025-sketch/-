"use client";

import { useId } from "react";

// Utango 캐릭터 넷. 복습 답(다시·어려움·알맞음·쉬움)과 화면 곳곳의 표정을 맡는다.
//  note   음표  · 파랑   · 알맞음 (기분 좋음)
//  pick   기타 피크 · 노랑 · 쉬움 (신남)
//  bubble 말풍선 · 보라   · 어려움 (졸림)
//  heart  하트  · 핑크   · 다시 (뾰로통)
// 2.5D 유리 질감: 반투명 그라데이션 몸통 + 뒤쪽 두께 + 위쪽 빛 + 흰 테두리. 이미지 파일 없이 SVG 한 장.
export type MascotKind = "note" | "pick" | "bubble" | "heart";

const PALETTE: Record<MascotKind, { light: string; mid: string; deep: string; ink: string }> = {
  note: { light: "#9fd0ff", mid: "#4a8dff", deep: "#2156f5", ink: "#0d2f8a" },
  pick: { light: "#fff1a3", mid: "#ffcb3d", deep: "#ff9d0a", ink: "#7a4200" },
  bubble: { light: "#d2c4ff", mid: "#9a7dff", deep: "#6541f5", ink: "#2c1690" },
  heart: { light: "#ffc8dc", mid: "#ff79ab", deep: "#f23d7e", ink: "#8c0d43" },
};

// 몸통 실루엣 (한 덩어리 path라 테두리·두께를 같은 모양으로 겹칠 수 있다)
const BODY: Record<MascotKind, string> = {
  note: "M60 16Q60 9 67 9C83 10 96 23 93 41C89 33 81 28 70 27V59A30 25 0 1 1 60 48Z",
  pick: "M50 93C42 87 13 54 11 36 9 19 26 9 50 9s41 10 39 27C87 54 58 87 50 93Z",
  bubble:
    "M24 14h52c9 0 15 6 15 15v31c0 9-6 15-15 15H46L28 89c-1.5 1-3.5 0-3-2l3-12h-4c-9 0-15-6-15-15V29c0-9 6-15 15-15Z",
  heart: "M50 88C24 70 8 54 8 35 8 21 19 11 32 11c8 0 14 4 18 10 4-6 10-10 18-10 13 0 24 10 24 24 0 19-16 35-42 53Z",
};

// 웃는 얼굴(커버용)의 눈·입 자리
const HAPPY: Record<MascotKind, { eyes: [number, number][]; mouth: [number, number] }> = {
  note: { eyes: [[31, 66], [50, 65]], mouth: [41, 77] },
  pick: { eyes: [[38, 38], [62, 38]], mouth: [50, 55] },
  bubble: { eyes: [[37, 42], [63, 42]], mouth: [50, 57] },
  heart: { eyes: [[37, 43], [63, 43]], mouth: [50, 58] },
};

function Eye({ cx, cy, r = 8.5, ink, id }: { cx: number; cy: number; r?: number; ink: string; id: string }) {
  return (
    <>
      <ellipse cx={cx + 0.8} cy={cy + 1.6} rx={r} ry={r * 1.04} fill={ink} opacity={0.18} />
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 1.04} fill={`url(#w${id})`} />
      <circle cx={cx + 1.4} cy={cy + 1.6} r={r * 0.56} fill={ink} />
      <circle cx={cx + 3.1} cy={cy - 0.4} r={r * 0.2} fill="#fff" />
    </>
  );
}

function Smile({ x, y, ink, w = 4 }: { x: number; y: number; ink: string; w?: number }) {
  return <path d={`M${x - w} ${y}q${w} ${w} ${w * 2} 0`} fill="none" stroke={ink} strokeWidth={2.3} strokeLinecap="round" />;
}

function Blush({ x, y }: { x: number; y: number }) {
  return <ellipse cx={x} cy={y} rx={5} ry={2.8} fill="#ff6fa5" opacity={0.35} />;
}

function Face({ kind, happy, id }: { kind: MascotKind; happy: boolean; id: string }) {
  const { ink } = PALETTE[kind];
  if (happy || kind === "note") {
    const { eyes, mouth } = HAPPY[kind];
    return (
      <>
        {eyes.map(([x, y]) => (
          <Eye key={x} cx={x} cy={y} ink={ink} id={id} />
        ))}
        <Smile x={mouth[0]} y={mouth[1]} ink={ink} />
        <Blush x={eyes[0][0] - 8} y={eyes[0][1] + 10} />
        <Blush x={eyes[1][0] + 8} y={eyes[1][1] + 10} />
      </>
    );
  }
  switch (kind) {
    case "pick":
      return (
        <>
          <Eye cx={38} cy={38} r={9} ink={ink} id={id} />
          <path d="M57 41q5-7 10 0" fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round" />
          <ellipse cx={50} cy={56} rx={4.2} ry={3.6} fill={ink} opacity={0.85} />
          <Blush x={28} y={51} />
          <Blush x={72} y={51} />
        </>
      );
    case "bubble":
      return (
        <>
          {[37, 63].map((cx) => (
            <g key={cx}>
              <Eye cx={cx} cy={42} r={9.5} ink={ink} id={id} />
              <path d={`M${cx - 10} 42a10 10 0 0 1 20 0Z`} fill={PALETTE.bubble.deep} opacity={0.92} />
            </g>
          ))}
          <path d="M43 59q3.5-3 7 0t7 0" fill="none" stroke={ink} strokeWidth={2.2} strokeLinecap="round" />
        </>
      );
    case "heart":
      return (
        <>
          {[28, 54].map((x) => (
            <g key={x}>
              <path d={`M${x} 41h18a9 9 0 0 1-18 0Z`} fill={`url(#w${id})`} />
              <circle cx={x + 9.6} cy={44.6} r={3.9} fill={ink} />
              <circle cx={x + 11} cy={43} r={1.2} fill="#fff" />
            </g>
          ))}
          <path d="M44 63q6-5 12 0" fill="none" stroke={ink} strokeWidth={2.3} strokeLinecap="round" />
          <Blush x={24} y={56} />
          <Blush x={76} y={56} />
        </>
      );
    default:
      return null;
  }
}

/** 반투명 2.5D 캐릭터 */
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
  const p = PALETTE[kind];
  const d = BODY[kind];
  return (
    <svg viewBox="-4 -4 108 112" className={className} style={style} aria-hidden>
      <defs>
        <linearGradient id={`f${id}`} x1="0.12" y1="0" x2="0.88" y2="1">
          <stop offset="0" stopColor={p.light} stopOpacity={0.8} />
          <stop offset="0.55" stopColor={p.mid} stopOpacity={0.86} />
          <stop offset="1" stopColor={p.deep} stopOpacity={0.76} />
        </linearGradient>
        <linearGradient id={`d${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={p.mid} stopOpacity={0.35} />
          <stop offset="1" stopColor={p.deep} stopOpacity={0.55} />
        </linearGradient>
        <radialGradient id={`g${id}`} cx="0.3" cy="0.18" r="0.62">
          <stop offset="0" stopColor="#fff" stopOpacity={0.85} />
          <stop offset="0.45" stopColor="#fff" stopOpacity={0.2} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`r${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={0.9} />
          <stop offset="0.6" stopColor="#fff" stopOpacity={0.15} />
          <stop offset="1" stopColor="#fff" stopOpacity={0.45} />
        </linearGradient>
        <linearGradient id={`w${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e9efff" />
        </linearGradient>
        <clipPath id={`c${id}`}>
          <path d={d} />
        </clipPath>
      </defs>
      {/* 바닥 그림자 */}
      <ellipse cx="52" cy="101" rx="28" ry="3.5" fill={p.deep} opacity={0.12} />
      {/* 뒤쪽 두께 */}
      <path d={d} fill={`url(#d${id})`} transform="translate(3.5 4.5)" />
      {/* 몸통 */}
      <path d={d} fill={`url(#f${id})`} />
      {/* 위쪽 빛과 아래 안쪽 그늘 */}
      <g clipPath={`url(#c${id})`}>
        <rect x="-4" y="-4" width="108" height="112" fill={`url(#g${id})`} />
        <path d={d} fill="none" stroke={p.deep} strokeOpacity={0.25} strokeWidth={6} transform="translate(-2 -3)" />
      </g>
      {/* 유리 테두리 */}
      <path d={d} fill="none" stroke={`url(#r${id})`} strokeWidth={1.6} />
      <Face kind={kind} happy={happy} id={id} />
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
      <path d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12C7 11 11 7 12 0Z" fill={color} opacity={0.75} />
    </svg>
  );
}

/** 넷이 모여 있는 장면 (홈 카드, 완료 화면) */
export function MascotGroup({ className = "w-32" }: { className?: string }) {
  return (
    <div className={`relative aspect-[5/4] ${className}`} aria-hidden>
      <Mascot kind="pick" happy className="absolute top-[2%] left-[6%] w-[38%]" style={{ transform: "rotate(-12deg)" }} />
      <Mascot kind="heart" happy className="absolute top-0 right-[4%] w-[40%]" style={{ transform: "rotate(10deg)" }} />
      <Mascot kind="note" className="absolute bottom-0 left-0 w-[50%]" />
      <Mascot kind="bubble" happy className="absolute right-0 bottom-[4%] w-[44%]" style={{ transform: "rotate(-6deg)" }} />
      <Twinkle color="#ff9fc6" className="absolute top-[40%] left-[45%] w-[11%]" />
    </div>
  );
}

const MASCOT_FOR_SONG: MascotKind[] = ["note", "pick", "bubble", "heart"];

export function mascotFor(id: string): MascotKind {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return MASCOT_FOR_SONG[h % MASCOT_FOR_SONG.length];
}
