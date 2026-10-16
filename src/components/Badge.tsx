const TONE = {
  outline: "border-edge text-ink",
  pink: "border-black bg-pink text-black",
  black: "border-black bg-black text-white",
  sky: "border-black bg-sky text-black",
  lemon: "border-black bg-lemon text-black",
} as const;

export function Badge({
  children,
  tone = "outline",
  pixel = false,
  className = "",
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONE;
  pixel?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border-[1.5px] px-2 py-px text-[11px] leading-[1.4] font-bold ${
        pixel ? "font-pixel text-[12px] font-normal" : ""
      } ${TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
