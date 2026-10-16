import { currentUser } from "@/lib/server/auth";
import { sendTest } from "@/lib/server/push";

/** 내 기기들로 시험 알림을 보낸다. */
export async function POST() {
  const user = await currentUser();
  if (!user) return Response.json({ code: "LOGIN_REQUIRED", message: "로그인이 필요해요." }, { status: 401 });
  return Response.json({ sent: await sendTest(user.id) });
}
