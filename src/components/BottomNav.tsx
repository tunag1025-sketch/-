"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";

const TABS: { href: string; label: string; icon: IconName; match: (p: string) => boolean }[] = [
  { href: "/", label: "홈", icon: "home", match: (p) => p === "/" || (p.startsWith("/songs") && p !== "/songs/new") },
  { href: "/study", label: "학습", icon: "cards", match: (p) => p.startsWith("/study") || p.startsWith("/review") },
  { href: "/vocab", label: "단어장", icon: "book", match: (p) => p.startsWith("/vocab") },
];

/** 떠 있는 유리 동그라미 탭 + (홈에서만) 파란 노래 추가 버튼 */
export function BottomNav() {
  const pathname = usePathname();
  // 복습 화면과 노래 추가 화면은 아래쪽을 자기 버튼에 쓴다.
  if (pathname.startsWith("/review") || pathname === "/songs/new") return null;
  return (
    <nav className="pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-30 px-5" aria-label="메뉴">
      <div className="mx-auto mb-4 flex max-w-sm items-center justify-between">
        <ul className="glass pointer-events-auto flex gap-1.5 rounded-full p-1.5 shadow-[0_10px_30px_rgb(31_59_120/0.14)]">
          {TABS.map((tab) => {
            const active = tab.match(pathname);
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-label={tab.label}
                  aria-current={active ? "page" : undefined}
                  className={`press flex h-12 items-center justify-center gap-1.5 rounded-full text-[14px] font-semibold transition-all ${
                    active ? "bg-surface px-4 text-blue shadow-[0_2px_10px_rgb(31_59_120/0.12)]" : "w-12 text-ink-3"
                  }`}
                >
                  <Icon name={tab.icon} className="size-[21px]" />
                  {active && tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
        {/* 새 노래 추가는 홈에서만 */}
        {pathname === "/" && (
          <Link
            href="/songs/new"
            aria-label="노래 추가"
            className="btn-primary press pointer-events-auto grid size-[60px] place-items-center"
          >
            <Icon name="plus" className="size-7" />
          </Link>
        )}
      </div>
    </nav>
  );
}
