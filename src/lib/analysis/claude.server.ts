import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import {
  type AnalyzeRequest,
  type ExplainRequest,
  LineExplanationSchema,
  SongAnalysisSchema,
} from "./schema";

export const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";

export class MissingApiKeyError extends Error {}
export class AnalysisError extends Error {}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  // 붙여넣을 때 딸려 온 공백·줄바꿈 때문에 인증이 실패하지 않게 다듬는다.
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim().replace(/^["']|["']$/g, "");
  if (!apiKey) throw new MissingApiKeyError("ANTHROPIC_API_KEY가 설정되지 않았어요.");
  client ??= new Anthropic({ apiKey });
  return client;
}

const ANALYZE_SYSTEM = `You build Japanese vocabulary study material for Korean learners from song lyrics the user is studying.

The user gives you lyrics as numbered lines ("[12] ..."), the song title/artist, and their level (입문 = absolute beginner who knows kana, or a JLPT level N5–N1).

Pick the words worth studying from this song:
- Favor words at the learner's level or one step above; skip words far below their level (at 입문/N5 basic words are fine to include). Skip particles, and auxiliary forms unless they form a set expression worth learning.
- Include memorable set expressions or idioms as pos "표현".
- Merge inflected occurrences into one entry in dictionary form, listing every line number it appears on.
- Order by usefulness to the learner, most useful first. Aim for roughly 12–35 entries depending on lyric length and density.
- If a word uses a poetic or unusual reading in the song (e.g. 宇宙 read as そら), give the song's reading and say so in the note.

Also pick 3–6 grammar patterns from the song that suit the learner's level.

For each word write two original example sentences that use it in the same sense as the song, at a difficulty suited to the learner, each with a natural Korean translation. Never copy lyric lines into examples.

Write all explanations in natural Korean. Refer to lyrics only by line number — do not reproduce, translate, or summarize the full lyrics; the summary describes the song's mood and theme in your own words.`;

const EXPLAIN_SYSTEM = `You explain one line of Japanese song lyrics to a Korean learner. The user is studying this song and pasted the line themselves. Give a natural Korean translation of that one line, break it into phrases from start to end with the meaning or role of each, and add brief grammar/nuance notes in Korean suited to the learner's level. Use the surrounding lines only for context.`;

/** 서버 측 fallback은 Opus/Sonnet/Fable에서만 지원된다. */
function fallbackParams() {
  if (/haiku/.test(MODEL)) return {};
  return { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };
}

async function runStructured<T extends z.ZodType>(opts: {
  schema: T;
  system: string;
  user: string;
  effort: "low" | "medium" | "high";
  maxTokens: number;
}): Promise<z.infer<T>> {
  const stream = getClient().beta.messages.stream({
    model: MODEL,
    max_tokens: opts.maxTokens,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
    output_config: { effort: opts.effort, format: betaZodOutputFormat(opts.schema) },
    ...fallbackParams(),
  });
  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") {
    throw new AnalysisError("AI가 이 가사의 분석을 거절했어요. 다른 노래로 시도해 주세요.");
  }
  if (message.stop_reason === "max_tokens") {
    throw new AnalysisError("가사가 너무 길어서 분석이 중간에 끊겼어요. 가사를 나눠서 넣어 주세요.");
  }
  if (message.parsed_output == null) {
    throw new AnalysisError("AI 응답을 읽지 못했어요. 다시 시도해 주세요.");
  }
  return message.parsed_output as z.infer<T>;
}

export function analyzeSong(req: AnalyzeRequest) {
  const numbered = req.lines
    .map((line, i) => (line.trim() ? `[${i}] ${line}` : null))
    .filter((line): line is string => line !== null)
    .join("\n");

  return runStructured({
    schema: SongAnalysisSchema,
    system: ANALYZE_SYSTEM,
    user: `곡: ${req.title}${req.artist ? ` / ${req.artist}` : ""}\n학습자 수준: ${req.level}\n\n가사:\n${numbered}`,
    effort: "medium",
    maxTokens: 32000,
  });
}

export function explainLine(req: ExplainRequest) {
  const context = [
    req.before ? `앞 줄: ${req.before}` : null,
    `설명할 줄: ${req.line}`,
    req.after ? `다음 줄: ${req.after}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return runStructured({
    schema: LineExplanationSchema,
    system: EXPLAIN_SYSTEM,
    user: `곡: ${req.title}${req.artist ? ` / ${req.artist}` : ""}\n학습자 수준: ${req.level}\n\n${context}`,
    effort: "low",
    maxTokens: 8000,
  });
}
