import { explainLine } from "@/lib/analysis/claude.server";
import { errorResponse } from "@/lib/analysis/errors.server";
import { ExplainRequestSchema } from "@/lib/analysis/schema";

export const maxDuration = 120;

export async function POST(request: Request) {
  const parsed = ExplainRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ code: "BAD_REQUEST", message: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }
  try {
    return Response.json(await explainLine(parsed.data));
  } catch (err) {
    return errorResponse(err);
  }
}
