"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";

const TABS: { href: string; label: string; icon: IconName; match: (p: string) => boolean }[] = [
  { href: "/", label: "노래", icon: "music", match: (p) => p === "/" || p.startsWith("/songs") },
  { href: "/review", label: "복습", icon: "cards", match: (p) => p.startsWith("/review") },
  { href: "/vocab", label: "단어장", icon: "book", match: (p) => p.startsWith("/vocab") },
];

export function BottomNav() {
  const pathname = usePathname();
  // 복습 중에는 화면 아래를 답 버튼에 내준다.
  if (pathname.startsWith("/review")) return null;
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur">
      <ul className="mx-auto flex max-w-xl">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                  active ? "text-accent" : "text-ink-3"
                }`}
              >
                <Icon name={tab.icon} className="size-6" />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
