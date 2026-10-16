import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// 진짜 푸시 서버로 보내지 않는다. 주소에 gone이 들어 있으면 '구독이 사라짐'(410)으로 답한다.
const sent: { endpoint: string; payload: string }[] = [];
vi.mock("web-push", () => ({
  default: {
    generateVAPIDKeys: () => ({ publicKey: "pub-key", privateKey: "priv-key" }),
    sendNotification: async (sub: { endpoint: string }, payload: string) => {
      if (sub.endpoint.includes("gone")) throw Object.assign(new Error("gone"), { statusCode: 410 });
      sent.push({ endpoint: sub.endpoint, payload });
    },
  },
}));

// 로컬 Postgres가 있을 때만 돈다: TEST_DATABASE_URL=postgres://... npm test
const url = process.env.TEST_DATABASE_URL;
const run = url ? describe : describe.skip;

run("server: sign in, invites, sync", () => {
  let auth: typeof import("../server/auth");
  let sync: typeof import("../server/sync");
  let sql: import("postgres").Sql;

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    process.env.ADMIN_EMAILS = "owner@example.com";
    auth = await import("../server/auth");
    sync = await import("../server/sync");
    const { db, ensureSchema } = await import("../server/db");
    sql = db();
    await sql`drop table if exists push_subscriptions, app_config, entities, invites, sessions, accounts, users cascade`;
    await ensureSchema();
  });
  // 연결은 파일 끝(알림 테스트 뒤)에서 닫는다.

  const profile = (id: string, email: string | null = null) => ({
    provider: "google" as const,
    id,
    name: id,
    email,
    image: null,
  });

  it("lets the admin in and keeps strangers out", async () => {
    const owner = await auth.signIn(profile("g-owner", "Owner@example.com"), null);
    expect(owner.ok && owner.user.role).toBe("admin");
    expect(await auth.signIn(profile("g-stranger"), null)).toEqual({ ok: false, reason: "invite_required" });
    expect(await auth.signIn(profile("g-stranger"), "nope")).toEqual({ ok: false, reason: "invite_required" });
  });

  it("lets one person in per invite", async () => {
    const [{ id: ownerId }] = await sql<{ id: string }[]>`select id from users where role = 'admin'`;
    const code = await auth.createInvite(ownerId);
    const friend = await auth.signIn({ ...profile("k-friend"), provider: "kakao" }, code);
    expect(friend.ok && friend.user.role).toBe("member");
    expect(await auth.signIn(profile("g-other"), code)).toEqual({ ok: false, reason: "invite_used" });
    // 이미 가입한 사람은 초대 없이 다시 들어온다.
    const again = await auth.signIn({ ...profile("k-friend"), provider: "kakao", name: "새 이름" }, null);
    expect(again.ok && again.user.name).toBe("새 이름");
    const invites = await auth.listInvites();
    expect(invites[0].usedBy).toBe("새 이름");
  });

  it("syncs entities with last-write-wins and keeps the larger day count", async () => {
    const [{ id }] = await sql<{ id: string }[]>`select id from users where role = 'admin'`;
    await sync.pushEntities(id, [
      { kind: "song", key: "s1", data: { id: "s1", title: "A" }, updatedAt: 10 },
      { kind: "card", key: "s1:一", data: { reps: 2 }, updatedAt: 10 },
      { kind: "day", key: "r:d", data: { count: 5 }, updatedAt: 0 },
    ]);
    const first = await sync.pullEntities(id, 0);
    expect(first.entities).toHaveLength(3);

    await sync.pushEntities(id, [
      { kind: "song", key: "s1", data: { id: "s1", title: "old" }, updatedAt: 5 },
      { kind: "day", key: "r:d", data: { count: 3 }, updatedAt: 0 },
    ]);
    const after = await sync.pullEntities(id, 0);
    const song = after.entities.find((e) => e.kind === "song")!;
    expect((song.data as { title: string }).title).toBe("A");
    expect((after.entities.find((e) => e.kind === "day")!.data as { count: number }).count).toBe(5);

    // 지운 노래: 카드도 서버에서 지워지고, 지운 사실이 다음 pull에 온다.
    await sync.pushEntities(id, [{ kind: "song", key: "s1", data: null, updatedAt: 20, deleted: true }]);
    const later = await sync.pullEntities(id, first.cursor);
    expect(later.entities.find((e) => e.kind === "song")?.deleted).toBe(true);
    const cards = await sql`select 1 from entities where user_id = ${id} and kind = 'card'`;
    expect(cards).toHaveLength(0);
  });

  it("keeps each user's data separate", async () => {
    const [{ id: friend }] = await sql<{ id: string }[]>`select id from users where role = 'member'`;
    expect((await sync.pullEntities(friend, 0)).entities).toHaveLength(0);
  });
});

