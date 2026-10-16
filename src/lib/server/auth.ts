import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db, dbConfigured, ensureSchema } from "./db";

export type Provider = "google" | "kakao";
export type User = { id: string; name: string; email: string | null; image: string | null; role: "admin" | "member" };

export const SESSION_COOKIE = "utango_session";
const SESSION_DAYS = 30;

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

    if (!isAdmin) {
      if (!inviteCode) return { ok: false, reason: "invite_required" } as const;
      const claimed = await tx`update invites set used_at = now() where code = ${inviteCode} and used_by is null returning code`;
      if (!claimed.length) {
        const exists = await tx`select 1 from invites where code = ${inviteCode}`;
        return { ok: false, reason: exists.length ? "invite_used" : "invite_required" } as const;
      }
    }
    const user: User = { id, name: profile.name, email, image: profile.image, role: isAdmin ? "admin" : "member" };
    await tx`insert into users (id, name, email, image, role) values (${id}, ${user.name}, ${email}, ${user.image}, ${user.role})`;
    await tx`insert into accounts (provider, provider_user_id, user_id) values (${profile.provider}, ${profile.id}, ${id})`;
    if (!isAdmin) await tx`update invites set used_by = ${id} where code = ${inviteCode}`;
    return { ok: true, user } as const;
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

export async function createInvite(by: string): Promise<string> {
  await ensureSchema();
  const code = randomId(9);
  await db()`insert into invites (code, created_by) values (${code}, ${by})`;
  return code;
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
