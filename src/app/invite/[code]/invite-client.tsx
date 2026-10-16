"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { HydrationGate } from "@/components/HydrationGate";
import { LoginButtons } from "@/components/LoginButtons";
import { Headline } from "@/components/PageHeader";
import { Spinner } from "@/components/Spinner";
import { useAccount } from "@/lib/account";

export function InviteClient() {
  const { code } = useParams<{ code: string }>();
  return (
    <HydrationGate>
      <Invite code={code} />
    </HydrationGate>
  );
}

function Invite({ code }: { code: string }) {
  const { loading, enabled, user } = useAccount();
  return (
    <div className="space-y-7 pt-10">
      <Headline className="text-[32px]" first="Utango에" second="초대받았어요" />
      <p className="text-[15px] leading-relaxed text-ink-2">
        좋아하는 노래 가사를 붙여넣으면 AI가 단어장과 예문을 만들어 주는 일본어 공부 앱이에요. 아래 방법으로 가입하면 바로
        쓸 수 있어요.
      </p>
      {loading ? (
        <p className="flex items-center gap-2 text-ink-3">
          <Spinner /> 확인하는 중…
        </p>
      ) : user ? (
        <div className="card px-5 py-5">
          <p className="text-[15px]">이미 가입돼 있어요.</p>
          <Link href="/" className="btn-primary press mt-4 flex justify-center py-3.5 text-[15px] font-semibold">
            시작하기
          </Link>
        </div>
      ) : enabled ? (
        <LoginButtons invite={code} next="/" />
      ) : (
        <p className="card px-5 py-5 text-[15px] text-ink-2">아직 가입을 받을 준비가 안 됐어요.</p>
      )}
    </div>
  );
}
