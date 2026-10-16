import { currentUser } from "@/lib/server/auth";
import { pullEntities, pushEntities } from "@/lib/server/sync";
import type { Entity } from "@/lib/sync-core";

const unauthorized = () => Response.json({ code: "LOGIN_REQUIRED", message: "로그인이 필요해요." }, { status: 401 });

/** since 뒤로 바뀐 학습 데이터 */
export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const since = Number(new URL(request.url).searchParams.get("since")) || 0;
  return Response.json(await pullEntities(user.id, since));
}

/** 이 기기에서 바뀐 학습 데이터를 올린다. */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const body = (await request.json().catch(() => null)) as { entities?: Entity[] } | null;
  if (!body || !Array.isArray(body.entities) || body.entities.length > 5000) {
    return Response.json({ code: "BAD_REQUEST", message: "형식이 올바르지 않아요." }, { status: 400 });
  }
  await pushEntities(user.id, body.entities);
  return Response.json({ ok: true });
}
