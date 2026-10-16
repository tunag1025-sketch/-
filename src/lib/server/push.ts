import "server-only";
import webpush from "web-push";
import { kstDay, reminderMessage } from "../reminder";
import { db, ensureSchema } from "./db";

export type PushSubscriptionJSON = { endpoint: string; keys: { p256dh: string; auth: string } };

let vapid: Promise<{ publicKey: string; privateKey: string }> | null = null;

/**
 * 웹 푸시용 VAPID 키. 환경 변수(VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)가 있으면 그것을,
 * 없으면 처음 한 번 만들어 데이터베이스에 두고 계속 쓴다 (키가 바뀌면 받던 기기가 끊긴다).
 */
export function vapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) return Promise.resolve({ publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY });
  vapid ??= (async () => {
    await ensureSchema();
    const fresh = webpush.generateVAPIDKeys();
    // 여러 함수가 동시에 처음 만들어도 먼저 들어간 키 하나만 남는다.
    await db()`
      insert into app_config (key, value) values ('vapid', ${JSON.stringify(fresh)})
      on conflict (key) do nothing`;
    const [row] = await db()<{ value: string }[]>`select value from app_config where key = 'vapid'`;
    return JSON.parse(row.value) as { publicKey: string; privateKey: string };
  })().catch((err) => {
    vapid = null;
    throw err;
  });
  return vapid;
}

export async function saveSubscription(userId: string, sub: PushSubscriptionJSON): Promise<void> {
  await ensureSchema();
  await db()`
    insert into push_subscriptions (endpoint, user_id, p256dh, auth)
    values (${sub.endpoint}, ${userId}, ${sub.keys.p256dh}, ${sub.keys.auth})
    on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`;
}

export async function removeSubscription(userId: string, endpoint: string): Promise<void> {
  await ensureSchema();
  await db()`delete from push_subscriptions where endpoint = ${endpoint} and user_id = ${userId}`;
}

export async function hasSubscription(userId: string, endpoint: string): Promise<boolean> {
  await ensureSchema();
  const rows = await db()`select 1 from push_subscriptions where endpoint = ${endpoint} and user_id = ${userId}`;
  return rows.length > 0;
}

type Row = { endpoint: string; user_id: string; p256dh: string; auth: string; last_sent_day: string | null };

async function send(row: Row, payload: object): Promise<"sent" | "gone" | "failed"> {
  const { publicKey, privateKey } = await vapidKeys();
  try {
    await webpush.sendNotification(
      { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
      JSON.stringify(payload),
      {
        TTL: 6 * 3600,
        // 애플 푸시 서버는 연락처(subject)로 실제 주소를 원한다: 앱 주소를 쓴다.
        vapidDetails: {
          subject: process.env.VAPID_SUBJECT || process.env.APP_URL || "https://utango.vercel.app",
          publicKey,
          privateKey,
        },
      },
    );
    return "sent";
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    // 기기에서 알림을 끄거나 앱을 지우면 더 이상 받지 않는다.
    if (status === 404 || status === 410) {
      await db()`delete from push_subscriptions where endpoint = ${row.endpoint}`;
      return "gone";
    }
    return "failed";
  }
}

/** 이 사용자의 학습 상태: 지금 다시 볼 단어 수, 오늘 학습했는지 (동기화된 기록으로 센다) */
async function studyState(userId: string, now: number): Promise<{ due: number; studiedToday: boolean }> {
  const [{ due }] = await db()<{ due: number }[]>`
    select count(*)::int as due from entities
    where user_id = ${userId} and kind = 'card' and not deleted
      and key not like '문법:%' and key not like '한자:%'
      and coalesce((data->>'learned')::boolean, false) = false
      and (data->>'due')::bigint <= ${now}`;
  const today = await db()<{ count: number }[]>`
    select coalesce((data->>'count')::int, 0) as count from entities
    where user_id = ${userId} and kind = 'day' and key = ${`r:${kstDay(now)}`}`;
  return { due, studiedToday: (today[0]?.count ?? 0) > 0 };
}

/** 매일 알림: 오늘 아직 학습하지 않은 사람에게 한 번씩 보낸다. */
export async function sendDailyReminders(now = Date.now()) {
  await ensureSchema();
  const day = kstDay(now);
  const rows = await db()<Row[]>`
    select endpoint, user_id, p256dh, auth, last_sent_day from push_subscriptions
    where last_sent_day is distinct from ${day}`;
  const result = { sent: 0, skipped: 0, gone: 0, failed: 0 };
  const states = new Map<string, Awaited<ReturnType<typeof studyState>>>();
  for (const row of rows) {
    let state = states.get(row.user_id);
    if (!state) {
      state = await studyState(row.user_id, now);
      states.set(row.user_id, state);
    }
    const message = reminderMessage(state);
    if (!message) {
      result.skipped++;
      continue;
    }
    const outcome = await send(row, message);
    result[outcome]++;
    if (outcome === "sent") await db()`update push_subscriptions set last_sent_day = ${day} where endpoint = ${row.endpoint}`;
  }
  return result;
}

/** 설정 화면의 '시험 알림 보내기' */
export async function sendTest(userId: string): Promise<number> {
  await ensureSchema();
  const rows = await db()<Row[]>`
    select endpoint, user_id, p256dh, auth, last_sent_day from push_subscriptions where user_id = ${userId}`;
  let sent = 0;
  for (const row of rows) {
    const outcome = await send(row, {
      title: "Utango 알림이 켜졌어요",
      body: "매일 저녁 8시에 아직 공부하지 않았으면 알려 드릴게요.",
      url: "/study",
    });
    if (outcome === "sent") sent++;
  }
  return sent;
}
