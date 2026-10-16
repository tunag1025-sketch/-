"use client";

import { loginHref, useAccount } from "@/lib/account";

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.2C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.4 5.7c4.3-4 6.9-9.9 6.9-17.2z" />
      <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.2C1 16.5 0 20.1 0 24s1 7.5 2.6 10.8l7.9-6.2z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.2C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}

function KakaoMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#191919"
        d="M12 3C6.5 3 2 6.5 2 10.8c0 2.8 1.9 5.2 4.7 6.6l-1 3.6c-.1.3.3.6.6.4l4.2-2.8c.5.1 1 .1 1.5.1 5.5 0 10-3.5 10-7.9S17.5 3 12 3z"
      />
    </svg>
  );
}

/** 설정된 로그인 방법의 버튼들 (Google · 카카오) */
export function LoginButtons({ next, invite }: { next?: string; invite?: string }) {
  const providers = useAccount((s) => s.providers);
  return (
    <div className="grid gap-2.5">
      {providers.includes("kakao") && (
        <a
          href={loginHref("kakao", { next, invite })}
          className="press flex items-center justify-center gap-2 rounded-full bg-[#FEE500] py-3.5 text-[15px] font-semibold text-[#191919]"
        >
          <KakaoMark /> 카카오로 계속하기
        </a>
      )}
      {providers.includes("google") && (
        <a
          href={loginHref("google", { next, invite })}
          className="press flex items-center justify-center gap-2 rounded-full border border-line bg-white py-3.5 text-[15px] font-semibold text-[#1f1f1f]"
        >
          <GoogleMark /> Google로 계속하기
        </a>
      )}
    </div>
  );
}
