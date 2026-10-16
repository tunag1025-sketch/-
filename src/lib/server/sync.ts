import "server-only";
import type { Entity } from "../sync-core";
import { db, ensureSchema } from "./db";

const KINDS = new Set(["song", "card", "expl", "day", "settings"]);
const PAGE_ROWS = 400;
const PAGE_BYTES = 2_500_000;

/** 받은 항목을 저장한다. 더 나중에 바뀐 것만 덮어쓰고, 날짜별 수는 큰 값을 남긴다. */
export async function pushEntities(userId: string, entities: Entity[]): Promise<void> {
  const rows = entities
    .filter((e) => KINDS.has(e.kind) && typeof e.key === "string" && e.key.length <= 300 && Number.isFinite(e.updatedAt))
    .map((e) => ({ kind: e.kind, key: e.key, data: e.data ?? null, updated_at: Math.round(e.updatedAt), deleted: !!e.deleted }));
  if (!rows.length) return;
  await ensureSchema();
  const sql = db();
  await sql.begin(async (tx) => {
    await tx`
      insert into entities (user_id, kind, key, data, updated_at, deleted)
      select ${userId}, r.kind, r.key, r.data, r.updated_at, r.deleted
      from jsonb_to_recordset(${tx.json(rows as never)}) as r(kind text, key text, data jsonb, updated_at bigint, deleted boolean)
      on conflict (user_id, kind, key) do update set
        data = case when excluded.kind = 'day'
          then jsonb_build_object('count', greatest(coalesce((entities.data->>'count')::int, 0), coalesce((excluded.data->>'count')::int, 0)))
          else excluded.data end,
        updated_at = greatest(entities.updated_at, excluded.updated_at),
        deleted = excluded.deleted,
        seq = nextval('entity_seq')
      where excluded.kind = 'day' or excluded.updated_at >= entities.updated_at`;
    // 지운 노래의 카드·해설은 서버에서도 지운다 (다른 기기는 노래가 지워진 걸 보고 함께 지운다).
    const gone = rows.filter((r) => r.kind === "song" && r.deleted).map((r) => `${r.key}:%`);
    if (gone.length) {
      await tx`delete from entities where user_id = ${userId} and kind in ('card', 'expl') and key like any(${gone})`;
    }
  });
}

/** since 뒤로 바뀐 항목. 한 번에 너무 크지 않게 끊고, 더 있으면 more. */
export async function pullEntities(
  userId: string,
  since: number,
): Promise<{ entities: Entity[]; cursor: number; more: boolean }> {
  await ensureSchema();
  const rows = await db()<
    { kind: Entity["kind"]; key: string; data: unknown; updated_at: string; deleted: boolean; seq: string; size: number }[]
  >`select kind, key, data, updated_at, deleted, seq, coalesce(octet_length(data::text), 0) as size
    from entities where user_id = ${userId} and seq > ${since} order by seq limit ${PAGE_ROWS}`;
  const entities: Entity[] = [];
  let cursor = since;
  let bytes = 0;
  let cut = false;
  for (const r of rows) {
    if (entities.length && bytes + r.size > PAGE_BYTES) {
      cut = true;
      break;
    }
    bytes += r.size;
    entities.push({ kind: r.kind, key: r.key, data: r.data, updatedAt: Number(r.updated_at), deleted: r.deleted || undefined });
    cursor = Number(r.seq);
  }
  return { entities, cursor, more: cut || rows.length === PAGE_ROWS };
}
