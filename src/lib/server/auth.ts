import "server-only";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { INVITE_CODE_CHARS, INVITE_CODE_LENGTH, normalizeInviteCode } from "../invite-code";
import { db, dbConfigured, ensureSchema } from "./db";

export type Provider = "google" | "kakao";
export type User = { id: string; name: string; email: string | null; image: string | null; role: "admin" | "member" };

export const SESSION_COOKIE = "utango_session";
const SESSION_DAYS = 30;
/** 로그인은 했지만 아직 초대 코드를 넣지 않은 사람 */
export const SIGNUP_COOKIE = "utango_signup";
const SIGNUP_MINUTES = 30;
/** 가입 한 번에 초대 코드를 틀릴 수 있는 횟수 (넘으면 다시 로그인부터) */
export const SIGNUP_ATTEMPTS = 10;

export function providerConfigured(p: Provider): boolean {
  if (p === "google") return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return Boolean(process.env.KAKAO_CLIENT_ID);
}

export function enabledProviders(): Provider[] {
  if (!dbConfigured()) return [];
  return (["google", "kakao"] as const).filter(providerConfigured);
}

/** 로그인이 켜져 있으면 AI 기능은 로그인한 사람만 쓴다. */
export const authEnabled = () => enabledProviders().length > 0;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const randomId = (bytes = 16) => randomBytes(bytes).toString("base64url");

const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

export async function createSession(userId: string): Promise<void> {
  const token = randomId(32);
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db()`insert into sessions (id, user_id, expires_at) values (${hash(token)}, ${userId}, ${expires})`;
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

/** 지금 요청의 로그인 사용자. 로그인이 꺼져 있거나 세션이 없으면 null. */
export async function currentUser(): Promise<User | null> {
  if (!dbConfigured()) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  await ensureSchema();
  const rows = await db()<(User & { expires_at: Date })[]>`
    select u.id, u.name, u.email, u.image, u.role, s.expires_at
    from sessions s join users u on u.id = s.user_id
    where s.id = ${hash(token)} and s.expires_at > now()`;
  const row = rows[0];
  if (!row) return null;
  // 절반 넘게 지났으면 만료를 늦춘다 (쿠키는 다음 로그인 때 새로 받는다).
  if (row.expires_at.getTime() - Date.now() < (SESSION_DAYS / 2) * 86_400_000) {
    await db()`update sessions set expires_at = ${new Date(Date.now() + SESSION_DAYS * 86_400_000)} where id = ${hash(token)}`;
  }
  return { id: row.id, name: row.name, email: row.email, image: row.image, role: row.role };
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token && dbConfigured()) {
    await ensureSchema();
    await db()`delete from sessions where id = ${hash(token)}`;
  }
  jar.delete(SESSION_COOKIE);
}

export type Profile = { provider: Provider; id: string; name: string; email: string | null; image: string | null };

export type SignInResult = { ok: true; user: User } | { ok: false; reason: "invite_required" | "invite_used" };

/**
 * 로그인한 외부 계정에 맞는 사용자를 찾거나 만든다.
 * 새 사용자는 관리자 메일이거나 쓰지 않은 초대 코드가 있어야 가입할 수 있다. 아무도 없으면 첫 사람이 관리자가 된다.
 * 초대 코드는 넣은 그대로(예전 링크 코드)와 대문자·숫자만 남긴 것(ABCD-EFGH) 둘 다 찾아본다.
 */
export async function signIn(profile: Profile, inviteCode: string | null): Promise<SignInResult> {
  await ensureSchema();
  const sql = db();
  const found = await sql<User[]>`
    select u.id, u.name, u.email, u.image, u.role from accounts a join users u on u.id = a.user_id
    where a.provider = ${profile.provider} and a.provider_user_id = ${profile.id}`;
  if (found[0]) {
    const u = found[0];
    await sql`update users set name = ${profile.name || u.name}, image = ${profile.image ?? u.image},
      email = ${profile.email ?? u.email} where id = ${u.id}`;
    return { ok: true, user: { ...u, name: profile.name || u.name, image: profile.image ?? u.image } };
  }

  return sql.begin(async (tx) => {
    const email = profile.email?.toLowerCase() ?? null;
    const [{ count }] = await tx<{ count: number }[]>`select count(*)::int as count from users`;
    const isAdmin = (email !== null && adminEmails().includes(email)) || count === 0;
    const id = randomId();

    let code: string | null = null;
    if (!isAdmin) {
      const raw = inviteCode?.trim().slice(0, 64) ?? "";
      if (!raw) return { ok: false, reason: "invite_required" } as const;
      const typed = normalizeInviteCode(raw);
      const claimed = await tx<{ code: string }[]>`
        update invites set used_at = now() where (code = ${raw} or code = ${typed}) and used_by is null returning code`;
      if (!claimed.length) {
        const exists = await tx`select 1 from invites where code = ${raw} or code = ${typed}`;
        return { ok: false, reason: exists.length ? "invite_used" : "invite_required" } as const;
      }
      code = claimed[0].code;
    }
    const user: User = { id, name: profile.name, email, image: profile.image, role: isAdmin ? "admin" : "member" };
    await tx`insert into users (id, name, email, image, role) values (${id}, ${user.name}, ${email}, ${user.image}, ${user.role})`;
    await tx`insert into accounts (provider, provider_user_id, user_id) values (${profile.provider}, ${profile.id}, ${id})`;
    if (code) await tx`update invites set used_by = ${id} where code = ${code}`;
    return { ok: true, user } as const;
  });
}

