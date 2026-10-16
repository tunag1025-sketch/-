export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "accent" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        tone === "accent" ? "bg-accent-soft text-accent" : "bg-surface-2 text-ink-2"
      }`}
    >
      {children}
    </span>
  );
}
