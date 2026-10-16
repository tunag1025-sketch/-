"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";

const TABS: { href: string; label: string; icon: IconName; match: (p: string) => boolean }[] = [
  { href: "/", label: "노래", icon: "music", match: (p) => p === "/" || p.startsWith("/songs") },
  { href: "/review", label: "복습", icon: "cards", match: (p) => p.startsWith("/review") },
  { href: "/vocab", label: "단어장", icon: "book", match: (p) => p.startsWith("/vocab") },
];

/** 화면 아래 떠 있는 알약 탭바 */
export function BottomNav() {
  const pathname = usePathname();
  // 복습 중에는 화면 아래를 답 버튼에 내준다.
  if (pathname.startsWith("/review")) return null;
  return (
    <nav className="pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4">
      <ul className="pointer-events-auto mx-auto mb-3 flex max-w-sm gap-1 rounded-full bg-solid p-1.5 shadow-[0_10px_30px_rgb(23_22_27/0.22)]">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center justify-center gap-1.5 rounded-full py-3 text-[13px] font-semibold transition-colors ${
                  active ? "bg-lime text-on-lime" : "text-on-solid/60"
                }`}
              >
                <Icon name={tab.icon} className="size-[18px]" />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