run("server: daily study reminders", () => {
  let push: typeof import("../server/push");
  let sql: import("postgres").Sql;
  const now = Date.UTC(2026, 9, 16, 11, 0); // 한국 시간 저녁 8시
  const today = "2026-10-16";

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    push = await import("../server/push");
    const { db, ensureSchema } = await import("../server/db");
    await ensureSchema();
    sql = db();
    await sql`insert into users (id, name) values ('p1', 'p1'), ('p2', 'p2'), ('p3', 'p3') on conflict do nothing`;
    const card = (due: number, learned = false) => sql.json({ due, learned, interval: 1, ease: 2.5, reps: 1, lapses: 0 });
    await sql`
      insert into entities (user_id, kind, key, data, updated_at) values
        ('p1', 'card', '君', ${card(now - 1000)}, 1),
        ('p1', 'card', '空', ${card(now + 86_400_000)}, 1),
        ('p1', 'card', '星', ${card(now - 1000, true)}, 1),
        ('p1', 'card', '문법:〜ても', ${card(now - 1000)}, 1),
        ('p2', 'card', '夢', ${card(now - 1000)}, 1),
        ('p2', 'day', ${`r:${today}`}, ${sql.json({ count: 3 })}, 0)`;
  });
  afterAll(async () => {
    await sql?.end();
  });

  const sub = (endpoint: string) => ({ endpoint, keys: { p256dh: "p", auth: "a" } });

  it("makes VAPID keys once and keeps them", async () => {
    const a = await push.vapidKeys();
    const b = await push.vapidKeys();
    expect(a).toEqual({ publicKey: "pub-key", privateKey: "priv-key" });
    expect(b).toEqual(a);
    expect(await sql`select 1 from app_config where key = 'vapid'`).toHaveLength(1);
  });

  it("reminds only people who have not studied today, once a day, and drops dead subscriptions", async () => {
    await push.saveSubscription("p1", sub("https://push.example/p1"));
    await push.saveSubscription("p2", sub("https://push.example/p2"));
    await push.saveSubscription("p3", sub("https://push.example/gone-p3"));
    expect(await push.hasSubscription("p1", "https://push.example/p1")).toBe(true);
    expect(await push.hasSubscription("p2", "https://push.example/p1")).toBe(false);

    sent.length = 0;
    expect(await push.sendDailyReminders(now)).toEqual({ sent: 1, skipped: 1, gone: 1, failed: 0 });
    expect(sent.map((s) => s.endpoint)).toEqual(["https://push.example/p1"]);
    // 장기기억·아직 기한이 안 된 단어·문법 카드는 세지 않는다
    expect(JSON.parse(sent[0].payload).body).toContain("다시 볼 단어 1개");
    expect(await sql`select 1 from push_subscriptions where endpoint like '%gone%'`).toHaveLength(0);

    // 같은 날 또 불려도 다시 보내지 않는다
    expect((await push.sendDailyReminders(now + 60_000)).sent).toBe(0);

    await push.removeSubscription("p1", "https://push.example/p1");
    expect(await push.hasSubscription("p1", "https://push.example/p1")).toBe(false);
  });
});
