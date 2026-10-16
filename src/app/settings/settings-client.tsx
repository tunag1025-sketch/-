"use client";

import { useRef, useState } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { Icon } from "@/components/Icon";
import { TopBar } from "@/components/PageHeader";
import { makeBackup, parseBackup } from "@/lib/data";
import { dayKey } from "@/lib/stats";
import { pickData, useStore } from "@/lib/store";

export function SettingsClient() {
  return (
    <HydrationGate>
      <Settings />
    </HydrationGate>
  );
}

function Settings() {
  return (
    <div className="space-y-7">
      <TopBar backHref="/" title="설정" />
      <Backup />
    </div>
  );
}

/** 학습 기록을 파일로 내보내고, 그 파일을 다시 불러와 합친다. */
function Backup() {
  const songCount = useStore((s) => s.order.length);
  const cardCount = useStore((s) => Object.keys(s.cards).length);
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function exportFile() {
    const now = Date.now();
    const text = makeBackup(pickData(useStore.getState()), now);
    const name = `utango-backup-${dayKey(now)}.json`;
    const file = new File([text], name, { type: "application/json" });
    // 폰에서는 공유 시트로 파일 앱·메신저에 바로 저장할 수 있게 한다.
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Utango 백업" });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const data = parseBackup(await file.text());
    if (!data) {
      setMessage({ ok: false, text: "Utango 백업 파일이 아니에요. 내보내기로 만든 파일을 골라 주세요." });
      return;
    }
    useStore.getState().importData(data);
    const songs = Object.keys(data.songs ?? {}).length;
    const cards = Object.keys(data.cards ?? {}).length;
    setMessage({ ok: true, text: `노래 ${songs}곡, 단어 기록 ${cards}개를 불러와 지금 기록과 합쳤어요.` });
  }

  return (
    <section>
      <h2 className="text-[19px] font-semibold">백업</h2>
      <p className="mt-1 text-[14px] leading-relaxed text-ink-3">
        학습 기록은 이 기기에만 저장돼요. 파일로 내보내 두면 브라우저 데이터를 지우거나 기기를 바꿔도 다시 불러올 수 있어요.
      </p>
      <div className="card mt-3 divide-y divide-line overflow-hidden">
        <button type="button" onClick={exportFile} className="press flex w-full items-center gap-3 px-4 py-4 text-left">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-soft text-blue">
            <Icon name="download" className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-semibold">파일로 내보내기</span>
            <span className="block text-[13px] text-ink-3">
              노래 {songCount}곡 · 단어 기록 {cardCount}개
            </span>
          </span>
          <Icon name="chevron" className="size-5 shrink-0 text-ink-3" />
        </button>
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="press flex w-full items-center gap-3 px-4 py-4 text-left"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-soft text-blue">
            <Icon name="upload" className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-semibold">백업 파일 불러오기</span>
            <span className="block text-[13px] text-ink-3">지금 기록은 지우지 않고 합쳐요</span>
          </span>
          <Icon name="chevron" className="size-5 shrink-0 text-ink-3" />
        </button>
      </div>
      <input ref={input} type="file" accept="application/json,.json" onChange={importFile} className="hidden" />
      {message && (
        <p role="status" className={`mt-3 text-[14px] ${message.ok ? "text-ink-2" : "text-danger"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}
