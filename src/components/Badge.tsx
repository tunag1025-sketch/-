const TONE = {
  muted: "bg-muted text-ink-2",
  blue: "bg-blue-soft text-blue",
  solid: "bg-blue text-white",
} as const;

/** 작은 알약 라벨 */
export function Badge({
  children,
  tone = "muted",
  className = "",
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONE;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] leading-none font-semibold ${TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
