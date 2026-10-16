import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSession, enabledProviders, type Provider, safeNext, signIn } from "@/lib/server/auth";
import { appOrigin, finishLogin } from "@/lib/server/oauth";

/** Google·카카오에서 돌아온 뒤: 사용자를 찾거나(초대가 있으면) 만들고 로그인시킨다. */
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
    if (!result.ok) return fail(result.reason);
    await createSession(result.user.id);
    return NextResponse.redirect(new URL(next, origin));
  } catch (err) {
    console.error("login failed", provider, err);
    return fail("failed");
  }
}
