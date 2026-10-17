"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { HydrationGate } from "@/components/HydrationGate";
import { LoginButtons } from "@/components/LoginButtons";
import { Headline, TopBar } from "@/components/PageHeader";
import { Spinner } from "@/components/Spinner";
import { useAccount } from "@/lib/account";

const ERRORS: Record<string, string> = {
  invite_required: "초대받은 사람만 가입할 수 있어요. 로그인한 뒤 받은 초대 코드를 넣어 주세요.",
  invite_used: "이미 다른 사람이 쓴 초대 코드예요. 새 코드를 받아 주세요.",
  expired: "로그인 시간이 지났어요. 다시 시도해 주세요.",
  denied: "로그인을 취소했어요.",
  unavailable: "지금은 이 방법으로 로그인할 수 없어요.",
  failed: "로그인하지 못했어요. 잠시 뒤에 다시 시도해 주세요.",
};

export function LoginClient() {
  const params = useSearchParams();
  return (
    <HydrationGate>
      <Login error={params.get("error")} next={params.get("next") ?? undefined} />
    </HydrationGate>
  );
}

function Login({ error, next }: { error: string | null; next?: string }) {
  const { loading, enabled, user } = useAccount();
  return (
    <div className="space-y-7">
      <TopBar backHref="/" title="로그인" />
      <Headline className="text-[30px]" first="로그인하고" second="어디서든 이어서" />
      <p className="text-[15px] leading-[1.65] text-ink-2">
        로그인하면 AI 단어장을 만들 수 있고, 폰과 컴퓨터에서 같은 학습 기록을 써요. 지금 이 기기에 있는 기록도 계정으로
        옮겨져요.
      </p>
      {error && (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-[14px] leading-relaxed text-danger">
          {ERRORS[error] ?? ERRORS.failed}
        </p>
      )}
      {loading ? (
        <p className="flex items-center gap-2 text-ink-3">
          <Spinner /> 확인하는 중…
        </p>
      ) : user ? (
        <div className="card px-5 py-5">
          <p className="text-[15px]">
            <span className="font-semibold">{user.name || "회원"}</span>님으로 로그인돼 있어요.
          </p>
          <Link href={next ?? "/"} className="btn-primary press mt-4 flex h-[52px] items-center justify-center text-[15px] font-bold">
            계속하기
          </Link>
        </div>
      ) : enabled ? (
        <>
          <LoginButtons next={next} />
          <p className="text-center text-[13px] leading-relaxed text-ink-3">
            처음이라면 로그인한 뒤 받은 초대 코드를 넣으면 가입돼요.
          </p>
        </>
      ) : (
        <p className="card px-5 py-5 text-[15px] text-ink-2">아직 로그인이 준비되지 않았어요.</p>
      )}
    </div>
  );
}
