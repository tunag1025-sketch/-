import { headers } from "next/headers";
import { sendDailyReminders } from "@/lib/server/push";
import { dbConfigured } from "@/lib/server/db";

/**
 * 매일 저녁 알림 (vercel.json의 crons가 부른다).
 * CRON_SECRET을 정해 두면 Vercel이 보내는 Authorization 헤더와 맞을 때만 보낸다.
 * 같은 날 두 번 불려도 기기마다 하루 한 번만 보낸다.
 */
export async function GET() {
  // 헤더를 먼저 읽어 빌드할 때 미리 실행되지 않고 요청이 올 때만 돌게 한다.
  const auth = (await headers()).get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return Response.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!dbConfigured()) return Response.json({ sent: 0, skipped: 0, gone: 0, failed: 0 });
  return Response.json(await sendDailyReminders());
}
