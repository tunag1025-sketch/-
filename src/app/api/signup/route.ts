import { cookies } from "next/headers";
import {
  cancelSignup,
  completeSignup,
  createSession,
  getPendingSignup,
  SIGNUP_COOKIE,
  type SignupResult,
} from "@/lib/server/auth";
import { dbConfigured } from "@/lib/server/db";

const MESSAGES: Record<Exclude<SignupResult, { ok: true }>["reason"], string> = {
  invite_required: "맞지 않는 초대 코드예요. 받은 코드를 다시 확인해 주세요.",
  invite_used: "이미 다른 사람이 쓴 초대 코드예요. 새 코드를 받아 주세요.",
  expired: "가입 시간이 지났어요. 다시 로그인해 주세요.",
  too_many: "코드를 너무 많이 틀렸어요. 다시 로그인해 주세요.",
};

async function token(): Promise<string | null> {
  // 쿠키를 먼저 읽어야 빌드할 때 미리 만들어 두지 않는다.
  const value = (await cookies()).get(SIGNUP_COOKIE)?.value ?? null;
  return value && dbConfigured() ? value : null;
}

/** 로그인은 했고 초대 코드를 기다리는 계정 (없으면 pending: null) */
export async function GET() {
  const t = await token();
  const pending = t ? await getPendingSignup(t) : null;
  return Response.json({ pending });
}

/** 초대 코드를 넣어 가입을 마친다. */
export async function POST(request: Request) {
  const t = await token();
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code : "";
  const result: SignupResult = t ? await completeSignup(t, code) : { ok: false, reason: "expired" };
  const jar = await cookies();
  if (result.ok) {
    jar.delete(SIGNUP_COOKIE);
    await createSession(result.user.id);
    return Response.json({ ok: true });
  }
  if (result.reason === "expired" || result.reason === "too_many") jar.delete(SIGNUP_COOKIE);
  return Response.json({ code: result.reason, message: MESSAGES[result.reason] }, { status: 400 });
}

/** 다른 계정으로 로그인하려고 맡겨 둔 정보를 지운다. */
export async function DELETE() {
  const t = await token();
  if (t) await cancelSignup(t);
  (await cookies()).delete(SIGNUP_COOKIE);
  return Response.json({ ok: true });
}
