"use client";

import { useEffect } from "react";
import { Icon } from "./Icon";

/** 화면 아래에서 올라오는 시트. 데스크톱에서는 가운데 카드처럼 보인다. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal>
      <button aria-label="닫기" className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className="pb-safe relative max-h-[86dvh] w-full max-w-xl overflow-y-auto rounded-t-[28px] border-2 border-b-0 border-edge bg-surface sm:rounded-[28px] sm:border-b-2">
        <div className="sticky top-0 z-10 bg-surface px-5 pt-2.5 pb-2">
          <div className="mx-auto mb-2 h-1.5 w-11 rounded-full bg-ink-3/40" />
          <div className="flex items-center justify-between">
            <span className="truncate font-mono text-[11px] font-bold tracking-wider text-pink-text">
              ♪ {title}
            </span>
            <button
              onClick={onClose}
              className="-mr-1.5 grid size-9 place-items-center rounded-full border-2 border-edge"
              aria-label="닫기"
            >
              <Icon name="close" className="size-4" />
            </button>
          </div>
        </div>
        <div className="px-5 pt-2 pb-7">{children}</div>
      </div>
    </div>
  );
}
