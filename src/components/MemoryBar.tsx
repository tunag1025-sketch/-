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

/** 막대 색 설명. 개수를 주면 이름 옆에 함께 보여 주고, none을 주면 '학습 전'도 넣는다. */
export function MemoryLegend({
  counts,
  className = "",
}: {
  counts?: { long: number; short: number; none?: number };
  className?: string;
}) {
  const n = (v: number | undefined) => v !== undefined && <b className="num text-[12px] font-semibold text-ink">{v}</b>;
  return (
    <span className={`flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[12px] font-medium text-ink-3 ${className}`}>
      <span className="flex items-center gap-[5px]">
        <span className="size-2 rounded-full bg-[image:var(--grad-text)]" /> 장기기억 {n(counts?.long)}
      </span>
      <span className="flex items-center gap-[5px]">
        <span className="size-2 rounded-full bg-[color:var(--short-term)]" /> 단기기억 {n(counts?.short)}
      </span>
      {counts?.none !== undefined && (
        <span className="flex items-center gap-[5px]">
          <span className="size-2 rounded-full bg-muted ring-1 ring-line ring-inset" /> 학습 전 {n(counts.none)}
        </span>
      )}
    </span>
  );
}
