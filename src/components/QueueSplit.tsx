/** 오늘 학습할 단어 수를 다시 볼 단어 / 새 단어로 나눠 보여 준다 (홈·학습 설정). */
export function QueueSplit({ due, fresh }: { due: number; fresh: number }) {
  return (
    <dl className="flex flex-col gap-1.5 pb-1 text-[13px]">
      {(
        [
          ["다시 볼 단어", due],
          ["새 단어", fresh],
        ] as const
      ).map(([label, n]) => (
        <div key={label} className="flex items-center justify-end gap-2">
          <dt className="text-ink-3">{label}</dt>
          <dd className="num min-w-4 text-right text-[14px] font-semibold text-ink">{n}</dd>
        </div>
      ))}
    </dl>
  );
}
