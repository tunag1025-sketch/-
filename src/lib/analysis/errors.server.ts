import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { AnalysisError, MissingApiKeyError } from "./claude.server";

export type ApiErrorBody = { code: string; message: string };

/** 라우트 핸들러에서 던져진 에러를 사용자에게 보여줄 JSON 응답으로 바꾼다. */
export function errorResponse(err: unknown): Response {
  const json = (status: number, code: string, message: string) =>
    Response.json({ code, message } satisfies ApiErrorBody, { status });

  if (err instanceof MissingApiKeyError) {
    return json(503, "NO_API_KEY", "AI 기능을 쓰려면 서버에 ANTHROPIC_API_KEY를 설정해야 해요.");
  }
  if (err instanceof AnalysisError) return json(422, "ANALYSIS_FAILED", err.message);
  if (err instanceof Anthropic.AuthenticationError) {
    return json(
      503,
      "BAD_API_KEY",
      "서버에 넣은 Claude API 키가 거절됐어요. Vercel 환경 변수의 ANTHROPIC_API_KEY를 확인하고 다시 배포해 주세요.",
    );
  }
  if (err instanceof Anthropic.RateLimitError) {
    return json(429, "RATE_LIMITED", "요청이 많아서 잠시 막혔어요. 조금 뒤에 다시 시도해 주세요.");
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return json(502, "UPSTREAM", "AI 서버에 연결하지 못했어요. 다시 시도해 주세요.");
  }
  if (err instanceof Anthropic.APIError) {
    console.error("Claude API error", err.status, err.message);
    return json(502, "UPSTREAM", "AI 서버에서 오류가 났어요. 다시 시도해 주세요.");
  }
  console.error(err);
  return json(500, "INTERNAL", "알 수 없는 오류가 났어요.");
}