export type PendingSignup = { provider: Provider; name: string; email: string | null; image: string | null };
export type SignupResult = SignInResult | { ok: false; reason: "expired" | "too_many" };

/** 처음 온 사람의 로그인 정보를 잠시 맡아 둔다. 초대 코드를 넣으면 이걸로 가입한다. 돌려준 토큰은 쿠키에 둔다. */
export async function createPendingSignup(profile: Profile): Promise<string> {
  await ensureSchema();
  const sql = db();
  const token = randomId(32);
  const expires = new Date(Date.now() + SIGNUP_MINUTES * 60_000);
  await sql`delete from pending_signups where expires_at < now()`;
  await sql`insert into pending_signups (id, provider, provider_user_id, name, email, image, expires_at)
    values (${hash(token)}, ${profile.provider}, ${profile.id}, ${profile.name}, ${profile.email}, ${profile.image}, ${expires})`;
  return token;
}

/** 맡아 둔 로그인 정보. 없거나 시간이 지났으면 null */
export async function getPendingSignup(token: string): Promise<PendingSignup | null> {
  await ensureSchema();
  const rows = await db()<PendingSignup[]>`
    select provider, name, email, image from pending_signups where id = ${hash(token)} and expires_at > now()`;
  return rows[0] ?? null;
}

/** 초대 코드를 넣어 가입을 마친다. 틀린 횟수가 너무 많으면 맡아 둔 정보를 지운다. */
export async function completeSignup(token: string, inviteCode: string): Promise<SignupResult> {
  await ensureSchema();
  const sql = db();
  const rows = await sql<(PendingSignup & { provider_user_id: string; attempts: number })[]>`
    update pending_signups set attempts = attempts + 1 where id = ${hash(token)} and expires_at > now()
    returning provider, provider_user_id, name, email, image, attempts`;
  const row = rows[0];
  if (!row) return { ok: false, reason: "expired" };
  if (row.attempts > SIGNUP_ATTEMPTS) {
    await cancelSignup(token);
    return { ok: false, reason: "too_many" };
  }
  const result = await signIn(
    { provider: row.provider, id: row.provider_user_id, name: row.name, email: row.email, image: row.image },
    inviteCode,
  );
  if (result.ok) await cancelSignup(token);
  return result;
}

export async function cancelSignup(token: string): Promise<void> {
  await ensureSchema();
  await db()`delete from pending_signups where id = ${hash(token)}`;
}

/** 가입 화면으로 보내기 전에: 로그인 정보를 맡기고 쿠키를 둔다. */
export async function startSignup(profile: Profile): Promise<void> {
  const token = await createPendingSignup(profile);
  (await cookies()).set(SIGNUP_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SIGNUP_MINUTES * 60,
  });
}

export type Invite = { code: string; createdAt: string; usedBy: string | null; usedAt: string | null };

export async function listInvites(): Promise<Invite[]> {
  await ensureSchema();
  const rows = await db()<{ code: string; created_at: Date; used_at: Date | null; name: string | null }[]>`
    select i.code, i.created_at, i.used_at, u.name from invites i left join users u on u.id = i.used_by
    order by i.created_at desc limit 50`;
  return rows.map((r) => ({
    code: r.code,
    createdAt: r.created_at.toISOString(),
    usedAt: r.used_at?.toISOString() ?? null,
    usedBy: r.used_at ? (r.name ?? "알 수 없음") : null,
  }));
}

/** 새 초대 코드 (ABCD-EFGH 꼴로 보여 줄 8자) */
export function newInviteCode(): string {
  return Array.from({ length: INVITE_CODE_LENGTH }, () => INVITE_CODE_CHARS[randomInt(INVITE_CODE_CHARS.length)]).join("");
}

export async function createInvite(by: string): Promise<string> {
  await ensureSchema();
  for (;;) {
    const code = newInviteCode();
    const rows = await db()`insert into invites (code, created_by) values (${code}, ${by}) on conflict do nothing returning code`;
    if (rows.length) return code;
  }
}

export async function deleteInvite(code: string): Promise<void> {
  await ensureSchema();
  await db()`delete from invites where code = ${code} and used_by is null`;
}

/** 로그인이 켜져 있는데 로그인하지 않았으면 AI 요청을 막는 응답. 통과면 null. */
export async function requireUserForAI(): Promise<Response | null> {
  if (!authEnabled()) return null;
  if (await currentUser()) return null;
  return Response.json(
    { code: "LOGIN_REQUIRED", message: "AI 기능은 로그인하면 쓸 수 있어요. 설정에서 로그인해 주세요." },
    { status: 401 },
  );
}

/** 외부로 돌려보낼 주소는 이 앱 안의 경로만 허용한다. */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
