// 장식용 스티커 그림들. 색은 다크 모드에서도 그대로 쓰는 고정 팔레트.
const INK = "#17121f";
const PINK = "#ff4fb8";
const SKY = "#9ee0ff";
const LEMON = "#eeff8a";
const WHITE = "#ffffff";

function heartPath(cx: number, cy: number, s: number) {
  const f = (n: number) => n.toFixed(1);
  return [
    `M${f(cx)} ${f(cy + s * 0.48)}`,
    `C${f(cx - s * 0.95)} ${f(cy - s * 0.05)} ${f(cx - s * 0.6)} ${f(cy - s * 0.8)} ${f(cx)} ${f(cy - s * 0.32)}`,
    `C${f(cx + s * 0.6)} ${f(cy - s * 0.8)} ${f(cx + s * 0.95)} ${f(cy - s * 0.05)} ${f(cx)} ${f(cy + s * 0.48)}Z`,
  ].join(" ");
}

type Props = { className?: string; style?: React.CSSProperties };

/** 마스코트: 하트 선글라스를 낀 카세트테이프 */
export function Cassette({ className, style }: Props) {
  return (
    <svg viewBox="0 0 140 124" className={className} style={style} aria-hidden>
      {/* 스티커 흰 테두리 */}
      <g stroke={WHITE} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" fill={WHITE}>
        <rect x="12" y="20" width="116" height="80" rx="16" />
        <path d="M56 98 52 112M84 98l4 14" />
        <ellipse cx="48" cy="114" rx="9" ry="5" />
        <ellipse cx="92" cy="114" rx="9" ry="5" />
      </g>
      <path d="M56 98 52 112M84 98l4 14" stroke={INK} strokeWidth={5} strokeLinecap="round" />
      <ellipse cx="48" cy="114" rx="9" ry="5" fill={PINK} stroke={INK} strokeWidth={3} />
      <ellipse cx="92" cy="114" rx="9" ry="5" fill={PINK} stroke={INK} strokeWidth={3} />
      <rect x="12" y="20" width="116" height="80" rx="16" fill={SKY} stroke={INK} strokeWidth={4} />
      <rect x="54" y="13" width="32" height="12" rx="6" fill={LEMON} stroke={INK} strokeWidth={3} />
      {[
        [24, 32],
        [116, 32],
        [24, 88],
        [116, 88],
      ].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r={3} fill={INK} />
      ))}
      <rect x="28" y="32" width="84" height="40" rx="10" fill={WHITE} stroke={INK} strokeWidth={3.5} />
      <path d="M64 50h12" stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
      <path d={heartPath(51, 52, 26)} fill={PINK} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <path d={heartPath(89, 52, 26)} fill={PINK} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <ellipse cx="44" cy="46" rx="4" ry="2.5" fill={WHITE} transform="rotate(-30 44 46)" />
      <ellipse cx="82" cy="46" rx="4" ry="2.5" fill={WHITE} transform="rotate(-30 82 46)" />
      <path d="M60 82q10 9 20 0" fill="none" stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
      <ellipse cx="36" cy="84" rx="6" ry="3.5" fill={PINK} opacity={0.7} />
      <ellipse cx="104" cy="84" rx="6" ry="3.5" fill={PINK} opacity={0.7} />
    </svg>
  );
}

/** 네 갈래 반짝이 */
export function Sparkle({ className, style, color = LEMON }: Props & { color?: string }) {
  const d = "M12 1c1 6.2 4.8 10 11 11-6.2 1-10 4.8-11 11-1-6.2-4.8-10-11-11 6.2-1 10-4.8 11-11Z";
  return (
    <svg viewBox="-2 -2 28 28" className={className} style={style} aria-hidden>
      <path d={d} fill={WHITE} stroke={WHITE} strokeWidth={5} strokeLinejoin="round" />
      <path d={d} fill={color} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  );
}

/** 하트 */
export function Heart({ className, style }: Props) {
  const d = heartPath(16, 17, 28);
  return (
    <svg viewBox="0 0 32 32" className={className} style={style} aria-hidden>
      <path d={d} fill={WHITE} stroke={WHITE} strokeWidth={5} strokeLinejoin="round" />
      <path d={d} fill={PINK} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <ellipse cx="9.5" cy="10.5" rx="3" ry="1.8" fill={WHITE} transform="rotate(-35 9.5 10.5)" />
    </svg>
  );
}

/** 리본 */
export function Bow({ className, style }: Props) {
  return (
    <svg viewBox="0 0 64 44" className={className} style={style} aria-hidden>
      <g fill={WHITE} stroke={WHITE} strokeWidth={6} strokeLinejoin="round">
        <path d="M32 18C24 6 8 2 5 10s6 18 27 10ZM32 18c8-12 24-16 27-8s-6 18-27 10Z" />
        <path d="M29 22 20 40l7-2 3 5 2-21ZM35 22l9 18-7-2-3 5-2-21Z" />
      </g>
      <path d="M29 22 20 40l7-2 3 5 2-21ZM35 22l9 18-7-2-3 5-2-21Z" fill="#ffb3df" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <path d="M32 18C24 6 8 2 5 10s6 18 27 10ZM32 18c8-12 24-16 27-8s-6 18-27 10Z" fill="#ffb3df" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <circle cx="16" cy="12" r="1.6" fill={WHITE} />
      <circle cx="48" cy="12" r="1.6" fill={WHITE} />
      <circle cx="12" cy="17" r="1.2" fill={WHITE} />
      <circle cx="52" cy="17" r="1.2" fill={WHITE} />
      <rect x="27" y="13" width="10" height="11" rx="4" fill={PINK} stroke={INK} strokeWidth={2} />
    </svg>
  );
}
