/** 루비(후리가나) 한 조각. r이 있으면 t 위에 읽기를 표시한다. */
export type RubySegment = { t: string; r?: string };

/** 형태소 하나. 가사 화면에서 탭/하이라이트 단위로 쓴다. */
export type LyricToken = {
  surface: string;
  base: string;
  pos: string;
  segs: RubySegment[];
};

export type LyricLine = {
  text: string;
  tokens: LyricToken[];
};

export const LEVELS = ["입문", "N5", "N4", "N3", "N2", "N1"] as const;
export type Level = (typeof LEVELS)[number];

export const JLPT_TAGS = ["N5", "N4", "N3", "N2", "N1", "기타"] as const;
export type JlptTag = (typeof JLPT_TAGS)[number];

export type Example = {
  ja: string;
  ko: string;
  segs: RubySegment[];
};

export type VocabItem = {
  /** `${songId}:${word}` */
  id: string;
  songId: string;
  word: string;
  reading: string;
  meaning: string;
  pos: string;
  jlpt: JlptTag;
  /** 가사에 실제로 나온 형태 (활용형 등) */
  formInSong: string;
  /** 이 단어가 나오는 가사 줄 번호 (song.lines 기준) */
  lines: number[];
  note: string;
  examples: Example[];
};

export type GrammarPoint = {
  pattern: string;
  meaning: string;
  line: number;
  explanation: string;
};

export type SongStatus = "analyzing" | "ready" | "error";

export type Song = {
  id: string;
  title: string;
  artist: string;
  level: Level;
  createdAt: number;
  lines: LyricLine[];
  status: SongStatus;
  error?: string;
  summary?: string;
  vocab: VocabItem[];
  grammar: GrammarPoint[];
  isDemo?: boolean;
};

/** 단어 카드 하나의 간격 반복 상태 */
export type CardState = {
  due: number;
  /** 일 단위 */
  interval: number;
  ease: number;
  reps: number;
  lapses: number;
  lastReviewed?: number;
  /** 외워서 복습에서 뺀 카드 */
  suspended?: boolean;
};

export type Grade = "again" | "hard" | "good" | "easy";

export type LineExplanation = {
  translation: string;
  breakdown: { part: string; meaning: string }[];
  notes: string;
};
