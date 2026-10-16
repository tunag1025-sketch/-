import { afterAll, beforeAll, describe, expect, it } from "vitest";

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
    await sql`drop table if exists entities, invites, sessions, accounts, users cascade`;
    await ensureSchema();
  });
  afterAll(async () => {
    await sql?.end();
  });

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
