import "server-only";
import { decodeIdToken, generateCodeVerifier, generateState, Google, Kakao } from "arctic";
import type { Profile, Provider } from "./auth";

/** 이 앱의 주소. APP_URL이 있으면 그걸, 없으면 요청 주소를 쓴다. */
export function appOrigin(request: Request): string {
  return process.env.APP_URL?.replace(/\/$/, "") || new URL(request.url).origin;
}

const redirectUri = (origin: string, p: Provider) => `${origin}/api/auth/${p}/callback`;

const google = (origin: string) =>
  new Google(process.env.GOOGLE_CLIENT_ID!, process.env.GOOGLE_CLIENT_SECRET!, redirectUri(origin, "google"));
const kakao = (origin: string) =>
  new Kakao(process.env.KAKAO_CLIENT_ID!, process.env.KAKAO_CLIENT_SECRET ?? "", redirectUri(origin, "kakao"));

export function startLogin(p: Provider, origin: string): { url: URL; state: string; verifier: string } {
  const state = generateState();
  const verifier = generateCodeVerifier();
  const url =
    p === "google"
      ? google(origin).createAuthorizationURL(state, verifier, ["openid", "profile", "email"])
      : kakao(origin).createAuthorizationURL(state, ["profile_nickname", "profile_image"]);
  if (p === "google") url.searchParams.set("prompt", "select_account");
  return { url, state, verifier };
}

/** 받은 code로 토큰을 바꾸고 프로필을 읽는다. */
export async function finishLogin(p: Provider, origin: string, code: string, verifier: string): Promise<Profile> {
  if (p === "google") {
    const tokens = await google(origin).validateAuthorizationCode(code, verifier);
    const claims = decodeIdToken(tokens.idToken()) as {
      sub: string;
      name?: string;
      email?: string;
      email_verified?: boolean;
      picture?: string;
    };
    return {
      provider: "google",
      id: claims.sub,
      name: claims.name ?? "",
      email: claims.email && claims.email_verified ? claims.email : null,
      image: claims.picture ?? null,
    };
  }
  const tokens = await kakao(origin).validateAuthorizationCode(code);
  const res = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { Authorization: `Bearer ${tokens.accessToken()}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`kakao profile ${res.status}`);
  const me = (await res.json()) as {
    id: number;
    kakao_account?: {
      email?: string;
      is_email_verified?: boolean;
      profile?: { nickname?: string; profile_image_url?: string };
    };
  };
  const account = me.kakao_account;
  return {
    provider: "kakao",
    id: String(me.id),
    name: account?.profile?.nickname ?? "",
    email: account?.email && account.is_email_verified ? account.email : null,
    image: account?.profile?.profile_image_url ?? null,
  };
}
