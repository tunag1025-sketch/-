"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/Badge";
import { HydrationGate } from "@/components/HydrationGate";
import { Icon } from "@/components/Icon";
import { LoginButtons } from "@/components/LoginButtons";
import { TopBar } from "@/components/PageHeader";
import { Spinner } from "@/components/Spinner";
import { isWordKey } from "@/lib/cards";
import { makeBackup, parseBackup } from "@/lib/data";
import { formatInviteCode } from "@/lib/invite-code";
import { dayKey } from "@/lib/stats";
import { useAccount } from "@/lib/account";
import { pickData, useStore } from "@/lib/store";
import { clearLocalData, flush, type SyncStatus, syncNow, useSyncStatus } from "@/lib/sync";
import { disablePush, enablePush, pushStatus, type PushStatus, pushSupport, sendTestPush } from "@/lib/push-client";
import { checkSpeech, type SpeechCheck } from "@/lib/speech";

type Invite = {
  code: string;
  createdAt: string;
  usedBy: string | null;
  usedAt: string | null;
};

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
      {enabled && user && <Reminders />}
      {user?.role === "admin" && <Invites />}
      <Backup />
      <SpeechCheckSection />
      <Link href="/onboarding" className="mx-auto flex w-fit items-center gap-1 text-[14px] font-medium text-ink-3">
        Utango 소개 다시 보기 <Icon name="chevron" className="size-4" />
      </Link>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 ml-1 text-[13px] font-semibold text-ink-3">{children}</h2>;
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
      <SectionLabel>계정</SectionLabel>
      {user ? (
        <div className="card divide-y divide-line overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-4">
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
          <p className="px-4 py-3 text-[13px] leading-relaxed text-ink-3">
            학습 기록이 계정에 저장돼서 다른 기기에서 로그인해도 이어서 할 수 있어요.
          </p>
          <div className="p-4">
            {leaving === "pending" ? (
              <div className="rounded-2xl bg-danger-soft px-4 py-3 text-[14px] text-danger">
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
                className="press h-[52px] w-full rounded-full border border-line bg-surface text-[15px] font-semibold text-ink-2 disabled:opacity-60"
              >
                {leaving === "busy" ? "기록을 올리는 중…" : "로그아웃"}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="card p-4">
          <p className="mb-4 text-[14px] leading-relaxed text-ink-2">
            로그인하면 AI 단어장을 만들 수 있고, 여러 기기에서 같은 기록을 써요. 지금 기록도 계정으로 옮겨져요.
          </p>
          <LoginButtons next="/settings" />
        </div>
      )}
    </section>
  );
}

