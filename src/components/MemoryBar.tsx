/** 진척도 막대: 장기기억(진한 색) 뒤에 단기기억(연한 색) */
export function MemoryBar({
  total,
  long,
  short,
  className = "h-1.5",
}: {
  total: number;
  long: number;
  short: number;
  className?: string;
}) {
  const pct = (n: number) => `${total ? (n / total) * 100 : 0}%`;
  return (
    <div
      className={`flex overflow-hidden rounded-full bg-muted ${className}`}
      role="img"
      aria-label={`장기기억 ${long}개, 단기기억 ${short}개, 전체 ${total}개`}
    >
      <div className="h-full bg-[image:var(--grad-text)]" style={{ width: pct(long) }} />
      <div className="h-full bg-[color:var(--short-term)]" style={{ width: pct(short) }} />
    </div>
  );
}

/** 막대 색 설명 */
export function MemoryLegend({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 text-[12px] font-medium text-ink-3 ${className}`}>
      <span className="flex items-center gap-1">
        <span className="size-2 rounded-full bg-[image:var(--grad-text)]" /> 장기기억
      </span>
      <span className="flex items-center gap-1">
        <span className="size-2 rounded-full bg-[color:var(--short-term)]" /> 단기기억
      </span>
    </span>
  );
}
