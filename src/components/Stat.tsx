/** 숫자 + 작은 이름표 (기록 카드 안의 한 칸) */
export function Stat({ value, label, className = "text-[28px]" }: { value: number; label: string; className?: string }) {
  return (
    <div className="text-center">
      <p className={`num leading-none font-medium ${className}`}>{value}</p>
      <p className="mt-1.5 text-[13px] font-medium text-ink-3">{label}</p>
    </div>
  );
}
