import { analyzeSong } from "@/lib/analysis/claude.server";
import { errorResponse } from "@/lib/analysis/errors.server";
import { requireUserForAI } from "@/lib/server/auth";
import { normalizeAnalysis } from "@/lib/analysis/normalize";
import { AnalyzeRequestSchema } from "@/lib/analysis/schema";
import { toRubyText } from "@/lib/tokenizer.server";

// 긴 가사는 단어장 생성에 1~3분 걸릴 수 있다.
export const maxDuration = 300;

export async function POST(request: Request) {
  const blocked = await requireUserForAI();
  if (blocked) return blocked;
  const parsed = AnalyzeRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ code: "BAD_REQUEST", message: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }
  try {
    const analysis = await analyzeSong(parsed.data);
    return Response.json(await normalizeAnalysis(analysis, parsed.data.lines, toRubyText));
  } catch (err) {
    return errorResponse(err);
  }
}
