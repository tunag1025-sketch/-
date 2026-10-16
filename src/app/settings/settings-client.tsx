"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/Badge";
import { HydrationGate } from "@/components/HydrationGate";
import { Icon } from "@/components/Icon";
import { LoginButtons } from "@/components/LoginButtons";
import { TopBar } from "@/components/PageHeader";
import { makeBackup, parseBackup } from "@/lib/data";
import { dayKey } from "@/lib/stats";
import { useAccount } from "@/lib/account";
import { pickData, useStore } from "@/lib/store";
import { clearLocalData, flush, type SyncStatus, syncNow, useSyncStatus } from "@/lib/sync";

type Invite = { code: string; createdAt: string; usedBy: string | null; usedAt: string | null };

export function SettingsClient() {
  return (
    <HydrationGate>
      <Settings />
    </HydrationGate>
  );
}

function Settings() {
  const { enabled, user } = useAccount();
  return (
    <div className="space-y-8">
      <TopBar backHref="/" title="설정" />
      {enabled && <AccountSection />}
      {user?.role === "admin" && <Invites />}
      <Backup />
    </div>
  );
}

function timeAgo(ts: number, now: number) {
  const m = Math.floor((now - ts) / 60_000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  return `${Math.floor(m / 60)}시간 전`;
}

const SYNC_TEXT: Record<SyncStatus, string> = {
  off: "동기화 꺼짐",
  syncing: "맞추는 중…",
  synced: "동기화됨",
  offline: "인터넷에 연결되면 맞춰요",
  error: "동기화하지 못했어요",
};

/** 로그인 / 로그인한 계정과 동기화 상태, 로그아웃 */
function AccountSection() {
  const user = useAccount((s) => s.user);
  const { status, lastSynced } = useSyncStatus();
  const [now, setNow] = useState(Date.now);
  const [leaving, setLeaving] = useState<"idle" | "busy" | "pending">("idle");

  async function logout(force = false) {
    setLeaving("busy");
    if (!force && !(await flush())) {
      setLeaving("pending");
      return;
    }
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    clearLocalData();
    // 메모리에 남은 학습 데이터까지 비우려고 새로 연다 (데모곡만 다시 들어간다).
    window.location.replace(window.location.origin);
  }

  return (
    <section>
      <h2 className="text-[19px] font-semibold">계정</h2>
      {user ? (
        <div className="card mt-3 px-4 py-4">
          <div className="flex items-center gap-3">
            {user.image ? (
              // 프로필 사진은 Google·카카오 주소라 그대로 쓴다.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt="" className="size-12 rounded-full bg-muted object-cover" />
            ) : (
              <span className="grid size-12 place-items-center rounded-full bg-blue-soft text-blue">
                <Icon name="user" className="size-6" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-semibold">
                {user.name || "회원"} {user.role === "admin" && <Badge tone="blue">관리자</Badge>}
              </p>
              <p className={`text-[13px] ${status === "error" ? "text-danger" : "text-ink-3"}`}>
                {SYNC_TEXT[status]}
                {status === "synced" && lastSynced ? ` · ${timeAgo(lastSynced, now)}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setNow(Date.now());
                void syncNow().then(() => setNow(Date.now()));
              }}
              aria-label="지금 동기화"
              className="press grid size-10 place-items-center rounded-full bg-muted text-ink-2"
            >
              <Icon name="refresh" className={`size-[18px] ${status === "syncing" ? "animate-spin" : ""}`} />
            </button>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-3">
            학습 기록이 계정에 저장돼서 다른 기기에서 로그인해도 이어서 할 수 있어요.
          </p>
          {leaving === "pending" ? (
            <div className="mt-4 rounded-2xl bg-danger/10 px-4 py-3 text-[14px] text-danger">
              <p>아직 계정에 올리지 못한 기록이 있어요. 인터넷에 연결한 뒤 다시 로그아웃해 주세요.</p>
              <button type="button" onClick={() => logout(true)} className="mt-2 font-semibold underline">
                그래도 로그아웃 (못 올린 기록은 사라져요)
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={leaving === "busy"}
              onClick={() => logout()}
              className="btn-ghost press mt-4 w-full py-3 text-[15px] font-semibold text-ink-2 disabled:opacity-60"
            >
              {leaving === "busy" ? "기록을 올리는 중…" : "로그아웃"}
            </button>
          )}
        </div>
      ) : (
        <div className="card mt-3 px-4 py-4">
          <p className="mb-4 text-[14px] leading-relaxed text-ink-2">
            로그인하면 AI 단어장을 만들 수 있고, 여러 기기에서 같은 기록을 써요. 지금 기록도 계정으로 옮겨져요.
          </p>
          <LoginButtons next="/settings" />
        </div>
      )}
    </section>
  );
}

/** 관리자: 친구를 부를 초대 링크 (링크 하나에 한 사람) */
function Invites() {
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    fetch("/api/invites")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { invites: Invite[] }) => setInvites(d.invites))
      .catch(() => setError("초대 목록을 불러오지 못했어요."));

  useEffect(() => {
    void load();
  }, []);

  const linkOf = (code: string) => `${window.location.origin}/invite/${code}`;

  async function create() {
    setError(null);
    const res = await fetch("/api/invites", { method: "POST" }).catch(() => null);
    if (!res?.ok) return setError("초대 링크를 만들지 못했어요.");
    const { code } = (await res.json()) as { code: string };
    setFresh(code);
    setCopied(false);
    void load();
  }

  async function share(code: string) {
    const url = linkOf(code);
    if (navigator.share) {
      try {
        await navigator.share({ title: "Utango 초대", text: "노래로 일본어 공부하는 앱이에요. 이 링크로 가입해 줘!", url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    await navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
  }

  async function remove(code: string) {
    await fetch(`/api/invites?code=${encodeURIComponent(code)}`, { method: "DELETE" }).catch(() => {});
    if (fresh === code) setFresh(null);
    void load();
  }

  return (
    <section>
      <h2 className="text-[19px] font-semibold">친구 초대</h2>
      <p className="mt-1 text-[14px] leading-relaxed text-ink-3">
        초대 링크를 받은 사람만 가입할 수 있어요. 링크 하나로 한 사람이 가입해요.
      </p>
      <button
        type="button"
        onClick={create}
        className="btn-primary press mt-3 flex w-full items-center justify-center gap-1.5 py-3.5 text-[15px] font-semibold"
      >
        <Icon name="plus" className="size-4" /> 초대 링크 만들기
      </button>
      {fresh && (
        <div className="iris mt-3 rounded-2xl px-4 py-3">
          <p className="truncate text-[14px] font-medium">{linkOf(fresh)}</p>
          <button type="button" onClick={() => share(fresh)} className="mt-1.5 text-[14px] font-semibold text-blue">
            {copied ? "복사했어요" : "보내기 · 복사"}
          </button>
        </div>
      )}
      {error && <p className="mt-3 text-[14px] text-danger">{error}</p>}
      {invites && invites.length > 0 && (
        <ul className="card mt-3 divide-y divide-line overflow-hidden">
          {invites.map((inv) => (
            <li key={inv.code} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium">
                  {inv.usedBy ? `${inv.usedBy} 님이 가입했어요` : "아직 안 쓴 링크"}
                </p>
                <p className="num text-[12px] text-ink-3">{new Date(inv.createdAt).toLocaleDateString("ko-KR")} 만듦</p>
              </div>
              {!inv.usedBy && (
                <>
                  <button type="button" onClick={() => share(inv.code)} className="text-[13px] font-semibold text-blue">
                    보내기
                  </button>
                  <button type="button" onClick={() => remove(inv.code)} className="text-[13px] font-semibold text-ink-3">
                    지우기
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
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
        파일로 내보내 두면 브라우저 데이터를 지우거나 기기를 바꿔도 다시 불러올 수 있어요. 로그인하지 않으면 기록은 이 기기에만
        있어요.
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
