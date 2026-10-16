"use client";

import { useEffect } from "react";
import { Icon, type IconName } from "./Icon";

/** 화면 아래에서 올라오는 시트. 데스크톱에서는 가운데 카드처럼 보인다. */
export function Sheet({
  open,
  onClose,
  title,
  icon,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** 제목 앞 작은 아이콘 (단어 카드의 ♪ 등) */
  icon?: IconName;
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
      <button aria-label="닫기" className="absolute inset-0 bg-[rgb(20_24_40/0.45)] backdrop-blur-[3px]" onClick={onClose} />
      <div className="pb-safe relative max-h-[88dvh] w-full max-w-xl overflow-y-auto rounded-t-[30px] bg-surface sm:rounded-[30px]">
        <div className="sticky top-0 z-10 bg-surface px-5 pt-3 pb-2">
          <div className="mx-auto mb-3 h-[5px] w-10 rounded-full bg-line" />
          <div className="flex items-center justify-between gap-3">
            <span className="font-jp flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-ink-3">
              {icon && <Icon name={icon} className="size-3.5 shrink-0" />}
              <span className="truncate">{title}</span>
            </span>
            <button
              onClick={onClose}
              className="press grid size-9 shrink-0 place-items-center rounded-full bg-muted text-ink-2"
              aria-label="닫기"
            >
              <Icon name="close" className="size-4" />
            </button>
          </div>
        </div>
        <div className="px-5 pt-1 pb-8">{children}</div>
      </div>
    </div>
  );
}
