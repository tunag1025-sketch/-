import "server-only";
import postgres from "postgres";

const url = () => process.env.DATABASE_URL || process.env.POSTGRES_URL;

/** 데이터베이스가 연결돼 있는지 (로그인·동기화를 켤지) */
export const dbConfigured = () => Boolean(url());

let sql: postgres.Sql | null = null;

export function db(): postgres.Sql {
  const u = url();
  if (!u) throw new Error("DATABASE_URL이 없어요.");
  // 서버리스 함수 하나가 연결을 많이 잡지 않게 작게 둔다. prepare: false는 연결 풀러(PgBouncer)용.
  sql ??= postgres(u, { max: 3, idle_timeout: 20, prepare: false, onnotice: () => {} });
  return sql;
}

const SCHEMA = `
create table if not exists users (
  id text primary key,
  name text not null default '',
  email text,
  image text,
  role text not null default 'member',
  created_at timestamptz not null default now()
);
create table if not exists accounts (
  provider text not null,
  provider_user_id text not null,
  user_id text not null references users(id) on delete cascade,
  primary key (provider, provider_user_id)
);
create table if not exists sessions (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  expires_at timestamptz not null
);
create table if not exists invites (
  code text primary key,
  created_by text references users(id) on delete set null,
  created_at timestamptz not null default now(),
  used_by text references users(id) on delete set null,
  used_at timestamptz
);
create sequence if not exists entity_seq;
create table if not exists entities (
  user_id text not null references users(id) on delete cascade,
  kind text not null,
  key text not null,
  data jsonb,
  updated_at bigint not null,
  deleted boolean not null default false,
  seq bigint not null default nextval('entity_seq'),
  primary key (user_id, kind, key)
);
create index if not exists entities_user_seq on entities (user_id, seq);
create table if not exists app_config (
  key text primary key,
  value text not null
);
create table if not exists push_subscriptions (
  endpoint text primary key,
  user_id text not null references users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  last_sent_day text
);
create index if not exists push_subscriptions_user on push_subscriptions (user_id);
`;

let ready: Promise<void> | null = null;

/** 처음 쓸 때 테이블을 만든다 (따로 마이그레이션을 돌리지 않아도 되게). */
export function ensureSchema(): Promise<void> {
  ready ??= db()
    .unsafe(SCHEMA)
    .then(() => undefined)
    .catch(async (err) => {
      // 여러 함수가 동시에 처음 만들다 부딪히면 한 번 더 해 본다.
      await new Promise((r) => setTimeout(r, 300));
      return db()
        .unsafe(SCHEMA)
        .then(() => undefined)
        .catch(() => {
          ready = null;
          throw err;
        });
    });
  return ready;
}
