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
      <button aria-label="닫기" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="pb-safe relative max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-surface shadow-xl sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-surface px-5 pt-4 pb-2">
          <span className="text-sm font-medium text-ink-3">{title}</span>
          <button onClick={onClose} className="-mr-2 rounded-full p-2 text-ink-3 hover:bg-surface-2" aria-label="닫기">
            <Icon name="close" />
          </button>
        </div>
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}
