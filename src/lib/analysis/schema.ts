import { z } from "zod";
import { LEVELS } from "../types";

/** Claude가 돌려주는 단어장 (structured output 스키마) */
export const SongAnalysisSchema = z.object({
  summary: z.string().describe("곡의 분위기와 주제를 한국어 1~2문장으로. 가사를 인용하지 말 것."),
  vocab: z.array(
    z.object({
      word: z.string().describe("사전형 (예: 呼ぶ, 綺麗, 夜空)"),
      reading: z.string().describe("사전형의 히라가나 읽기. 노래에서 특수하게 읽으면 그 읽기"),
      meaning: z.string().describe("한국어 뜻. 노래 속 의미를 먼저"),
      // enum 대신 문자열로 받고 normalize에서 정리한다. 값이 조금 어긋나도 분석 전체가 실패하지 않게.
      pos: z.string().describe("명사, 동사, 형용사, 형용동사, 부사, 표현, 기타 중 하나"),
      jlpt: z.string().describe("N5, N4, N3, N2, N1, 기타 중 하나"),
      formInSong: z.string().describe("가사에 실제로 쓰인 형태 그대로 (예: 呼んだ)"),
      lines: z.array(z.number().int()).describe("이 단어가 나오는 줄 번호들"),
      note: z.string().describe("노래 속 뉘앙스나 활용 설명을 한국어 한 문장으로. 없으면 빈 문자열"),
      examples: z
        .array(
          z.object({
            ja: z.string().describe("직접 지어낸 자연스러운 일본어 예문 (가사 인용 금지)"),
            ko: z.string().describe("예문의 한국어 번역"),
          }),
        )
        .describe("예문 2개"),
    }),
  ),
  grammar: z.array(
    z.object({
      pattern: z.string().describe("문법 패턴 (예: 〜ても, 〜ながら)"),
      meaning: z.string().describe("한국어 뜻"),
      line: z.number().int().describe("이 문법이 쓰인 줄 번호"),
      explanation: z.string().describe("한국어 설명 1~2문장"),
    }),
  ),
});
export type SongAnalysis = z.infer<typeof SongAnalysisSchema>;

export const AnalyzeRequestSchema = z.object({
  title: z.string().trim().min(1).max(200),
  artist: z.string().trim().max(200),
  level: z.enum(LEVELS),
  lines: z.array(z.string().max(500)).min(1).max(400),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const LineExplanationSchema = z.object({
  translation: z.string().describe("이 줄의 자연스러운 한국어 해석"),
  breakdown: z
    .array(
      z.object({
        part: z.string().describe("줄을 구성하는 어구 (원문 그대로)"),
        meaning: z.string().describe("그 어구의 한국어 뜻/역할"),
      }),
    )
    .describe("앞에서부터 순서대로 끊어 읽기"),
  notes: z.string().describe("문법·뉘앙스 포인트를 한국어 2~3문장으로"),
});

export const ExplainRequestSchema = z.object({
  title: z.string().trim().max(200),
  artist: z.string().trim().max(200),
  level: z.enum(LEVELS),
  line: z.string().trim().min(1).max(500),
  before: z.string().max(500).optional(),
  after: z.string().max(500).optional(),
});
export type ExplainRequest = z.infer<typeof ExplainRequestSchema>;
