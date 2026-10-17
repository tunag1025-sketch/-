import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSession, enabledProviders, type Provider, safeNext, signIn, startSignup } from "@/lib/server/auth";
import { appOrigin, finishLogin } from "@/lib/server/oauth";

/**
 * Google·카카오에서 돌아온 뒤: 사용자를 찾거나(초대가 있으면) 만들고 로그인시킨다.
 * 처음 온 사람은 로그인 정보를 맡겨 두고 초대 코드를 넣는 가입 화면으로 보낸다.
 */
export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const origin = appOrigin(request);
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${reason}`, origin));
  if (!enabledProviders().includes(provider as Provider)) return fail("unavailable");

  const search = new URL(request.url).searchParams;
  const jar = await cookies();
  const state = jar.get("oauth_state")?.value;
  const verifier = jar.get("oauth_verifier")?.value ?? "";
  const next = safeNext(jar.get("oauth_next")?.value);
  const invite = jar.get("oauth_invite")?.value ?? null;
  for (const name of ["oauth_state", "oauth_verifier", "oauth_next", "oauth_invite"]) {
    jar.delete({ name, path: "/api/auth" });
  }

  if (search.get("error")) return fail("denied");
  const code = search.get("code");
  if (!code || !state || search.get("state") !== state) return fail("expired");

  try {
    const profile = await finishLogin(provider as Provider, origin, code, verifier);
    const result = await signIn(profile, invite);
    if (!result.ok) {
      await startSignup(profile);
      const q = new URLSearchParams({ next });
      // 예전 초대 링크로 왔는데 그 코드를 이미 썼거나 없으면 가입 화면에서 알려 준다.
      if (invite) q.set("error", result.reason);
      return NextResponse.redirect(new URL(`/signup?${q}`, origin));
    }
    await createSession(result.user.id);
    return NextResponse.redirect(new URL(next, origin));
  } catch (err) {
    console.error("login failed", provider, err);
    return fail("failed");
  }
}
