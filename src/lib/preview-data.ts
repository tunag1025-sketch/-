/**
 * 화면 미리보기(/preview)의 샘플 데이터와 가짜 서버 응답.
 * 노래는 scripts/preview-source.ts 에서 만든다 (node scripts/build-preview.ts).
 */
import type { AccountUser } from "./account";
import type { SongHit } from "./artwork";
import { grammarKey, kanjiKey } from "./cards";
import { INVITE_CODE_CHARS, INVITE_CODE_LENGTH, normalizeInviteCode } from "./invite-code";
import { DEFAULT_SETTINGS, explanationKey, type UserData } from "./data";
import demoSong from "./demo-song.json";
import previewSongs from "./preview-songs.json";
import { dayKey } from "./stats";
import type { CardState, LineExplanation, Song } from "./types";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

type SongJson = Song & { explanations: Record<string, LineExplanation> };

export const PREVIEW_USER: AccountUser = { id: "preview", name: "미리보기 사용자", image: null, role: "admin" };

// 노래마다 추가한 시각 (지금부터 얼마 전)
const ADDED_AGO: Record<string, number> = {
  "pv-new": 10 * 60_000,
  "pv-ame": DAY,
  "pv-guitar": 5 * DAY,
  "pv-error": 8 * DAY,
  "demo-yoake": 20 * DAY,
};

// 장기기억 · 단기기억 · 오늘 복습할 단어 (나머지는 학습 전)
const LONG = ["夜明け", "星", "窓", "涙", "歌"];
const SHORT: [word: string, interval: number][] = [
  ["思う", 3],
  ["遠く", 6],
  ["離れる", 2],
  ["傘", 1],
  ["放課後", 4],
  ["古い", 2],
  ["夢", 1],
];
const DUE = ["君", "眠る", "約束", "信じる", "弾く"];
// 자주 틀린 단어 ('다시'를 고른 횟수)
const LAPSES: Record<string, number> = { 眠る: 3, 信じる: 2, 離れる: 2 };
// 문법·한자 카드 (나머지는 학습 전)
const GRAMMAR_LONG = ["〜ても"];
const GRAMMAR_DUE = ["〜ていく", "〜て"];
const KANJI_LONG = ["夜", "星", "空"];
const KANJI_DUE = ["君", "雨"];

// 최근 2주 동안 날마다 답한 수 (오늘부터 거꾸로). 0인 날에서 연속 기록이 끊긴다.
const REVIEWS = [8, 15, 22, 9, 18, 0, 12, 6, 14, 0, 10, 7, 0, 5];
const NEW_TODAY = 6;

function longCard(now: number): CardState {
  const at = now - 3 * DAY;
  return { due: now + 30 * DAY, interval: 24, ease: 2.7, reps: 5, lapses: 0, lastReviewed: at, perfect: 3, correct: 5, learned: true, learnedAt: at, updatedAt: at };
}

function shortCard(now: number, interval: number, due: number): CardState {
  const at = now - DAY;
  return { due, interval, ease: 2.5, reps: 2, lapses: 0, lastReviewed: at, perfect: 0, correct: 2, updatedAt: at };
}

/** 미리보기용 학습 데이터 전체 */
export function makePreviewState(now: number): UserData & { seededDemo: boolean; settingsUpdatedAt: number } {
  const all = [demoSong, ...previewSongs] as SongJson[];
  const songs: Record<string, Song> = {};
  const explanations: Record<string, LineExplanation> = {};
  for (const { explanations: lines, ...song } of all) {
    const createdAt = now - (ADDED_AGO[song.id] ?? DAY);
    songs[song.id] = { ...song, createdAt, updatedAt: createdAt };
    for (const [line, e] of Object.entries(lines)) explanations[explanationKey(song.id, Number(line))] = e;
  }
  const order = Object.values(songs)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((s) => s.id);

  const cards: Record<string, CardState> = {};
  for (const word of LONG) cards[word] = longCard(now);
  for (const [word, interval] of SHORT) cards[word] = shortCard(now, interval, now + interval * DAY);
  DUE.forEach((word, i) => (cards[word] = shortCard(now, 1, now - (DUE.length - i) * HOUR)));
  for (const [word, lapses] of Object.entries(LAPSES)) cards[word] = { ...cards[word], lapses };
  for (const p of GRAMMAR_LONG) cards[grammarKey(p)] = longCard(now);
  GRAMMAR_DUE.forEach((p, i) => (cards[grammarKey(p)] = shortCard(now, 1, now - (i + 1) * HOUR)));
  for (const c of KANJI_LONG) cards[kanjiKey(c)] = longCard(now);
  KANJI_DUE.forEach((c, i) => (cards[kanjiKey(c)] = shortCard(now, 1, now - (i + 1) * HOUR)));

  const reviewLog: Record<string, number> = {};
  REVIEWS.forEach((n, i) => n && (reviewLog[dayKey(now - i * DAY)] = n));
  const newLog: Record<string, number> = { [dayKey(now)]: NEW_TODAY };
  REVIEWS.forEach((n, i) => i > 0 && n && (newLog[dayKey(now - i * DAY)] = Math.ceil(n / 3)));

  return {
    songs,
    order,
    cards,
    explanations,
    reviewLog,
    newLog,
    settings: DEFAULT_SETTINGS,
    deleted: {},
    seededDemo: true,
    settingsUpdatedAt: 0,
  };
}

