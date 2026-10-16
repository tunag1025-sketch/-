"use client";

import { useId } from "react";

// Utango 캐릭터 넷: 뿌옇게 번지는 유리 젤리에 빛나는 타원 눈 두 개.
// 몸 밖으로 번지는 오라 + 윗가장자리 뒤의 빛 + 위쪽이 하얗게 서린 그라데이션 + 흐릿한 경계.
//  blob  덩어리 · 파랑  · 알맞음
//  star  별    · 노랑  · 쉬움
//  ball  공    · 핑크  · 어려움
//  heart 하트  · 빨강  · 다시
export type MascotKind = "blob" | "star" | "ball" | "heart";

type Look = { top: string; mid: string; bottom: string; aura: string; rim: string };

const LOOK: Record<MascotKind, Look> = {
  blob: { top: "#ece9ff", mid: "#78a9ff", bottom: "#3d64ff", aura: "#ff6fe0", rim: "#45e4ff" },
  star: { top: "#fffbe8", mid: "#ffd96e", bottom: "#ffad2b", aura: "#ff9a5c", rim: "#fff08a" },
  ball: { top: "#fff1fb", mid: "#f6b6ef", bottom: "#e47fe4", aura: "#ff9bea", rim: "#ffc8f3" },
  heart: { top: "#ffeef0", mid: "#ff8d98", bottom: "#f5455f", aura: "#ff5fb0", rim: "#ffc3a8" },
};

/** 꼭짓점을 둥글린 별 */
function roundedStar(cx: number, cy: number, outer: number, inner: number, round: number) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
  const lerp = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const f = (p: number[]) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  let d = "";
  pts.forEach((p, i) => {
    const t = i % 2 === 0 ? round : round * 0.6;
    const a = lerp(p, pts[(i + 9) % 10], t);
    const b = lerp(p, pts[(i + 1) % 10], t);
    d += `${i === 0 ? "M" : "L"}${f(a)}Q${f(p)} ${f(b)}`;
  });
  return `${d}Z`;
}

const BODY: Record<MascotKind, string> = {
  blob: "M60 26C86 26 98 44 98 65c0 21-14 31-38 31S22 86 22 65C22 44 34 26 60 26Z",
  heart: "M60 97C35 80 21 66 21 46c0-13 10-22 23-22 7 0 12 3 16 9 4-6 9-9 16-9 13 0 23 9 23 22 0 20-14 34-39 51Z",
  star: roundedStar(60, 63, 42, 22, 0.32),
  ball: "M60 26a35 35 0 1 1 0 70a35 35 0 1 1 0-70Z",
};

// 눈 두 개의 가운데, 간격, 크기
const EYES: Record<MascotKind, { x: number; y: number; gap: number; rx: number; ry: number }> = {
  blob: { x: 60, y: 67, gap: 14, rx: 8.6, ry: 11.8 },
  heart: { x: 60, y: 55, gap: 12.5, rx: 7.6, ry: 10.4 },
  star: { x: 60, y: 65, gap: 9.5, rx: 6, ry: 8.2 },
  ball: { x: 60, y: 64, gap: 12.5, rx: 7.8, ry: 10.6 },
};

/** 젤리 캐릭터 */
export function Mascot({
  kind,
  className = "size-16",
  style,
}: {
  kind: MascotKind;
  className?: string;
  style?: React.CSSProperties;
}) {
  const id = useId().replace(/:/g, "");
  const c = LOOK[kind];
  const d = BODY[kind];
  const e = EYES[kind];
  const url = (n: string) => `url(#${n}${id})`;
  const blur = (n: string, s: number) => (
    <filter id={`${n}${id}`} x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation={s} />
    </filter>
  );
  return (
    <svg viewBox="0 0 120 120" className={className} style={{ overflow: "visible", ...style }} aria-hidden>
      <defs>
        {blur("aura", 10)}
        {blur("rimb", 3.2)}
        {blur("soft", 1.8)}
        {blur("haze", 6)}
        {blur("eg", 2.4)}
        <linearGradient id={`body${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.top} />
          <stop offset="0.45" stopColor={c.mid} />
          <stop offset="1" stopColor={c.bottom} />
        </linearGradient>
        {/* 윗부분에만 빛이 남도록 위에서 아래로 사라지는 테두리 */}
        <linearGradient id={`rim${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.rim} stopOpacity={1} />
          <stop offset="0.35" stopColor={c.rim} stopOpacity={0.6} />
          <stop offset="0.6" stopColor={c.rim} stopOpacity={0} />
        </linearGradient>
        <radialGradient id={`eye${id}`} cx="0.42" cy="0.38" r="0.7">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.65" stopColor="#f3f9ff" />
          <stop offset="1" stopColor="#cfe6ff" />
        </radialGradient>
        <clipPath id={`clip${id}`}>
          <path d={d} />
        </clipPath>
      </defs>

      {/* 몸 밖으로 번지는 오라 */}
      <path d={d} fill={c.aura} opacity={0.68} filter={url("aura")} transform="translate(60 64) scale(1.2) translate(-60 -64)" />
      {/* 윗가장자리 뒤에서 비치는 빛 */}
      <path d={d} fill="none" stroke={url("rim")} strokeWidth={9} filter={url("rimb")} transform="translate(0 -3)" />

      {/* 흐릿한 경계의 몸통 */}
      <g filter={url("soft")}>
        <path d={d} fill={url("body")} opacity={0.96} />
        <g clipPath={url("clip")}>
          {/* 위쪽이 하얗게 서린 느낌 */}
          <ellipse cx="60" cy="40" rx="36" ry="19" fill="#ffffff" opacity={0.78} filter={url("haze")} />
          {/* 아래쪽 가장자리가 조금 더 진하게 */}
          <path d={d} fill="none" stroke={c.bottom} strokeWidth={8} opacity={0.35} filter={url("haze")} transform="translate(0 5)" />
        </g>
      </g>

      {/* 은은하게 빛나는 타원 눈 */}
      {[-1, 1].map((s) => {
        const cx = e.x + s * e.gap;
        const tilt = s === 1 ? 8 : -2;
        return (
          <g key={s} transform={`rotate(${tilt} ${cx} ${e.y})`}>
            <ellipse cx={cx} cy={e.y} rx={e.rx * 1.35} ry={e.ry * 1.3} fill="#ffffff" opacity={0.55} filter={url("eg")} />
            <ellipse cx={cx} cy={e.y} rx={e.rx} ry={e.ry} fill={url("eye")} />
          </g>
        );
      })}
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
      <Mascot kind="star" className="absolute -top-[2%] left-0 w-[42%]" style={{ transform: "rotate(-10deg)" }} />
      <Mascot kind="heart" className="absolute -top-[6%] right-0 w-[50%]" />
      <Mascot kind="blob" className="absolute -bottom-[6%] left-[6%] w-[52%]" />
      <Mascot kind="ball" className="absolute right-[2%] -bottom-[2%] w-[42%]" />
    </div>
  );
}

const MASCOT_FOR_SONG: MascotKind[] = ["blob", "star", "ball", "heart"];

export function mascotFor(id: string): MascotKind {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return MASCOT_FOR_SONG[h % MASCOT_FOR_SONG.length];
}
