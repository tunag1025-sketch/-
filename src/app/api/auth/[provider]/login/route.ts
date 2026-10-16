import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { enabledProviders, type Provider, safeNext } from "@/lib/server/auth";
import { appOrigin, startLogin } from "@/lib/server/oauth";

const TEN_MINUTES = 600;

/** 로그인 시작: 상태값을 쿠키에 두고 Google·카카오 로그인 화면으로 보낸다. */
export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const origin = appOrigin(request);
  if (!enabledProviders().includes(provider as Provider)) {
    return NextResponse.redirect(new URL("/login?error=unavailable", origin));
  }
  const search = new URL(request.url).searchParams;
  const { url, state, verifier } = startLogin(provider as Provider, origin);

  const jar = await cookies();
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api/auth",
    maxAge: TEN_MINUTES,
  };
  jar.set("oauth_state", state, opts);
  jar.set("oauth_verifier", verifier, opts);
  jar.set("oauth_next", safeNext(search.get("next")), opts);
  const invite = search.get("invite");
  if (invite) jar.set("oauth_invite", invite.slice(0, 64), opts);
  else jar.delete({ name: "oauth_invite", path: "/api/auth" });

  return NextResponse.redirect(url);
}