// 이 탭에서 만든 초대 코드 (설정 화면에서 만들고 지울 수 있게)
let invites = [
  { code: "K7QM2XPA", daysAgo: 1, usedBy: null as string | null },
  { code: "T4HN8WRC", daysAgo: 6, usedBy: "민지" },
];

const sampleCode = () =>
  Array.from({ length: INVITE_CODE_LENGTH }, () => INVITE_CODE_CHARS[Math.floor(Math.random() * INVITE_CODE_CHARS.length)]).join("");

const SEARCH_HITS: SongHit[] = [
  { title: "雨上がりの帰り道", artist: "Utango 샘플", album: "샘플 앨범", cover: null },
  { title: "放課後のギター", artist: "Utango 샘플", album: "샘플 앨범", cover: null },
  { title: "星降る町", artist: "Utango 샘플", album: "겨울 샘플", cover: null },
  { title: "はじまりの歌", artist: "Utango 샘플", album: "겨울 샘플", cover: null },
  { title: "夜明けのメロディ", artist: "Utango 데모곡", album: "데모", cover: null },
];

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

/** 미리보기에서 /api/* 대신 돌려줄 응답 */
export async function previewApi(url: URL, method: string, guest: boolean, body?: string): Promise<Response> {
  const now = Date.now();
  switch (url.pathname) {
    case "/api/me":
      return json({ enabled: true, providers: ["google", "kakao"], user: guest ? null : PREVIEW_USER });
    case "/api/status":
      return json({ ai: true });
    case "/api/invites": {
      if (guest) return json({ message: "로그인이 필요해요.", code: "LOGIN_REQUIRED" }, 401);
      if (method === "POST") {
        const code = sampleCode();
        invites = [{ code, daysAgo: 0, usedBy: null }, ...invites];
        return json({ code });
      }
      if (method === "DELETE") {
        invites = invites.filter((i) => i.code !== url.searchParams.get("code"));
        return json({ ok: true });
      }
      return json({
        invites: invites.map((i) => ({
          code: i.code,
          createdAt: new Date(now - i.daysAgo * DAY).toISOString(),
          usedBy: i.usedBy,
          usedAt: i.usedBy ? new Date(now - (i.daysAgo - 1) * DAY).toISOString() : null,
        })),
      });
    }
    case "/api/songs/search": {
      const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
      const hits = SEARCH_HITS.filter((h) => `${h.title} ${h.artist}`.toLowerCase().includes(q));
      return json({ results: hits });
    }
    case "/api/artwork":
      return json({ results: [] });
    case "/api/explain":
      return json({
        translation: "미리보기에서는 새 해설을 만들지 않아요. 이 자리에 이 줄의 해석이 나와요.",
        breakdown: [],
        notes: "",
      } satisfies LineExplanation);
    case "/api/analyze":
      await new Promise((r) => setTimeout(r, 1200));
      return json({ message: "미리보기에서는 단어장을 만들지 않아요.", code: "PREVIEW" }, 503);
    case "/api/signup": {
      if (method === "GET") return json({ pending: { provider: "kakao", name: "새 친구", email: null, image: null } });
      if (method === "DELETE") return json({ ok: true });
      // 아직 안 쓴 샘플 코드(K7QM-2XPA 등)로만 가입된다.
      const code = normalizeInviteCode(String((JSON.parse(body ?? "{}") as { code?: unknown }).code ?? ""));
      const invite = invites.find((i) => i.code === code);
      if (!invite) return json({ code: "invite_required", message: "맞지 않는 초대 코드예요. 받은 코드를 다시 확인해 주세요." }, 400);
      if (invite.usedBy) return json({ code: "invite_used", message: "이미 다른 사람이 쓴 초대 코드예요. 새 코드를 받아 주세요." }, 400);
      invite.usedBy = "새 친구";
      return json({ ok: true });
    }
    case "/api/push":
      return json(method === "GET" ? { publicKey: "", subscribed: false } : { ok: true });
    case "/api/push/test":
      return json({ sent: 0 });
    case "/api/sync":
      return json(method === "POST" ? { ok: true } : { entities: [], cursor: 0, more: false });
    default:
      return json({ ok: true });
  }
}
