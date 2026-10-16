import { searchSongs } from "@/lib/artwork.server";

/** 노래 제목·가수로 노래를 찾는다 (iTunes 검색). 가사는 주지 않는다. */
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 200);
  if (q.length < 1) return Response.json({ results: [] });
  return Response.json({ results: await searchSongs(q) });
}
