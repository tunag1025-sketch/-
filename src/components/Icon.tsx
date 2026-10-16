const PATHS = {
  music: "M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  cards: "M3 7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm4-4h12a2 2 0 0 1 2 2v12",
  book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14Zm0 0A2.5 2.5 0 0 0 6.5 22H20v-5",
  plus: "M12 5v14M5 12h14",
  back: "M15 18l-6-6 6-6",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  arrowUpRight: "M7 17 17 7M8 7h9v9",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z",
  trash: "M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3",
  check: "M5 13l4 4L19 7",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35",
  close: "M6 6l12 12M18 6L6 18",
  refresh: "M4 4v6h6M20 20v-6h-6M5.6 15A8 8 0 0 0 19 17M18.4 9A8 8 0 0 0 5 7",
  info: "M12 16v-4m0-4h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z",
  flame: "M12 22c3.9 0 7-2.9 7-6.8 0-3.7-2.6-5.9-4.3-8.6-.6 1.8-1.6 3-3.2 3.4.2-2.6-.8-5.4-2.9-7-1 3.7-5.6 6.4-5.6 12.1C3 19.1 6.1 22 10 22h2Z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/** 검정 알약 버튼 오른쪽 끝의 라임 원 화살표 */
export function ArrowDot({ className = "" }: { className?: string }) {
  return (
    <span className={`grid size-10 shrink-0 place-items-center rounded-full bg-lime text-on-lime ${className}`}>
      <Icon name="arrow" className="size-[18px]" />
    </span>
  );
}
