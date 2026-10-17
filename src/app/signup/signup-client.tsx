"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { Icon } from "@/components/Icon";
import { LoginButtons } from "@/components/LoginButtons";
import { Headline, TopBar } from "@/components/PageHeader";
import { Spinner } from "@/components/Spinner";
import { loadAccount, useAccount } from "@/lib/account";
import { formatInviteCode, INVITE_CODE_LENGTH, normalizeInviteCode } from "@/lib/invite-code";

type Pending = { provider: "google" | "kakao"; name: string; email: string | null; image: string | null };

// 예전 초대 링크로 왔는데 그 코드로는 가입할 수 없을 때
const LINK_ERRORS: Record<string, string> = {
  invite_required: "초대 링크의 코드를 찾지 못했어요. 받은 초대 코드를 직접 넣어 주세요.",
  invite_used: "이미 다른 사람이 쓴 초대 링크예요. 새 초대 코드를 받아 주세요.",
};

const PROVIDER: Record<Pending["provider"], string> = { google: "Google", kakao: "카카오" };

export function SignupClient() {
  const params = useSearchParams();
  const next = params.get("next");
  return (
    <HydrationGate>
      <Signup
        next={next?.startsWith("/") && !next.startsWith("//") ? next : "/"}
        linkError={LINK_ERRORS[params.get("error") ?? ""] ?? null}
      />
    </HydrationGate>
  );
}

/** 처음 로그인한 사람이 받은 초대 코드를 넣어 가입을 마친다. */
function Signup({ next, linkError }: { next: string; linkError: string | null }) {
  const router = useRouter();
  const { loading, user } = useAccount();
  // undefined: 아직 묻는 중, null: 맡겨 둔 로그인 정보가 없음(시간이 지났거나 바로 들어옴)
  const [pending, setPending] = useState<Pending | null | undefined>(undefined);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(linkError);
  const [busy, setBusy] = useState(false);
  const typed = normalizeInviteCode(code);
  const ready = typed.length === INVITE_CODE_LENGTH;

  useEffect(() => {
    fetch("/api/signup", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { pending: Pending | null }) => setPending(d.pending))
      .catch(() => setPending(null));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: typed }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { code?: string; message?: string } | null;
    if (res?.ok) {
      await loadAccount();
      router.replace(next);
      return;
    }
    setBusy(false);
    if (data?.code === "expired" || data?.code === "too_many") setPending(null);
    setError(data?.message ?? "가입하지 못했어요. 잠시 뒤에 다시 시도해 주세요.");
  }

  async function switchAccount() {
    await fetch("/api/signup", { method: "DELETE" }).catch(() => {});
    router.replace("/login");
  }

  return (
    <div className="space-y-7">
      <TopBar backHref="/login" title="가입" />
      <Headline className="text-[30px]" first="초대 코드로" second="가입을 마쳐요" />

      {loading || pending === undefined ? (
        <p className="flex items-center gap-2 text-ink-3">
          <Spinner /> 확인하는 중…
        </p>
      ) : user ? (
        <div className="card px-5 py-5">
          <p className="text-[15px]">
            <span className="font-semibold">{user.name || "회원"}</span>님으로 가입돼 있어요.
          </p>
          <Link href={next} className="btn-primary press mt-4 flex h-[52px] items-center justify-center text-[15px] font-bold">
            계속하기
          </Link>
        </div>
      ) : !pending ? (
        <>
          <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-[14px] leading-relaxed text-danger">
            {error ?? "가입 시간이 지났어요. 다시 로그인해 주세요."}
          </p>
          <LoginButtons next={next} />
        </>
      ) : (
        <>
          <p className="text-[15px] leading-[1.65] break-keep text-ink-2">
            Utango는 초대받은 사람만 쓸 수 있어요. 받은 초대 코드 {INVITE_CODE_LENGTH}자리를 넣으면 가입이 끝나요.
          </p>

          <div className="card flex items-center gap-3 p-4">
            <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-ink-3">
              {pending.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pending.image} alt="" className="size-full object-cover" />
              ) : (
                <Icon name="user" className="size-5" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold">{pending.name || "이름 없음"}</p>
              <p className="truncate text-[13px] text-ink-3">
                {PROVIDER[pending.provider]} 계정{pending.email ? ` · ${pending.email}` : ""}
              </p>
            </div>
            <button type="button" onClick={switchAccount} className="shrink-0 text-[13px] font-semibold text-ink-3">
              다른 계정
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <label htmlFor="invite-code" className="block text-[13px] font-semibold text-ink-2">
              초대 코드
            </label>
            <input
              id="invite-code"
              value={code}
              onChange={(e) => setCode(formatInviteCode(normalizeInviteCode(e.target.value).slice(0, INVITE_CODE_LENGTH)))}
              placeholder="ABCD-EFGH"
              autoComplete="off"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "invite-error" : undefined}
              className="num input h-16 rounded-[20px] py-0 text-center text-[26px] font-semibold tracking-[0.16em] placeholder:text-ink-3/50"
            />
            {error && (
              <p id="invite-error" role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-[14px] leading-relaxed text-danger">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={!ready || busy}
              className="btn-primary press flex h-[54px] w-full items-center justify-center gap-2 text-[16px] font-bold disabled:opacity-50"
            >
              {busy && <Spinner className="size-4" />}
              가입하기
            </button>
          </form>
          <p className="text-center text-[13px] leading-relaxed text-ink-3">
            코드가 없다면 Utango를 쓰는 친구에게 받아 주세요.
          </p>
        </>
      )}
    </div>
  );
}
