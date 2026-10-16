import { currentUser } from "@/lib/server/auth";
import { hasSubscription, type PushSubscriptionJSON, removeSubscription, saveSubscription, vapidKeys } from "@/lib/server/push";

const unauthorized = () => Response.json({ code: "LOGIN_REQUIRED", message: "로그인이 필요해요." }, { status: 401 });

/** 알림 구독에 쓸 공개 키와, 이 기기(endpoint)가 구독돼 있는지 */
export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const endpoint = new URL(request.url).searchParams.get("endpoint");
  const { publicKey } = await vapidKeys();
  return Response.json({ publicKey, subscribed: endpoint ? await hasSubscription(user.id, endpoint) : false });
}

/** 이 기기에서 알림을 켠다. */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const sub = (await request.json().catch(() => null)) as PushSubscriptionJSON | null;
  if (!sub?.endpoint?.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth) {
    return Response.json({ code: "BAD_REQUEST", message: "알림 정보가 올바르지 않아요." }, { status: 400 });
  }
  await saveSubscription(user.id, sub);
  return Response.json({ ok: true });
}

/** 이 기기에서 알림을 끈다. */
export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const body = (await request.json().catch(() => null)) as { endpoint?: string } | null;
  if (body?.endpoint) await removeSubscription(user.id, body.endpoint);
  return Response.json({ ok: true });
}
