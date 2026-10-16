import { z } from "zod";
import { stripInlineFurigana, tokenizeLines } from "@/lib/tokenizer.server";

const BodySchema = z.object({ lines: z.array(z.string().max(500)).min(1).max(400) });

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ code: "BAD_REQUEST", message: "가사 형식이 올바르지 않아요." }, { status: 400 });
  }
  const lines = await stripInlineFurigana(parsed.data.lines);
  return Response.json({ lines: await tokenizeLines(lines) });
}
