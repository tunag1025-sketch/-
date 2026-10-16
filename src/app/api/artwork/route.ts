import { searchArtwork } from "@/lib/artwork.server";

/** 제목·가수로 앨범 커버 후보를 찾는다 (iTunes 검색). */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const title = (params.get("title") ?? "").trim().slice(0, 200);
  const artist = (params.get("artist") ?? "").trim().slice(0, 200);
  if (!title) return Response.json({ code: "BAD_REQUEST", message: "제목이 필요해요." }, { status: 400 });
  return Response.json({ results: await searchArtwork(title, artist) });
}