/** 매일 학습 알림: 저녁 8시에 아직 공부하지 않았으면 알려 준다 (이 기기에서 켜고 끈다). */
function Reminders() {
  const [support] = useState(pushSupport);
  const [status, setStatus] = useState<PushStatus | "loading">("loading");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (support !== "ok") return;
    let alive = true;
    pushStatus()
      .then((s) => alive && setStatus(s))
      .catch(() => alive && setStatus("off"));
    return () => {
      alive = false;
    };
  }, [support]);

  async function toggle() {
    if (busy || support !== "ok" || status === "loading") return;
    setBusy(true);
    setNote(null);
    try {
      if (status === "on") {
        await disablePush();
        setStatus("off");
      } else {
        const next = await enablePush();
        setStatus(next);
        if (next === "on") setNote({ ok: true, text: "알림을 켰어요. 시험 알림으로 확인해 보세요." });
      }
    } catch (err) {
      setNote({ ok: false, text: err instanceof Error ? err.message : "알림을 바꾸지 못했어요." });
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setNote(null);
    const sent = await sendTestPush().catch(() => 0);
    setNote(sent ? { ok: true, text: "시험 알림을 보냈어요." } : { ok: false, text: "알림을 보내지 못했어요. 알림을 껐다 다시 켜 보세요." });
  }

  const on = status === "on";
  const sub =
    support === "install"
      ? "iPhone은 홈 화면에 추가한 Utango 앱에서 켤 수 있어요 (iOS 16.4 이상)."
      : support === "unsupported"
        ? "이 브라우저는 알림을 지원하지 않아요."
        : status === "denied"
          ? "알림이 막혀 있어요. 기기 설정에서 Utango 알림을 허용해 주세요."
          : "저녁 8시, 아직 공부하지 않은 날에만 알려 줘요.";
  const usable = support === "ok" && status !== "denied";

  return (
    <section>
      <SectionLabel>알림</SectionLabel>
      <div className="card divide-y divide-line overflow-hidden">
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-disabled={!usable}
          onClick={toggle}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left disabled:opacity-60"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">매일 학습 알림</span>
            <span className="block text-[13px] leading-relaxed text-ink-3">{sub}</span>
          </span>
          {usable &&
            (status === "loading" || busy ? (
              <Spinner className="size-5 text-ink-3" />
            ) : (
              <span
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-blue" : "bg-ink-3/45"}`}
                aria-hidden
              >
                <span
                  className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow-sm transition-transform ${
                    on ? "translate-x-5" : ""
                  }`}
                />
              </span>
            ))}
        </button>
        {on && (
          <button type="button" onClick={test} className="w-full px-4 py-3 text-left text-[14px] font-semibold text-blue">
            시험 알림 보내기
          </button>
        )}
      </div>
      {note && (
        <p role="status" className={`mx-1 mt-2 text-[13px] ${note.ok ? "text-ink-3" : "text-danger"}`}>
          {note.text}
        </p>
      )}
    </section>
  );
}

/** 관리자: 친구를 부를 초대 코드 (코드 하나에 한 사람). 받은 사람은 로그인한 뒤 가입 화면에서 넣는다. */
function Invites() {
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    fetch("/api/invites")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { invites: Invite[] }) => setInvites(d.invites))
      .catch(() => setError("초대 목록을 불러오지 못했어요."));

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    setError(null);
    const res = await fetch("/api/invites", { method: "POST" }).catch(() => null);
    if (!res?.ok) return setError("초대 코드를 만들지 못했어요.");
    const { code } = (await res.json()) as { code: string };
    setFresh(code);
    setCopied(null);
    void load();
  }

  async function copy(code: string) {
    await navigator.clipboard?.writeText(formatInviteCode(code)).catch(() => {});
    setCopied(code);
  }

  /** 앱 주소와 함께 메신저로 보낸다. 공유 시트가 없으면 안내문째 복사한다. */
  async function share(code: string) {
    const text =
      `Utango 초대 코드: ${formatInviteCode(code)}\n` +
      `노래로 일본어 공부하는 앱이에요. 아래 주소에서 로그인한 뒤 이 코드를 넣으면 가입돼요.`;
    const url = window.location.origin;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Utango 초대", text, url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    await navigator.clipboard?.writeText(`${text}\n${url}`).catch(() => {});
    setCopied(code);
  }

  async function remove(code: string) {
    await fetch(`/api/invites?code=${encodeURIComponent(code)}`, {
      method: "DELETE",
    }).catch(() => {});
    if (fresh === code) setFresh(null);
    void load();
  }

  return (
    <section>
      <SectionLabel>친구 초대</SectionLabel>
      <div className="card divide-y divide-line overflow-hidden">
        <div className="p-4">
          <p className="text-[13px] leading-relaxed text-ink-3">
            초대 코드를 받은 사람만 가입할 수 있어요. 받은 사람이 로그인한 뒤 코드를 넣으면 가입되고, 코드 하나로 한
            사람이 가입해요.
          </p>
          <button
            type="button"
            onClick={create}
            className="btn-primary press mt-3 flex h-[52px] w-full items-center justify-center gap-1.5 text-[15px] font-bold"
          >
            <Icon name="plus" className="size-4" /> 초대 코드 만들기
          </button>
          {fresh && (
            <div className="iris mt-3 rounded-2xl px-4 py-4 text-center">
              <p className="text-[12px] font-semibold text-ink-3">새 초대 코드</p>
              <p className="num mt-1 text-[30px] leading-tight font-semibold tracking-[0.12em] select-all">
                {formatInviteCode(fresh)}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => copy(fresh)}
                  className="press flex h-11 items-center justify-center gap-1.5 rounded-full bg-surface text-[14px] font-semibold"
                >
                  <Icon name={copied === fresh ? "check" : "copy"} className="size-4" />
                  {copied === fresh ? "복사했어요" : "코드 복사"}
                </button>
                <button
                  type="button"
                  onClick={() => share(fresh)}
                  className="btn-primary press flex h-11 items-center justify-center text-[14px] font-semibold"
                >
                  보내기
                </button>
              </div>
            </div>
          )}
          {error && <p className="mt-3 text-[14px] text-danger">{error}</p>}
        </div>
        {invites && invites.length > 0 && (
          <ul className="divide-y divide-line">
            {invites.map((inv) => (
              <li key={inv.code} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className={`num truncate text-[15px] font-semibold tracking-[0.06em] ${inv.usedBy ? "text-ink-3" : ""}`}>
                    {formatInviteCode(inv.code)}
                  </p>
                  <p className="truncate text-[12px] text-ink-3">
                    {inv.usedBy ? `${inv.usedBy} 님이 가입했어요` : "아직 안 썼어요"} ·{" "}
                    <span className="num">{new Date(inv.createdAt).toLocaleDateString("ko-KR")}</span> 만듦
                  </p>
                </div>
                {!inv.usedBy && (
                  <>
                    <button
                      type="button"
                      onClick={() => copy(inv.code)}
                      className="text-[13px] font-semibold text-blue"
                    >
                      {copied === inv.code ? "복사했어요" : "복사"}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(inv.code)}
                      className="text-[13px] font-semibold text-ink-3"
                    >
                      지우기
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

const SPEECH_RESULT: Record<SpeechCheck["result"], string> = {
  started: "소리를 냈어요. 들리지 않았다면 볼륨과 무음 모드를 확인해 주세요.",
  error: "기기가 읽기를 거절했어요.",
  silent: "기기가 읽기를 시작하지 않았어요.",
  unsupported: "이 브라우저는 발음 듣기를 지원하지 않아요.",
};

/** 발음이 안 들릴 때: 한 문장을 읽어 보고 기기 상태를 보여 준다. */
function SpeechCheckSection() {
  const [busy, setBusy] = useState(false);
  const [check, setCheck] = useState<SpeechCheck | null>(null);

  return (
    <section>
      <SectionLabel>발음 점검</SectionLabel>
      <div className="card p-4">
        <p className="text-[13px] leading-relaxed text-ink-3">발음이 들리지 않으면 눌러 보세요. 짧은 일본어 문장을 읽어요.</p>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            // 누른 순간에 읽어야 iPhone에서 소리가 난다.
            void checkSpeech().then((r) => {
              setCheck(r);
              setBusy(false);
            });
          }}
          className="btn-ghost press mt-3 flex h-[52px] w-full items-center justify-center gap-1.5 text-[15px] font-semibold disabled:opacity-60"
        >
          {busy ? <Spinner className="size-4" /> : <Icon name="volume" className="size-[18px]" />} 발음 들어 보기
        </button>
        {check && (
          <div className="mt-3 space-y-2 rounded-2xl bg-muted px-4 py-3 text-[13px] leading-relaxed text-ink-2" role="status">
            <p className="font-semibold text-ink">
              {SPEECH_RESULT[check.result]}
              {check.error && <span className="font-normal text-ink-3"> ({check.error})</span>}
            </p>
            {check.result !== "unsupported" && (
              <p className="text-ink-3">
                음성 {check.voices}개 · 일본어 {check.japanese.length}개 · 쓰는 음성: {check.using}
              </p>
            )}
            {check.result !== "started" && check.result !== "unsupported" && (
              <ul className="list-disc space-y-0.5 pl-4">
                <li>무음 모드를 끄고 볼륨을 올려 보세요.</li>
                <li>iPhone: 설정 › 손쉬운 사용 › 읽기 및 말하기 › 음성 › 일본어에서 음성을 받아 두세요.</li>
                <li>앱을 완전히 닫았다가 다시 열어 보세요.</li>
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/** 학습 기록을 파일로 내보내고, 그 파일을 다시 불러와 합친다. */
function Backup() {
  const songCount = useStore((s) => s.order.length);
  const cardCount = useStore((s) => Object.keys(s.cards).filter(isWordKey).length);
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
      setMessage({
        ok: false,
        text: "Utango 백업 파일이 아니에요. 내보내기로 만든 파일을 골라 주세요.",
      });
      return;
    }
    useStore.getState().importData(data);
    const songs = Object.keys(data.songs ?? {}).length;
    const cards = Object.keys(data.cards ?? {}).length;
    setMessage({
      ok: true,
      text: `노래 ${songs}곡, 단어 기록 ${cards}개를 불러와 지금 기록과 합쳤어요.`,
    });
  }

  return (
    <section>
      <SectionLabel>백업</SectionLabel>
      <div className="card divide-y divide-line overflow-hidden">
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
      <p className="mx-1 mt-2 text-[13px] leading-relaxed text-ink-3">
        파일로 내보내 두면 브라우저 데이터를 지우거나 기기를 바꿔도 다시 불러올 수 있어요. 로그인하지 않으면 기록은 이
        기기에만 있어요.
      </p>
      <input ref={input} type="file" accept="application/json,.json" onChange={importFile} className="hidden" />
      {message && (
        <p role="status" className={`mt-3 text-[14px] ${message.ok ? "text-ink-2" : "text-danger"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}
